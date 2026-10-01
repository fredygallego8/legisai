/**
 * Máquina de estados con checkpoints (Brecha 1) para el chat de LegisAI.
 *
 * Puerto del grafo que estaba en el portal heredado (`navitolegis/legacy/portal-main/server/langgraph.ts`)
 * a la app vigente. Cambios respecto al original, cada uno con su motivo:
 *
 * 1. La base se lee con `getDb().query()` (Neon serverless de esta app) en lugar del cliente `pg`
 *    del portal anterior, y las columnas son las de aquí: `rag_chunks.content`, `document_id`,
 *    `page_number`, `expediente_id`.
 * 2. `owner_id` acompaña a cada checkpoint. El `middleware.ts` de la app exige sesión para entrar,
 *    pero una sesión válida no dice de quién es un `thread_id`: sin esta columna, cambiar el id en
 *    la URL leía la respuesta y el contexto de otro usuario (IDOR). Los hilos anteriores a la
 *    columna tienen `owner_id` NULL y quedan legibles solo para el acceso interno, no para las
 *    rutas autenticadas: denegar por defecto antes que asumir propiedad.
 * 3. Los nodos reciben sus dependencias (base, embeddings, modelo) por parámetro. Sin eso no se
 *    puede probar el recorrido del grafo sin levantar Neon ni Gemini, y las pruebas acabarían
 *    llamando a la base real compartida.
 *
 * Flujo: clasificar → [simple → razonar] | [compleja → recuperar → razonar] → verificar
 *        → (sin fundamento y con presupuesto → recuperar) | responder → FIN
 */

import { getDb } from './db';
import { generateEmbedding } from './embeddings';
import { DEFAULT_SYSTEM_INSTRUCTION, generateFromPrompt, getChatModel } from './gemini';
import { CrossEncoderProvider } from './rerank';

/** Reintentos máximos verificar→recuperar: sin límite, un `insuficiente` constante reinicia el grafo infinito. */
export const MAX_VERIFY_RETRIES = 1;

/** Reintentos por llamada al modelo ante un fallo transitorio del proveedor. */
export const MAX_REINTENTOS_MODELO = 2;

/** Espera base del backoff; el primer reintento no espera (el 503 suele durar segundos). */
export const ESPERA_BASE_MS = 400;

/**
 * Si el fallo es del proveedor y se le puede reintentar, o no.
 *
 * Se reintenta lo transitorio y solo lo transitorio: `503 UNAVAILABLE` y `429` son el proveedor
 * saturado o sin cuota, y un 4xx de verdad (`400`, `401`, `403`) son ni los toques ni las llaves
 * — reintentarlos sería gastar 4 llamadas por pregunta para acabar con el mismo error.
 *
 * El 429 tiene un matiz: la respuesta incluye `retryDelay` ("retry in 43s") y el grafo gasta 4-8
 * llamadas por pregunta, así que esperar 43 s no devuelve la cuota que se ha gastado hoy — la cuota
 * es diaria. Se reintenta una vez y luego se propaga, para que la UI lo diga y no se quede colgada.
 */
export function esFalloTransitorio(err: any): boolean {
  const mensaje = String(err?.message || err || '');
  if (/\b(400|401|403|404)\b/.test(mensaje)) return false;
  return /\b(429|500|502|503|504)\b|UNAVAILABLE|RESOURCE_EXHAUSTED|high demand|ECONNRESET|ETIMEDOUT|EAI_AGAIN|fetch failed|socket hang up|network/i.test(
    mensaje,
  );
}

/** Cuánto esperar antes del reintento `n` (1-based): exponencial, con tope de 4 s. */
export function esperaDeReintento(n: number): number {
  return Math.min(ESPERA_BASE_MS * 2 ** Math.max(0, n - 1), 4000);
}

/**
 * Ejecuta `accion` reintentando si el fallo es transitorio del proveedor.
 *
 * El `sleep` es inyectable para que las pruebas no tarden: los 73 tests de `bun test` no deben
 * esperar segundos reales por un backoff.
 */
export async function conReintentos<T>(
  accion: () => Promise<T>,
  opciones: { reintentos?: number; sleep?: (ms: number) => Promise<void> } = {},
): Promise<T> {
  const max = opciones.reintentos ?? MAX_REINTENTOS_MODELO;
  const sleep = opciones.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  let intento = 0;
  for (;;) {
    try {
      return await accion();
    } catch (err: any) {
      if (intento >= max || !esFalloTransitorio(err)) throw err;
      intento += 1;
      console.warn(`[langgraph] fallo transitorio del proveedor (intento ${intento}/${max}):`, err?.message ?? err);
      await sleep(esperaDeReintento(intento));
    }
  }
}

/** Nodos del grafo. `paso` en el estado guarda el nodo recién ejecutado. */
export type Nodo = 'clasificar' | 'recuperar' | 'razonar' | 'verificar' | 'responder';
/** Nodo que sigue (o `fin`). */
export type Paso = Nodo | 'fin';

export interface EstadoLegisAI {
  thread_id: string;
  query: string;
  query_type?: 'simple' | 'complex';
  retrieved_context?: string;
  reasoning_chain?: string;
  confidence?: number;
  verification?: 'suficiente' | 'insuficiente';
  answer?: string;
  error?: string;
  /** Reintentos de verificación→recuperación ya consumidos. */
  verify_retries?: number;
  /** Nodo recién ejecutado; es lo que permite reanudar a mitad de flujo. */
  step?: Nodo | 'fin';
  /** Aviso cuando Neon no aceptó un checkpoint: la respuesta se entrega igual, pero no se puede reanudar. */
  checkpoint_error?: string;
  /** Expediente sobre el que se consulta (acota el retrieval). */
  expediente_id?: string;
  /** Dueño del hilo (id de la sesión). Sin él no se puede reanudar ni listar el historial. */
  owner_id?: string;
}

/** Ejecuta una consulta parametrizada ($1, $2…). Inyectable en las pruebas. */
export type Consultar = (texto: string, valores?: unknown[]) => Promise<Record<string, any>[]>;

export interface Dependencias {
  consultar?: Consultar;
  vectorizar?: (texto: string) => Promise<number[]>;
  preguntar?: (prompt: string) => Promise<string>;
  /**
   * Espera entre reintentos. Inyectable porque el backoff son cientos de ms: las pruebas pasan a 0
   * sin tocar el código de producción.
   */
  sleep?: (ms: number) => Promise<void>;
}

const CONSULTAS: Consultar = async (texto, valores = []) => {
  const filas = await getDb().query(texto, valores);
  return Array.isArray(filas) ? filas : [];
};

const PREGUNTAR = (prompt: string) => generateFromPrompt(prompt, DEFAULT_SYSTEM_INSTRUCTION);

/**
 * `preguntar` con reintentos ante fallos transitorios del proveedor.
 *
 * Todos los nodos pasan por aquí. El motivo es concreto: el smoke del 2026-09-29 cayó dos veces por
 * `503 high demand` de Gemini en plena ejecución, y sin reintento eso se traducía en un 502 para el
 * usuario tras haber gastado ya 4 llamadas. Reintentar lo transitorio es barato; reintentar un 400
 * o un 401 es tirar la cuota del día, y `esFalloTransitorio` los descarta.
 */
const PREGUNTAR_CON_REINTENTOS = (prompt: string, dep: Dependencias = {}) =>
  conReintentos(() => (dep.preguntar ?? PREGUNTAR)(prompt), { sleep: dep.sleep });

let tablaLista = false;

/** Solo para pruebas: vuelve a pedir la creación de la tabla. */
export function __reiniciarTablaParaPruebas(): void {
  tablaLista = false;
}

/**
 * Crea `langgraph_checkpoints` si falta y le añade `owner_id` si la tabla ya existía.
 *
 * La tabla puede venir del portal heredado: comparten la misma base Neon, así que el
 * `CREATE TABLE IF NOT EXISTS` no la toca y hace falta el `ALTER` para no escribir
 * checkpoints sin propiedad. La creación es una vez por proceso: un grafo guarda un
 * checkpoint por nodo, y repetir el DDL en cada nodo eran N llamadas por pregunta.
 */
export async function asegurarTabla(dep: Dependencias = {}): Promise<void> {
  if (tablaLista) return;
  const consultar = dep.consultar ?? CONSULTAS;
  await consultar(
    `CREATE TABLE IF NOT EXISTS langgraph_checkpoints (
       id SERIAL PRIMARY KEY,
       thread_id TEXT NOT NULL,
       step TEXT NOT NULL,
       owner_id TEXT,
       state JSONB NOT NULL,
       updated_at TIMESTAMPTZ DEFAULT NOW(),
       UNIQUE(thread_id, step)
     )`,
  );
  await consultar('ALTER TABLE langgraph_checkpoints ADD COLUMN IF NOT EXISTS owner_id TEXT');
  await consultar(
    'CREATE INDEX IF NOT EXISTS idx_langgraph_thread ON langgraph_checkpoints (thread_id)',
  );
  tablaLista = true;
}

/** Guarda el estado tras un nodo. Devuelve `false` si la base falló (no rompe la respuesta). */
export async function guardarCheckpoint(estado: EstadoLegisAI, dep: Dependencias = {}): Promise<boolean> {
  const consultar = dep.consultar ?? CONSULTAS;
  try {
    await asegurarTabla(dep);
    await consultar(
      `INSERT INTO langgraph_checkpoints (thread_id, step, owner_id, state, updated_at)
       VALUES ($1, $2, $3, $4::jsonb, NOW())
       ON CONFLICT (thread_id, step) DO UPDATE SET
         owner_id = EXCLUDED.owner_id,
         state = EXCLUDED.state,
         updated_at = NOW()`,
      [estado.thread_id, String(estado.step), estado.owner_id ?? null, JSON.stringify(estado)],
    );
    return true;
  } catch (e: any) {
    // El checkpoint sirve para reanudar y para auditar, no para responder. Si Neon falla a mitad
    // del grafo, tirar la excepción aquí sería tirar una respuesta jurídica ya producida.
    console.error('[langgraph] checkpoint no guardado:', e?.message ?? e);
    return false;
  }
}

/**
 * Último checkpoint de un hilo, o el de un nodo concreto.
 *
 * `paso` existe porque `verificar` guarda su estado ANTES de decidir: si la reanudación solo
 * supiera leer "el último", un reintento en curso volvería a arrancar en `clasificar` y repetiría
 * pasos ya hechos.
 *
 * `propietario` es el aislamiento horizontal: cuando viene, una fila de otro dueño se lee como si
 * no existiera. Las filas anteriores a la columna (`owner_id` NULL) tampoco se devuelven: no hay
 * dato con el que atribuirlas, y ante la duda se deniega.
 */
export async function cargarCheckpoint(
  threadId: string,
  paso?: string,
  propietario?: string | null,
  dep: Dependencias = {},
): Promise<EstadoLegisAI | null> {
  const consultar = dep.consultar ?? CONSULTAS;
  await asegurarTabla(dep);
  const filas = await consultar(
    `SELECT state FROM langgraph_checkpoints
     WHERE thread_id = $1
       AND ($2::text IS NULL OR step = $2)
       AND ($3::text IS NULL OR owner_id = $3)
     ORDER BY updated_at DESC
     LIMIT 1`,
    [String(threadId || ''), paso ?? null, propietario ?? null],
  );
  if (!filas.length) return null;
  const estado = filas[0].state;
  return typeof estado === 'string' ? (JSON.parse(estado) as EstadoLegisAI) : (estado as EstadoLegisAI);
}

/** Historial de estados de un hilo, del primero al último (trazabilidad del grafo). */
export async function pasosDelHilo(
  threadId: string,
  propietario?: string | null,
  dep: Dependencias = {},
): Promise<EstadoLegisAI[]> {
  const consultar = dep.consultar ?? CONSULTAS;
  await asegurarTabla(dep);
  const filas = await consultar(
    // Mismos tres parámetros que `cargarCheckpoint` ($1 hilo, $2 paso, $3 dueño) aunque aquí el
    // paso no se filtre: una sola forma de llamar reduce el riesgo de desalinear un $n.
    `SELECT state FROM langgraph_checkpoints
     WHERE thread_id = $1
       AND ($2::text IS NULL OR step = $2)
       AND ($3::text IS NULL OR owner_id = $3)
     ORDER BY updated_at ASC`,
    [String(threadId || ''), null, propietario ?? null],
  );
  return (filas || []).map((f: any) =>
    typeof f.state === 'string' ? (JSON.parse(f.state) as EstadoLegisAI) : (f.state as EstadoLegisAI),
  );
}

// ---- Rutas condicionales (puras: se prueban sin red) ----

export function rutaTrasClasificar(estado: EstadoLegisAI): Paso {
  // 'simple' pasa por `razonar`. El prompt de `responder` solo inyecta contexto recuperado, así que
  // ir directo desde clasificar dejaba `answer: undefined`: respuesta vacía en toda consulta fácil.
  return estado.query_type === 'simple' ? 'razonar' : 'recuperar';
}

export function rutaTrasVerificar(estado: EstadoLegisAI): Paso {
  if (estado.verification === 'suficiente') return 'responder';
  if ((estado.verify_retries || 0) < MAX_VERIFY_RETRIES) return 'recuperar';
  return 'responder';
}

/** Nodo que sigue a un checkpoint cuyo siguiente paso es fijo. */
const REANUDAR: Record<string, Nodo> = {
  recuperar: 'razonar',
  razonar: 'verificar',
  responder: 'responder',
};

/**
 * En qué nodo continuar un checkpoint. `null` = nada que reanudar (terminado o con error).
 *
 * Los dos pasos cuyo siguiente decide un router (`clasificar`, `verificar`) se reevalúan con el
 * router correspondiente en vez de repetir el nodo: el dictamen ya está en el estado guardado, y
 * volver a preguntar costaría una llamada al modelo para obtener la misma respuesta.
 */
export function pasoDeReanudacion(guardado: EstadoLegisAI): Paso | null {
  if (guardado.error) return null;
  if (guardado.step === 'fin' || guardado.answer) return null;
  if (guardado.step === 'clasificar') return rutaTrasClasificar(guardado);
  if (guardado.step === 'verificar') return rutaTrasVerificar(guardado);
  return REANUDAR[String(guardado.step || '')] ?? null;
}

// ---- Nodos ----

export async function nodoClasificar(estado: EstadoLegisAI, dep: Dependencias = {}): Promise<EstadoLegisAI> {
  try {
    const texto = await PREGUNTAR_CON_REINTENTOS(
      `Clasifica la consulta jurídica. Responde solo "SIMPLE" o "COMPLEJA".\n\n${estado.query}`,
      dep,
    );
    const tipo = String(texto || '').trim().toLowerCase().startsWith('simple') ? 'simple' : 'complex';
    return { ...estado, step: 'clasificar', query_type: tipo };
  } catch {
    // Si el modelo falla se toma el camino caro (con retrieval): una consulta de más cuesta tokens,
    // una de menos cuesta una respuesta sin fundamento.
    return { ...estado, step: 'clasificar', query_type: 'complex' };
  }
}

export async function nodoRecuperar(estado: EstadoLegisAI, dep: Dependencias = {}): Promise<EstadoLegisAI> {
  const consultar = dep.consultar ?? CONSULTAS;
  const vectorizar = dep.vectorizar ?? generateEmbedding;
  try {
    // El embedding va al mismo proveedor que el chat y sufre los mismos 503, así que lleva los
    // mismos reintentos: caer aquí por saturación dejaba la respuesta sin recuperación detrás.
    const vector = await conReintentos(() => vectorizar(estado.query), { sleep: dep.sleep });
    const vectorStr = `[${vector.join(',')}]`;
    // En esta app el texto vive en `rag_chunks.content` y la fuente en `document_id`.
    const columnas = `SELECT document_id, page_number, content,
                             1 - (embedding <=> $1::vector) AS similarity`;
    const filas = estado.expediente_id
      ? await consultar(
          `${columnas}
             FROM rag_chunks
            WHERE expediente_id = $2 AND embedding IS NOT NULL
            ORDER BY embedding <=> $1::vector
            LIMIT 20`,
          [vectorStr, estado.expediente_id],
        )
      : await consultar(
          `${columnas}
             FROM rag_chunks
            WHERE embedding IS NOT NULL
            ORDER BY embedding <=> $1::vector
            LIMIT 20`,
          [vectorStr],
        );

    // Búsqueda vectorial + reordenamiento léxico local. Se recortan a 5: el `respond` anterior
    // metía los 20 chunks seguidos, que es la forma rápida de que el modelo diluya la respuesta.
    const candidatos = (filas || []).map((f: any) => String(f.content || '')).filter((t) => t.length > 0);
    const rankeados = new CrossEncoderProvider().rank(estado.query, candidatos, 5);
    return {
      ...estado,
      step: 'recuperar',
      retrieved_context: rankeados.map(([doc], i) => `[Fuente ${i + 1}]\n${doc}`).join('\n\n'),
    };
  } catch (e: any) {
    return { ...estado, step: 'recuperar', error: `Recuperación falló: ${e.message}`, retrieved_context: '' };
  }
}

export async function nodoRazonar(estado: EstadoLegisAI, dep: Dependencias = {}): Promise<EstadoLegisAI> {
  try {
    const cadena = await PREGUNTAR_CON_REINTENTOS(
      `Razona paso a paso sobre esta consulta jurídica colombiana (máx 5 pasos):\n\n${estado.query}\n\nContexto:\n${(estado.retrieved_context || 'sin contexto').slice(0, 6000)}`,
      dep,
    );
    return { ...estado, step: 'razonar', reasoning_chain: String(cadena) };
  } catch (e: any) {
    return { ...estado, step: 'razonar', reasoning_chain: '', error: `Razonamiento falló: ${e.message}` };
  }
}

export async function nodoVerificar(estado: EstadoLegisAI, dep: Dependencias = {}): Promise<EstadoLegisAI> {
  try {
    const veredicto = (
      await PREGUNTAR_CON_REINTENTOS(
        `¿El contexto y el razonamiento son suficientes para responder "${estado.query}"? Responde SUFICIENTE o INSUFICIENTE.`,
        dep,
      )
    )
      .trim()
      .toLowerCase();
    const verificacion = veredicto.startsWith('suficiente') ? 'suficiente' : 'insuficiente';
    return {
      ...estado,
      step: 'verificar',
      verification: verificacion,
      confidence: verificacion === 'suficiente' ? 0.85 : 0.4,
    };
  } catch {
    // Sin verificación explícita no se gasta el presupuesto de reintento: se responde con lo que hay.
    return { ...estado, step: 'verificar', verification: 'suficiente', confidence: 0.5 };
  }
}

export async function nodoResponder(estado: EstadoLegisAI, dep: Dependencias = {}): Promise<EstadoLegisAI> {
  const base =
    estado.retrieved_context ||
    `Consulta: ${estado.query}\nRazonamiento:\n${estado.reasoning_chain || 'sin cadena de razonamiento'}`;
  // Aquí no hay `catch` a propósito, y es la única decisión del grafo que se comporta así: si el
  // proveedor sigue caído tras los reintentos, la ruta responde 502 en vez de inventar una respuesta
  // jurídica. Perder el texto es preferible a perder la confianza, y el hilo no se pierde: los
  // checkpoints de los nodos anteriores quedan escritos y `resume` continúa desde donde se quedó.
  const respuesta = await PREGUNTAR_CON_REINTENTOS(
    `Responde la consulta del usuario usando SOLO el siguiente contexto. Si no contiene la respuesta, indica que no se encontró fundamento en la base documental.\n\nContexto:\n${base.slice(0, 12000)}\n\nConsulta: ${estado.query}`,
    dep,
  );
  return { ...estado, step: 'fin', answer: String(respuesta) };
}

const NODOS: Record<Nodo, (e: EstadoLegisAI, d: Dependencias) => Promise<EstadoLegisAI>> = {
  clasificar: nodoClasificar,
  recuperar: nodoRecuperar,
  razonar: nodoRazonar,
  verificar: nodoVerificar,
  responder: nodoResponder,
};

/**
 * Ejecuta el grafo. Con `reanudar` carga el último checkpoint del hilo y continúa desde ahí.
 *
 * `propietario` se escribe en el checkpoint y se exige en la lectura: es lo que impide que un
 * `thread_id` ajeno devuelva el contexto o la respuesta de otra persona.
 */
export async function runGraph(
  consulta: string,
  threadId: string,
  propietario?: string | null,
  opciones: { reanudar?: boolean; expedienteId?: string } = {},
  dep: Dependencias = {},
): Promise<EstadoLegisAI> {
  let estado: EstadoLegisAI = {
    thread_id: threadId,
    query: String(consulta || ''),
    owner_id: propietario ?? undefined,
    ...(opciones.expedienteId ? { expediente_id: opciones.expedienteId } : {}),
  };

  let currentStep: Paso = 'clasificar';
  if (opciones.reanudar) {
    const guardado = await cargarCheckpoint(threadId, undefined, propietario ?? null, dep);
    if (guardado) {
      estado = guardado;
      // Un checkpoint sin dueño conocido pasa a pertenecer a la sesión que lo reanuda: es lo único
      // que se puede hacer con las filas anteriores a la columna.
      if (!estado.owner_id && propietario) estado = { ...estado, owner_id: propietario };
      const siguiente = pasoDeReanudacion(estado);
      if (siguiente === null) return estado; // terminado o con error: no hay nada que continuar
      if (siguiente !== 'fin') currentStep = siguiente;
    }
  }

  // Límite duro de iteraciones: un router mal escrito dejaría el bucle girando para siempre,
  // llamando al modelo en cada vuelta.
  const MAX_STEPS = 12;
  let guard = 0;
  while (currentStep !== 'fin') {
    guard++;
    if (guard > MAX_STEPS) {
      estado = {
        ...estado,
        error: `Grafo sin converged tras ${MAX_STEPS} pasos`,
        answer: 'Lo siento, la consulta no pudo completarse.',
      };
      break;
    }

    const nodo = NODOS[currentStep as Nodo];
    estado = await nodo(estado, dep);

    let siguiente: Paso;
    if (currentStep === 'clasificar') siguiente = rutaTrasClasificar(estado);
    // `recuperar` no va a `verificar`: el paso intermedio es `razonar`. Encadenarlos directo
    // dejaba la cadena de razonamiento vacía y el verifier juzgando el retrieval pelado.
    else if (currentStep === 'recuperar') siguiente = 'razonar';
    else if (currentStep === 'razonar') siguiente = 'verificar';
    else if (currentStep === 'verificar') siguiente = rutaTrasVerificar(estado);
    else siguiente = 'fin';

    // Un nodo con error no puede reintentar retrieval: se cierra con lo que haya.
    if (estado.error && siguiente === 'recuperar') siguiente = 'responder';

    // El presupuesto se gasta DESPUÉS de que el router autorice el reintento. Si se sumara antes,
    // la propia consulta al router vería el presupuesto agotado y no dejaría intentarlo nunca
    // (MAX_VERIFY_RETRIES=1 convertiría el primer `insuficiente` en respuesta sin fundamento).
    if (currentStep === 'verificar' && siguiente === 'recuperar') {
      estado = { ...estado, verify_retries: (estado.verify_retries || 0) + 1 };
    }

    // Se guarda con el contador ya gastado: una reanudación no puede volver a gastar el mismo
    // reintento. El coste de esa seguridad es que, si el proceso cae justo aquí, el reintento
    // autorizado se pierde y la reanudación cierra con `responder`.
    if (!(await guardarCheckpoint(estado, dep))) {
      estado = { ...estado, checkpoint_error: 'no_guardado' };
    }

    currentStep = siguiente;
  }

  // Cierre: si el bucle terminó sin respuesta (p. ej. reanudación caída en `verificar`), se responde.
  if (!estado.answer) {
    estado = await NODOS.responder(estado, dep);
    if (!(await guardarCheckpoint(estado, dep))) {
      estado = { ...estado, checkpoint_error: 'no_guardado' };
    }
  }

  return estado;
}

/** Modelo de chat en uso, para trazabilidad en la respuesta de la API. */
export function modeloUsado(): string {
  return getChatModel();
}



