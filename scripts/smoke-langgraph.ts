/**
 * Prueba de humo REAL de la máquina de estados (Brecha 1) contra Neon y Gemini.
 *
 * No forma parte de `bun test`: las 29 pruebas de `src/lib/langgraph.test.ts` usan dobles inyectados
 * y jamás tocan la red. Este script sí, y por eso hay contención siguiendo las reglas de
 * `scripts/re-embed-corpus.ts`:
 *
 *  1. thread_id con prefijo `smoke-` y dueño sintético: no se mezcla con hilos reales.
 *  2. sondas de solo lectura primero; una sola ejecución del grafo después.
 *  3. si el host está en HOSTS_PRODUCCION, exige `--permitir-produccion`.
 *  4. al final borra únicamente las filas que creó ella.
 *
 * Comprueba lo que un doble inyectado no puede comprobar: que la tabla existe con `owner_id`, que
 * Gemini responde, que el recorrido guarda un checkpoint por nodo y que el aislamiento horizontal
 * funciona contra datos reales (otro `owner_id` no ve ni el historial ni el checkpoint).
 *
 * Uso:
 *   # NO sirve `vercel env pull .env.smoke`: el CLI enmascara las variables sensibles y deja
 *   # DATABASE_URL="[SENSITIVE]". Hay que copiar el valor real a `.env.smoke` (ya ignorado por
 *   # `.env*` en el .gitignore) desde el panel de Vercel o desde el `.env.local` de otro proyecto
 *   # que apunte al mismo Neon. Ojo: @neondatabase/serverless habla HTTP, así que el host debe ser
 *   # el SIN "-pooler"; con el pooler la ruta falla con "not a valid URL".
 *   bun run scripts/smoke-langgraph.ts --permitir-produccion
 */
import { getDb } from '../src/lib/db';
import { DEFAULT_SYSTEM_INSTRUCTION, generateFromPrompt } from '../src/lib/gemini';
import { cargarCheckpoint, modeloUsado, pasosDelHilo, runGraph, type Dependencias } from '../src/lib/langgraph';

/** Mismos hosts que `scripts/re-embed-corpus.ts` consideran producción. */
const HOSTS_PRODUCCION = ['ep-patient-base-b5opm55c'];

const HILO = `smoke-20260929-${crypto.randomUUID().slice(0, 8)}`;
const DUEÑO = 'smoke-test-local';
const DUEÑO_AJENO = 'smoke-otro-usuario';

const CONSULTA_DE_PRUEBA =
  '¿Qué documentos debo adjuntar al iniciar un trámite de restitución de inmueble arrendado?';

const consultar = async (texto: string, valores: unknown[] = []): Promise<Record<string, any>[]> => {
  const filas = await getDb().query(texto, valores);
  return Array.isArray(filas) ? filas : [];
};

/** Host de la cadena de conexión, sin usuario ni contraseña. */
function host(url: string): string {
  const m = /^(?:postgres(?:ql)?):\/\/(?:[^@]*@)?([^/:]+)/.exec(url);
  return m ? m[1] : '(no reconocible)';
}

let fallos = 0;
function comprobar(etiqueta: string, cierto: boolean, detalle = ''): void {
  console.log(`${cierto ? '  ok  ' : ' FALLO'}  ${etiqueta}${detalle ? ` — ${detalle}` : ''}`);
  if (!cierto) fallos++;
}

/** Avisa sin contar como fallo: lo que falló fue el proveedor, no el grafo. */
function avisar(etiqueta: string, detalle = ''): void {
  console.log(` AVISO  ${etiqueta}${detalle ? ` — ${detalle}` : ''}`);
}

const url = String(process.env.DATABASE_URL || process.env.DATA_BASE || '');
const hostActual = host(url);
// `some(...includes)` y no `HOSTS.includes(host)`: el host de la app es
// `ep-patient-base-….neon.tech` y el de la lista es solo el prefijo del endpoint, así que una
// comparación exacta dejaría pasar a producción sin querer, que es justo lo que este script evita.
const esProduccion = HOSTS_PRODUCCION.some((h) => hostActual.includes(h));

if (!url) {
  console.error('Falta DATABASE_URL / DATA_BASE en el entorno (usa --env-file=.env.smoke).');
  process.exit(1);
}
if (url.toUpperCase().includes('[SENSITIVE]')) {
  console.error(
    'DATABASE_URL es un marcador [SENSITIVE], no una cadena de conexión: `vercel env pull` no trae ' +
      'las variables marcadas como sensibles. Copia el valor real a .env.smoke.',
  );
  process.exit(1);
}
if (hostActual.includes('-pooler')) {
  console.error(
    'La cadena apunta al endpoint "-pooler" (TCP con pg). @neondatabase/serverless va por HTTP: ' +
      'quita "-pooler" del host y añade ?sslmode=require.',
  );
  process.exit(1);
}
if (esProduccion && !process.argv.includes('--permitir-produccion')) {
  console.error(
    `La cadena apunta a producción (${hostActual}) y este grafo escribe checkpoints.\n` +
      'Reejecuta con --permitir-produccion si de verdad quieres escribir ahí.',
  );
  process.exit(1);
}

console.log(`base: ${hostActual}${esProduccion ? ' (PRODUCCIÓN)' : ''} · modelo: ${modeloUsado()}`);
console.log(`hilo: ${HILO} · dueño: ${DUEÑO}\n`);

// ---- 1. Solo lectura: qué hay antes de tocar nada ----
const columnas = await consultar(
  `SELECT column_name FROM information_schema.columns
    WHERE table_name = 'langgraph_checkpoints' AND table_schema = current_schema()
    ORDER BY column_name`,
);
console.log(
  `langgraph_checkpoints: ${
    columnas.length ? columnas.map((f) => f.column_name).join(', ') : 'no existe todavía (se creará)'
  }`,
);
comprobar(
  'si existe la tabla, tiene owner_id',
  !columnas.length || columnas.some((f) => f.column_name === 'owner_id'),
);

const corpus = await consultar('SELECT COUNT(*)::int AS n FROM rag_chunks');
console.log(`corpus RAG: ${corpus[0]?.n ?? 0} chunks en rag_chunks\n`);

// Se inyecta `preguntar` solo para contar y cronometrar las llamadas al modelo: es exactamente la
// misma función que usa el grafo por defecto (`PREGUNTAR` en langgraph.ts), así que el recorrido
// sigue siendo real, y de paso sale el dato de coste que hay que medir antes de conectar el grafo a
// la interfaz. Un 503 de Gemini no lolansea el grafo entero: por eso se cuenta y se registra cada
// llamada, para saber en qué nodo se cayó.
let llamadas = 0;
const DEP: Dependencias = {
  preguntar: async (prompt: string) => {
    llamadas += 1;
    const n = llamadas;
    const desde = Date.now();
    const salida = await generateFromPrompt(prompt, DEFAULT_SYSTEM_INSTRUCTION);
    console.log(`    · llamada ${n} al modelo: ${Date.now() - desde} ms, ${salida.length} caracteres`);
    return salida;
  },
};

// ---- 2-4. Ejecución real, aislamiento y reanudación, con limpieza garantizada ----
// El `finally` es lo importante: sin él, un 503 o un corte a mitad del recorrido dejan filas `smoke-*`
// en la base real. Ya pasó (el primer version de este script tiró 15 checkpoints de 4 hilos a medias,
// que hubo que borrar con scripts/limpiar-hilos-smoke.ts).
const FALLO_DEL_PROVEEDOR = /429|503|UNAVAILABLE|RESOURCE_EXHAUSTED|high demand|quota/i;

try {
  const inicio = Date.now();
  const estado = await runGraph(CONSULTA_DE_PRUEBA, HILO, DUEÑO, {}, DEP);
  const duracion = Date.now() - inicio;

  console.log(`recorrido real en ${duracion} ms`);
  comprobar('coste por pregunta medido', llamadas >= 2, `${llamadas} llamadas al modelo`);
  comprobar('el grafo entrega respuesta', Boolean(estado.answer), `${(estado.answer || '').length} caracteres`);

  // Un 429/503 no es un defecto del puerto, es el proveedor. Si el grafo degrada y aun así entrega
  // respuesta, ese es justo el comportamiento buscado: se avisa, no se cuenta como fallo.
  if (!estado.error) {
    comprobar('sin error de grafo', true, 'sin errores');
  } else if (FALLO_DEL_PROVEEDOR.test(estado.error)) {
    avisar('el proveedor falló, el grafo degradó y aun así entregó respuesta', estado.error.slice(0, 110));
  } else {
    comprobar('sin error de grafo', false, estado.error);
  }
  comprobar('los checkpoints se guardaron', !estado.checkpoint_error, estado.checkpoint_error || 'todos guardados');
  comprobar('el recorrido termina en `fin`', estado.step === 'fin', `step=${estado.step}`);
  if ((estado.reasoning_chain || '').length > 0) {
    comprobar('hubo cadena de razonamiento', true, `${(estado.reasoning_chain || '').length} caracteres`);
  } else {
    avisar('sin cadena de razonamiento', estado.error ? 'el nodo razonar no llegó a completarse' : '');
  }
  console.log(
    `  tipo: ${estado.query_type} · confianza: ${estado.confidence} · reintentos: ${estado.verify_retries ?? 0} ·` +
      ` contexto recuperado: ${(estado.retrieved_context || '').length} caracteres`,
  );
  console.log(`  respuesta: ${(estado.answer || '').slice(0, 240).replace(/\s+/g, ' ')}…\n`);

  // ---- 3. Aislamiento horizontal sobre filas reales (lo que un doble inyectado no prueba) ----
  const historialPropio = await pasosDelHilo(HILO, DUEÑO);
  comprobar(
    'el dueño ve su historial de pasos',
    historialPropio.length >= 3,
    `${historialPropio.length} checkpoints: ${historialPropio.map((e) => e.step).join(' → ')}`,
  );
  comprobar('historial ajeno vacío', (await pasosDelHilo(HILO, DUEÑO_AJENO)).length === 0);
  comprobar('checkpoint ajeno ilegible', (await cargarCheckpoint(HILO, undefined, DUEÑO_AJENO)) === null);
  const checkpointPropio = await cargarCheckpoint(HILO, undefined, DUEÑO);
  comprobar('checkpoint legible para su dueño', checkpointPropio?.thread_id === HILO);
  comprobar(
    'la lectura interna sin filtro ve las mismas filas',
    (await pasosDelHilo(HILO)).length === historialPropio.length,
  );

  // ---- 4. Reanudar un hilo terminado no vuelve a llamar al modelo ----
  const desde = Date.now();
  const reanudado = await runGraph('reanudación de un hilo terminado', HILO, DUEÑO, { reanudar: true });
  comprobar(
    'reanudar un hilo terminado devuelve el estado final sin repetir nodos',
    reanudado.answer === estado.answer && reanudado.step === 'fin',
    `${Date.now() - desde} ms`,
  );
} catch (err: any) {
  const mensaje = String(err?.message || err);
  if (FALLO_DEL_PROVEEDOR.test(mensaje)) {
    console.error(
      '\nABORTADO por el proveedor de modelos, no por el grafo.\n' +
        (/\b429\b|quota|RESOURCE_EXHAUSTED/i.test(mensaje)
          ? '  Cuota diaria de Gemini agotada (free tier: 20 peticiones/día por modelo). Reintenta mañana.\n' +
            '  Y este es el dato de coste que faltaba para decidir si el grafo va a la interfaz: con\n' +
            '  4-8 llamadas por pregunta, un tope de 20 al día son 3-5 preguntas diarias con esta clave.\n'
          : '  Saturación temporal del modelo (503 UNAVAILABLE). Reintenta en unos minutos.\n'),
    );
  } else {
    console.error('\nABORTADO por un error inesperado:', mensaje);
  }
  fallos += 1;
} finally {
  // ---- 5. Limpieza: solo lo que este script creó, pase lo que pase ----
  try {
    const borradas = await consultar('DELETE FROM langgraph_checkpoints WHERE thread_id = $1 RETURNING id', [HILO]);
    comprobar(
      `limpieza: ${borradas.length} checkpoints propios eliminados`,
      (await pasosDelHilo(HILO)).length === 0,
    );
  } catch (err: any) {
    console.error(`No se pudo limpiar ${HILO}: ${err?.message || err}. Use scripts/limpiar-hilos-smoke.ts.`);
    fallos += 1;
  }
}

console.log(fallos === 0 ? '\nSMOKE OK' : `\nSMOKE CON ${fallos} FALLO(S)`);
process.exit(fallos === 0 ? 0 : 1);

