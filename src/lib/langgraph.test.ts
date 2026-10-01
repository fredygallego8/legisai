import { beforeEach, describe, expect, it } from 'bun:test';
import {
  MAX_REINTENTOS_MODELO,
  MAX_VERIFY_RETRIES,
  cargarCheckpoint,
  conReintentos,
  esFalloTransitorio,
  esperaDeReintento,
  nodoClasificar,
  nodoRazonar,
  nodoRecuperar,
  nodoResponder,
  pasoDeReanudacion,
  pasosDelHilo,
  rutaTrasClasificar,
  rutaTrasVerificar,
  runGraph,
  __reiniciarTablaParaPruebas,
  type Dependencias,
  type EstadoLegisAI,
} from './langgraph';

// Ninguna prueba de este archivo toca Neon ni Gemini: las tres dependencias del grafo (base,
// embeddings, modelo) se inyectan. Así se prueba el RECORRIDO, que es donde estaban los bugs,
// sin clave API ni base compartida de por medio.

interface Fila {
  thread_id: string;
  step: string;
  owner_id: string | null;
  state: string;
}

interface Guion {
  clase?: 'SIMPLE' | 'COMPLEJA';
  verificacion?: ('SUFICIENTE' | 'INSUFICIENTE')[];
  respuesta?: string;
}

function baseFalsa(filas: Fila[] = [], chunks: Record<string, any>[] = []) {
  const llamadas: { texto: string; valores: unknown[] }[] = [];

  const consultar: NonNullable<Dependencias['consultar']> = async (texto, valores = []) => {
    llamadas.push({ texto, valores });
    const sql = texto.trim();

    if (/^(CREATE|ALTER)/i.test(sql)) return [];

    if (/^INSERT INTO langgraph_checkpoints/i.test(sql)) {
      const [thread_id, step, owner_id, state] = valores as [string, string, string | null, string];
      const existente = filas.find((f) => f.thread_id === thread_id && f.step === step);
      if (existente) {
        existente.owner_id = owner_id;
        existente.state = state;
      } else {
        filas.push({ thread_id, step, owner_id, state });
      }
      return [];
    }

    if (/FROM langgraph_checkpoints/i.test(sql)) {
      const [thread_id, paso, propietario] = valores as [string, string | null, string | null];
      const filtradas = filas.filter(
        (f) =>
          f.thread_id === thread_id &&
          (paso == null || f.step === paso) &&
          (propietario == null || f.owner_id === propietario),
      );
      const enOrden = /ORDER BY updated_at DESC/i.test(sql) ? filtradas.slice().reverse() : filtradas;
      return enOrden.map((f) => ({ state: f.state }));
    }

    if (/FROM rag_chunks/i.test(sql)) return chunks;

    return [];
  };

  return { consultar, llamadas, filas };
}

function modeloFalso(guion: Guion = {}) {
  const conteo = { clasificar: 0, razonar: 0, verificar: 0, responder: 0, vectorizar: 0 };

  const preguntar: NonNullable<Dependencias['preguntar']> = async (prompt) => {
    if (prompt.startsWith('Clasifica')) {
      conteo.clasificar++;
      return guion.clase ?? 'COMPLEJA';
    }
    if (prompt.startsWith('Razona paso a paso')) {
      conteo.razonar++;
      return '1. norma aplicable\n2. aplicación al caso';
    }
    if (prompt.startsWith('¿El contexto')) {
      const indice = conteo.verificar;
      conteo.verificar++;
      const lista = guion.verificacion ?? ['SUFICIENTE'];
      return lista[Math.min(indice, lista.length - 1)];
    }
    if (prompt.startsWith('Responde la consulta')) {
      conteo.responder++;
      return guion.respuesta ?? 'Respuesta fundamentada en el contexto.';
    }
    throw new Error(`prompt no previsto: ${prompt.slice(0, 40)}`);
  };

  const vectorizar = async () => {
    conteo.vectorizar++;
    return [0.1, 0.2, 0.3];
  };

  return { preguntar, vectorizar, conteo };
}

beforeEach(() => {
  // La creación de la tabla lleva bandera de proceso: sin reiniciarla, las pruebas se contaminan
  // entre sí y el DDL ya no aparece en las llamadas.
  __reiniciarTablaParaPruebas();
});

describe('ruta tras clasificar', () => {
  it('una consulta simple va a razonar, no a responder', () => {
    // `responder` solo inyecta contexto recuperado: si 'simple' saltaba directo ahí, la respuesta
    // salía vacía. Es el bug que tenía la versión heredada en producción.
    expect(rutaTrasClasificar({ thread_id: 't', query: 'q', query_type: 'simple' })).toBe('razonar');
  });

  it('una consulta compleja va a recuperación', () => {
    expect(rutaTrasClasificar({ thread_id: 't', query: 'q', query_type: 'complex' })).toBe('recuperar');
  });

  it('sin tipo decidido no se asume simple', () => {
    expect(rutaTrasClasificar({ thread_id: 't', query: 'q' })).toBe('recuperar');
  });
});

describe('ruta tras verificar', () => {
  it('suficiente cierra con responder', () => {
    expect(rutaTrasVerificar({ thread_id: 't', query: 'q', verification: 'suficiente' })).toBe('responder');
  });

  it('insuficiente con presupuesto reintenta la recuperación', () => {
    expect(rutaTrasVerificar({ thread_id: 't', query: 'q', verification: 'insuficiente' })).toBe('recuperar');
  });

  it('insuficiente sin presupuesto cierra igual (no buclea)', () => {
    const agotado: EstadoLegisAI = {
      thread_id: 't',
      query: 'q',
      verification: 'insuficiente',
      verify_retries: MAX_VERIFY_RETRIES,
    };
    expect(rutaTrasVerificar(agotado)).toBe('responder');
  });
});

describe('paso de reanudación', () => {
  it('un checkpoint de recuperación continúa en razonar (no repite pasos)', () => {
    expect(pasoDeReanudacion({ thread_id: 't', query: 'q', step: 'recuperar' })).toBe('razonar');
  });

  it('un checkpoint de verificar con presupuesto vuelve a recuperación', () => {
    const guardado: EstadoLegisAI = { thread_id: 't', query: 'q', step: 'verificar', verification: 'insuficiente' };
    expect(pasoDeReanudacion(guardado)).toBe('recuperar');
  });

  it('un checkpoint de verificar sin presupuesto cierra con responder', () => {
    const guardado: EstadoLegisAI = {
      thread_id: 't',
      query: 'q',
      step: 'verificar',
      verification: 'insuficiente',
      verify_retries: MAX_VERIFY_RETRIES,
    };
    expect(pasoDeReanudacion(guardado)).toBe('responder');
  });

  it('hilo terminado, respondido o con error: nada que reanudar', () => {
    expect(pasoDeReanudacion({ thread_id: 't', query: 'q', step: 'fin', answer: 'lista' })).toBeNull();
    expect(pasoDeReanudacion({ thread_id: 't', query: 'q', step: 'razonar', answer: 'ya respondido' })).toBeNull();
    expect(pasoDeReanudacion({ thread_id: 't', query: 'q', step: 'razonar', error: 'falló' })).toBeNull();
    expect(pasoDeReanudacion({ thread_id: 't', query: 'q' })).toBeNull();
  });
});


describe('runGraph', () => {
  const CHUNKS = [
    {
      document_id: 'doc-cgp',
      page_number: 1,
      content:
        'el ejecutado deberá oponer excepciones dentro de los diez días siguientes a la notificación del mandamiento ejecutivo',
    },
    {
      document_id: 'doc-otro',
      page_number: 2,
      content: 'el expediente fue archivado por falta de impulso procesal de la parte demandante',
    },
  ];

  function entorno(guion: Guion = {}, filas: Fila[] = []) {
    const bd = baseFalsa(filas, CHUNKS);
    const llm = modeloFalso(guion);
    const dep: Dependencias = { consultar: bd.consultar, vectorizar: llm.vectorizar, preguntar: llm.preguntar };
    return { ...bd, conteo: llm.conteo, dep };
  }

  it('una consulta compleja recorre los nodos y responde', async () => {
    const e = entorno();
    const estado = await runGraph('¿plazo para excepciones?', 'hilo-1', 'ana', {}, e.dep);
    expect(estado.answer).toBe('Respuesta fundamentada en el contexto.');
    expect(estado.step).toBe('fin');
    expect(e.conteo).toEqual({ clasificar: 1, razonar: 1, verificar: 1, responder: 1, vectorizar: 1 });
    expect(estado.verify_retries ?? 0).toBe(0);
  });

  it('guarda un checkpoint por nodo, con el dueño del hilo', async () => {
    const e = entorno();
    await runGraph('consulta', 'hilo-2', 'ana', {}, e.dep);
    expect(e.filas.map((f) => f.step)).toEqual([
      'clasificar',
      'recuperar',
      'razonar',
      'verificar',
      'fin',
    ]);
    expect(e.filas.every((f) => f.owner_id === 'ana')).toBe(true);
    // El DDL una sola vez por ejecución, no uno por checkpoint.
    expect(e.llamadas.filter((l) => /^CREATE TABLE/i.test(l.texto.trim()))).toHaveLength(1);
  });

  it('una consulta simple no pasa por recuperación', async () => {
    const e = entorno({ clase: 'SIMPLE' });
    const estado = await runGraph('¿qué es el CGP?', 'hilo-3', 'ana', {}, e.dep);
    expect(e.conteo.vectorizar).toBe(0);
    // Era el bug: 'simple' iba directo a responder y el campo answer quedaba vacío.
    expect(estado.answer).toBeTruthy();
  });

  it('una verificación insuficiente reintenta una sola vez y cierra', async () => {
    const e = entorno({ verificacion: ['INSUFICIENTE', 'INSUFICIENTE', 'INSUFICIENTE'] });
    const estado = await runGraph('consulta', 'hilo-4', 'ana', {}, e.dep);
    expect(estado.verify_retries).toBe(MAX_VERIFY_RETRIES);
    expect(e.conteo.vectorizar).toBe(MAX_VERIFY_RETRIES + 1);
    expect(e.conteo.responder).toBe(1);
    expect(estado.answer).toBeTruthy();
  });

  it('el rerank ordena el contexto: la fuente relevante abre', async () => {
    const e = entorno();
    const estado = await runGraph(
      '¿plazo para oponer excepciones en proceso ejecutivo?',
      'hilo-5',
      'ana',
      {},
      e.dep,
    );
    const contexto = estado.retrieved_context ?? '';
    expect(contexto.startsWith('[Fuente 1]')).toBe(true);
    expect(contexto.indexOf('diez días')).toBeLessThan(contexto.indexOf('archivado'));
  });

  it('reanudar desde un paso intermedio no vuelve a clasificar', async () => {
    const guardado = {
      thread_id: 'hilo-6',
      query: 'consulta',
      step: 'razonar' as const,
      query_type: 'complex' as const,
      retrieved_context: 'ctx',
      reasoning_chain: 'cadena',
      owner_id: 'ana',
    };
    const filas: Fila[] = [
      { thread_id: 'hilo-6', step: 'razonar', owner_id: 'ana', state: JSON.stringify(guardado) },
    ];
    const e = entorno({ verificacion: ['SUFICIENTE'] }, filas);
    const estado = await runGraph('consulta', 'hilo-6', 'ana', { reanudar: true }, e.dep);
    expect(e.conteo.clasificar).toBe(0);
    expect(e.conteo.verificar).toBe(1);
    expect(estado.answer).toBeTruthy();
  });

  it('el checkpoint de otro dueño no se lee', async () => {
    const estadoAjeno = {
      thread_id: 'hilo-7',
      query: 'consulta de ana',
      step: 'razonar' as const,
      reasoning_chain: 'EL RAZONAMIENTO DE ANA',
      answer: 'LA RESPUESTA DE ANA',
      owner_id: 'ana',
    };
    const filas: Fila[] = [
      { thread_id: 'hilo-7', step: 'razonar', owner_id: 'ana', state: JSON.stringify(estadoAjeno) },
    ];
    const e = entorno({}, filas);
    expect(await cargarCheckpoint('hilo-7', undefined, 'karla', e.dep)).toBeNull();
    expect(await cargarCheckpoint('hilo-7', undefined, 'ana', e.dep)).not.toBeNull();

    const estado = await runGraph('consulta propia', 'hilo-7', 'karla', { reanudar: true }, e.dep);
    expect(JSON.stringify(estado)).not.toContain('LA RESPUESTA DE ANA');
  });

  it('si Neon no acepta el checkpoint, la respuesta se entrega igual y se avisa', async () => {
    const llm = modeloFalso();
    const consultar: NonNullable<Dependencias['consultar']> = async (texto) => {
      if (/^INSERT/i.test(texto.trim())) throw new Error('Neon caído');
      return [];
    };
    const estado = await runGraph('consulta', 'hilo-8', 'ana', {}, {
      consultar,
      vectorizar: llm.vectorizar,
      preguntar: llm.preguntar,
    });
    expect(estado.answer).toBeTruthy();
    expect(estado.checkpoint_error).toBe('no_guardado');
  });

  it('el historial sale en orden y solo para su dueño', async () => {
    const e = entorno();
    await runGraph('consulta', 'hilo-9', 'ana', {}, e.dep);
    expect((await pasosDelHilo('hilo-9', 'ana', e.dep)).map((p) => p.step)).toEqual([
      'clasificar',
      'recuperar',
      'razonar',
      'verificar',
      'fin',
    ]);
    expect(await pasosDelHilo('hilo-9', 'karla', e.dep)).toEqual([]);
  });

  it('un retrieval que falla no deja la consulta sin respuesta', async () => {
    const llm = modeloFalso();
    const estado = await runGraph('consulta', 'hilo-10', 'ana', {}, {
      consultar: (async () => []) as NonNullable<Dependencias['consultar']>,
      vectorizar: async () => {
        throw new Error('dimensión fuera de rango');
      },
      preguntar: llm.preguntar,
    });
    expect(estado.error).toContain('Recuperación falló');
    expect(estado.answer).toBeTruthy();
  });
});

// ---- Reintentos ante fallos transitorios del proveedor (añadido tras el smoke del 2026-09-29) ----
// El smoke real cayó dos veces por `503 high demand` de Gemini en plena ejecución. El grafo ya
// degradaba cuando un nodo fallaba, pero no reintentaba: un 503 en `responder` —el nodo sin `catch`—
// devolvía 502 después de haber gastado 4 llamadas. Estas pruebas fijan qué se reintenta y qué no.

const ERROR_503 = () =>
  new Error('ServerError: got status: 503 Service Unavailable. {"error":{"status":"UNAVAILABLE"}}');
const ERROR_429 = () => new Error('ClientError: got status: 429 Too Many Requests. quota exceeded');
const ERROR_400 = () => new Error('ClientError: got status: 400 Bad Request. prompt no previsto');

/** Espera que no duerme pero registra lo que se habría esperado, para poder afirmar sobre el backoff. */
function esperaFalsa() {
  const esperas: number[] = [];
  return { esperas, sleep: async (ms: number) => void esperas.push(ms) };
}

/** Modelo que falla `veces` veces en el prompt que empieza por `prefijo` y luego sigue el guion. */
function modeloInestable(prefijo: string, veces: number, error: () => Error, guion: Guion = {}) {
  const base = modeloFalso(guion);
  const cuenta = { fallidas: 0 };
  const preguntar: NonNullable<Dependencias['preguntar']> = async (prompt) => {
    if (prompt.startsWith(prefijo) && cuenta.fallidas < veces) {
      cuenta.fallidas += 1;
      throw error();
    }
    return base.preguntar(prompt);
  };
  return { ...base, preguntar, cuenta };
}

describe('clasificación de fallos del proveedor', () => {
  it('trata como transitorio lo que se le pasa al proveedor', () => {
    expect(esFalloTransitorio(ERROR_503())).toBe(true);
    expect(esFalloTransitorio(ERROR_429())).toBe(true);
    expect(esFalloTransitorio(new Error('fetch failed'))).toBe(true);
    expect(esFalloTransitorio(new Error('read ECONNRESET'))).toBe(true);
    expect(esFalloTransitorio(new Error('This model is currently experiencing high demand'))).toBe(true);
  });

  it('NO reintenta un 4xx de verdad: ni los toques ni las llaves van a arreglarse solos', () => {
    // Reintentar un 401 gastaría las 4-8 llamadas de la pregunta para acabar con el mismo error.
    expect(esFalloTransitorio(ERROR_400())).toBe(false);
    expect(esFalloTransitorio(new Error('got status: 401 Unauthorized'))).toBe(false);
    expect(esFalloTransitorio(new Error('got status: 403 Forbidden'))).toBe(false);
  });

  it('un fallo propio del grafo no se disfraza de transitorio', () => {
    // Si un prompt no previsto se reintentara, un bug de prompts gastaría la cuota en bucle.
    expect(esFalloTransitorio(new Error('prompt no previsto: Clasifica la cons'))).toBe(false);
  });

  it('el backoff crece y tiene tope', () => {
    expect(esperaDeReintento(1)).toBe(400);
    expect(esperaDeReintento(2)).toBe(800);
    expect(esperaDeReintento(3)).toBe(1600);
    expect(esperaDeReintento(9)).toBe(4000);
  });
});

describe('conReintentos', () => {
  it('no hace nada extra cuando la primera va bien', async () => {
    const { esperas, sleep } = esperaFalsa();
    let llamadas = 0;
    const salida = await conReintentos(
      async () => {
        llamadas += 1;
        return 'ok';
      },
      { sleep },
    );
    expect(salida).toBe('ok');
    expect(llamadas).toBe(1);
    expect(esperas).toEqual([]);
  });

  it('reintenta un 503 y devuelve el resultado sin que se note', async () => {
    const { esperas, sleep } = esperaFalsa();
    let intentos = 0;
    const salida = await conReintentos(
      async () => {
        intentos += 1;
        if (intentos === 1) throw ERROR_503();
        return 'recuperado';
      },
      { sleep },
    );
    expect(salida).toBe('recuperado');
    expect(intentos).toBe(2);
    expect(esperas).toEqual([400]);
  });

  it('agota el presupuesto y propaga el último error', async () => {
    const { esperas, sleep } = esperaFalsa();
    let intentos = 0;
    await expect(
      conReintentos(
        async () => {
          intentos += 1;
          throw ERROR_503();
        },
        { sleep },
      ),
    ).rejects.toThrow('503');
    // 1 intento inicial + MAX_REINTENTOS_MODELO reintentos, y ni uno más.
    expect(intentos).toBe(MAX_REINTENTOS_MODELO + 1);
    expect(esperas.length).toBe(MAX_REINTENTOS_MODELO);
  });

  it('un 400 no se reintenta ni una vez', async () => {
    const { esperas, sleep } = esperaFalsa();
    let intentos = 0;
    await expect(
      conReintentos(
        async () => {
          intentos += 1;
          throw ERROR_400();
        },
        { sleep },
      ),
    ).rejects.toThrow('400');
    expect(intentos).toBe(1);
    expect(esperas).toEqual([]);
  });

  it('con presupuesto 0 equivale a no reintentar', async () => {
    const { sleep } = esperaFalsa();
    let intentos = 0;
    await expect(
      conReintentos(
        async () => {
          intentos += 1;
          throw ERROR_503();
        },
        { reintentos: 0, sleep },
      ),
    ).rejects.toThrow('503');
    expect(intentos).toBe(1);
  });
});

describe('los nodos reintentan lo transitorio', () => {
  it('clasificar sobrevive a un 503 y clasifica bien', async () => {
    const { sleep } = esperaFalsa();
    const modelo = modeloInestable('Clasifica', 1, ERROR_503, { clase: 'SIMPLE' });
    const estado = await nodoClasificar({ thread_id: 't', query: 'q' }, { ...modelo, sleep });
    expect(estado.query_type).toBe('simple');
    expect(estado.error).toBeUndefined();
    expect(modelo.cuenta.fallidas).toBe(1);
  });

  it('razonar degrada con el error anotado si el proveedor no vuelve', async () => {
    const { sleep } = esperaFalsa();
    const modelo = modeloInestable('Razona paso a paso', 99, ERROR_503);
    const estado = await nodoRazonar({ thread_id: 't', query: 'q' }, { ...modelo, sleep });
    // La degradación es la de antes del puerto: se contesta sin razonamiento y se dice por qué.
    expect(estado.reasoning_chain).toBe('');
    expect(estado.error).toContain('Razonamiento falló');
    expect(modelo.cuenta.fallidas).toBe(MAX_REINTENTOS_MODELO + 1);
  });

  it('recuperar reintenta el embedding, que va al mismo proveedor', async () => {
    const { sleep } = esperaFalsa();
    const { consultar } = baseFalsa([], [{ document_id: 'd1', page_number: 1, content: 'contenido' }]);
    let intentos = 0;
    const estado = await nodoRecuperar(
      { thread_id: 't', query: 'q', step: 'razonar' },
      {
        consultar,
        vectorizar: async () => {
          intentos += 1;
          if (intentos === 1) throw ERROR_503();
          return [0.1, 0.2, 0.3];
        },
        sleep,
      },
    );
    expect(intentos).toBe(2);
    expect(estado.error).toBeUndefined();
    expect(estado.retrieved_context).toContain('contenido');
  });

  it('responder propaga tras agotar reintentos: la ruta da 502 en vez de inventar texto', async () => {
    const { sleep } = esperaFalsa();
    const modelo = modeloInestable('Responde la consulta', 99, ERROR_503);
    // Sin `catch` a propósito: una respuesta jurídica inventada es peor que un 502 honesto.
    await expect(nodoResponder({ thread_id: 't', query: 'q' }, { ...modelo, sleep })).rejects.toThrow('503');
  });
});

describe('runGraph con un proveedor que se cae a mitad', () => {
  it('un 503 en clasificar no impide que el grafo llegue a `fin` con respuesta', async () => {
    const { esperas, sleep } = esperaFalsa();
    const { consultar } = baseFalsa([], [{ document_id: 'd1', page_number: 1, content: 'contenido' }]);
    const modelo = modeloInestable('Clasifica', 1, ERROR_503, { clase: 'COMPLEJA' });
    const estado = await runGraph('¿y esto?', 'hilo-1', 'dueno-1', {}, { ...modelo, consultar, sleep });
    expect(estado.step).toBe('fin');
    expect(estado.answer).toBeTruthy();
    expect(estado.query_type).toBe('complex');
    expect(esperas.length).toBe(1);
  });

  it('un 429 también se reintenta antes de propagarse', async () => {
    const { esperas, sleep } = esperaFalsa();
    const { consultar } = baseFalsa([], [{ document_id: 'd1', page_number: 1, content: 'contenido' }]);
    const modelo = modeloInestable('Clasifica', 99, ERROR_429, { clase: 'COMPLEJA' });
    const estado = await runGraph('¿y esto?', 'hilo-2', 'dueno-1', {}, { ...modelo, consultar, sleep });
    // El clasificador degrada a 'complex' en vez de tumbar la pregunta; la cuota es diaria y esperar
    // los 43 s que pide Google no la devuelve.
    expect(estado.query_type).toBe('complex');
    expect(estado.step).toBe('fin');
    expect(esperas.length).toBeGreaterThanOrEqual(1);
  });
});



