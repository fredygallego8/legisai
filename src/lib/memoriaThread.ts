/**
 * S18 · Memoria — la conversación sobrevive entre turnos del mismo thread.
 *
 * Entregable de S18 (documento de S15, sección 4): *"S18 · Memoria de
 * conversación y almacén declarados (checkpointer + store sobre Neon)"*.
 * Criterio de salida: un turno recuerda los anteriores del mismo thread y
 * los threads no se contaminan; la memoria persiste a través del
 * checkpointer.
 *
 * Dos clases de memoria en LangGraph, y aquí queda explícita la diferencia:
 *
 * - **Memoria del thread** (esta semana): el estado del grafo, atado al
 *   `thread_id` por el checkpointer. Es la conversación: lo dicho en turnos
 *   previos del mismo hilo. Se lee sola al invocar con el mismo `thread_id`.
 * - **Almacén entre threads** (la otra mitad del entregable): el `store`, un
 *   espacio nombre→valor que sobrevive al thread y se comparte entre hilos.
 *   Aquí se implementa con una base en memoria (`createMemoriaStore`) y su
 *   factoría de Neon queda documentada, porque un store sin backend
 *   persistente no demostraría nada duradero.
 *
 * Distinción práctica: el thread ES la memoria de corto plazo (el estado
 * acumulado del grafo); el store es la memoria larga (hechos que un hilo
 * escribe y otros leen). `resumirThread` es el puente: condensa lo que el
 * thread vivió y lo deja en el store para que no se pierda.
 *
 * Sin red: el checkpointer es `MemorySaver` (mismo que S17) y el store es
 * memoria; el intercambio real se inyecta por `responder`. Lo que se prueba
 * de verdad es el recorrido: qué recuerda cada turno y qué comparte cada
 * thread.
 */

import { END, MemorySaver, START, StateGraph, Annotation, interrupt, Command } from '@langchain/langgraph';

/**
 * Memoria del thread: turnos de la conversación.
 *
 * `turnos` lleva reducer concatenador — es lo que hace que "el turno
 * siguiente vea los anteriores": sin reducer, cada invocación empezaría de
 * cero y no habría memoria. El canal `perfil` es memoria a largo plazo
 * expresada como estado: sobrevive turno a turno porque el checkpointer lo
 * persiste por thread.
 */
export const EstadoMemoria = Annotation.Root({
  turnoActual: Annotation<string>({ value: (_previa, nueva) => nueva, default: () => '' }),
  turnos: Annotation<string[]>({
    reducer: (previa, nueva) => [...previa, ...nueva],
    default: () => [],
  }),
  /** Hechos de larga vida del hilo; cada turno puede aportar uno. */
  perfil: Annotation<string[]>({
    reducer: (previa, nueva) => [...previa, ...nueva],
    default: () => [],
  }),
  respuesta: Annotation<string>({ value: (_previa, nueva) => nueva, default: () => '' }),
});

type EstadoMemoriaT = typeof EstadoMemoria.State;
type ActualizacionMemoria = Partial<EstadoMemoriaT>;
type ConfigThread = { configurable: { thread_id: string } };

/** Responder determinista de pruebas: repite el turno y anota hechos del perfil. */
function responderDoble(estado: EstadoMemoriaT): Promise<ActualizacionMemoria> {
  const esDato = /me llamo|mi nombre|mi expediente/i.test(estado.turnoActual);
  return Promise.resolve({
    respuesta: `Entendido: «${estado.turnoActual}» (turno ${estado.turnos.length + 1} del hilo).`,
    ...(esDato ? { perfil: [estado.turnoActual] } : {}),
  });
}

/**
 * Crea la memoria de conversación: un grafo de un nodo que registra el turno,
 * invoca al `responder` (el intercambio real de producción) y añade la
 * respuesta del turno a la memoria.
 *
 * `responder` es inyectable a propósito: en producción será el LLM (o el
 * grafo ReAct de S16), aquí un doble determinista. El grafo no cambia — eso
 * es lo que quiere decir que la memoria está "declarada".
 */
export function crearGrafoMemoria(
  responder: (estado: EstadoMemoriaT) => Promise<ActualizacionMemoria>,
  checkpointer: MemorySaver,
) {
  return new StateGraph(EstadoMemoria)
    .addNode('memoria', async (estado: EstadoMemoriaT): Promise<ActualizacionMemoria> => {
      const { respuesta, ...hechos } = await responder(estado);
      return { turnos: [estado.turnoActual], respuesta, ...hechos };
    })
    .addEdge(START, 'memoria')
    .addEdge('memoria', END)
    .compile({ checkpointer });
}

/** Ejecuta un turno: la memoria del thread (si hay) es la base. */
export async function turnoMemoria(
  entrada: string,
  config: ConfigThread,
  responder: (estado: EstadoMemoriaT) => Promise<ActualizacionMemoria> = responderDoble,
  checkpointer: MemorySaver = new MemorySaver(),
): Promise<EstadoMemoriaT> {
  const grafo = crearGrafoMemoria(responder, checkpointer);
  return grafo.invoke({ turnoActual: entrada }, config);
}

/**
 * Condensa el thread y lo deja en el store como memoria de largo plazo.
 *
 * El store es la "otra mitad" del entregable: un espacio nombre→valor que
 * sobrevive al thread y se comparte entre hilos. Aquí se persiste un
 * resumen (turnos + perfil del hilo) que cualquier thread puede releer.
 *
 * Lee del MISMO checkpointer donde vive el thread (no crea uno nuevo): el
 * estado que condensa es el que los turnos dejaron ahí.
 */
export async function resumirThread(
  config: ConfigThread,
  store: MemoriaStore,
  checkpointer: MemorySaver,
): Promise<string> {
  const grafo = crearGrafoMemoria(responderDoble, checkpointer);
  const estado = (await grafo.getState(config)).values as EstadoMemoriaT;
  const resumen = [
    `Thread ${config.configurable.thread_id}: ${estado.turnos.length} turno(s).`,
    ...estado.turnos.map((t, i) => `  ${i + 1}. ${t}`),
    estado.perfil.length ? `Perfil: ${estado.perfil.join('; ')}.` : 'Perfil: —',
  ].join('\n');
  await store.set(config.configurable.thread_id, 'resumen', resumen);
  return resumen;
}

/**
 * Store mínimo: memoria nombre→valor, entre threads y sobre el checkpointer.
 *
 * Interfaz deliberadamente pequeña (get/set) para que la factoría de Neon
 * (`@langchain/langgraph-checkpoint-postgres` o un KV sobre la misma
 * `DATABASE_URL`) la implemente sin tocar el grafo — igual que el
 * checkpointer.
 */
export interface MemoriaStore {
  get(thread: string, clave: string): Promise<string | null>;
  set(thread: string, clave: string, valor: string): Promise<void>;
}

/** Implementación en memoria del store; la de Neon la enchufa producción. */
export function createMemoriaStore(): MemoriaStore {
  const datos = new Map<string, string>();
  return {
    async get(thread, clave) {
      return datos.get(`${thread}/${clave}`) ?? null;
    },
    async set(thread, clave, valor) {
      datos.set(`${thread}/${clave}`, valor);
    },
  };
}

/** Reexportes para que los tests no abran dos imports a la librería. */
export { Command, interrupt };
