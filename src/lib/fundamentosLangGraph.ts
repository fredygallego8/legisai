/**
 * S15 · Fundamentos LangGraph — grafo mínimo nodo → arista condicional → nodo.
 *
 * Entregable de la semana S15 del análisis de brecha IA senior. Corre sobre
 * `@langchain/langgraph` (la librería real) y no sobre la máquina de estados a
 * mano de `langgraph.ts`, porque Fase 2 (S16-S19) necesita el framework para
 * ReAct, subgrafos y el checkpointer. `langgraph.ts` sigue siendo el grafo de
 * producción del chat; este módulo es la base sobre la que se construirá el
 * sucesor.
 *
 * Tres nodos: `clasificar` → (arista condicional) → `respuestaDirecta` |
 * `respuestaRag` → END. Sin LLM ni Neon: la clasificación es una heurística
 * determinista y las respuestas son sintéticas, para que el recorrido sea
 * ejecutable y trazable sin `LLM_KEY`. El coste real por llamada llega en
 * S19/S22, no en fundamentos.
 *
 * La comparación con el if/else imperativo de `legacy/server.ts:937-973` y los
 * routers de `legacy/server/langgraph.ts:198,287` vive en
 * `navitolegis/docs/S15-FUNDAMENTOS-LANGGRAPH.md`.
 */

import { Annotation, END, START, StateGraph } from '@langchain/langgraph';

/** Clasificación de la consulta: el mismo dominio que `classification` del grafo legado. */
export type Clasificacion = 'simple' | 'compleja';

/**
 * Estado del grafo, en la forma de `Annotation.Root`.
 *
 * `traza` usa un reducer concatenador: cada nodo aporta el nombre del nodo que
 * acaba de ejecutar y el estado final conserva el camino recorrido. Sin
 * reducer, cada nodo sobrescribiría la traza del anterior y solo quedaría el
 * último — que es precisamente lo que un trazado no puede perder.
 */
export const EstadoS15 = Annotation.Root({
  consulta: Annotation<string>({ value: (_previa, nueva) => nueva, default: () => '' }),
  clasificacion: Annotation<Clasificacion | ''>({
    value: (_previa, nueva) => nueva,
    default: () => '',
  }),
  respuesta: Annotation<string>({ value: (_previa, nueva) => nueva, default: () => '' }),
  traza: Annotation<string[]>({
    reducer: (previa, nueva) => [...previa, ...nueva],
    default: () => [],
  }),
});

type Estado = typeof EstadoS15.State;
type Actualizacion = Partial<Estado>;

/**
 * Señales de que la consulta pide investigación y no una respuesta directa.
 *
 * Heurística deliberadamente simple y sin modelo: S15 muestra el ENRUTAMIENTO,
 * no la calidad de la clasificación. El clasificador aprendido llega con
 * LoRA/QLoRA en S23; hasta entonces, cambiar esta función no toca el grafo.
 */
const SENALES_COMPLEJA =
  /\b(investiga|investigaci[oó]n|compara|comparar|analiza|analizar|contrastar|desarrolla|argumenta|jurisprudencia|precedente|recurso|apelaci[oó]n|casaci[oó]n)\b/i;

/**
 * Heurística determinista de clasificación: extensión de la consulta o
 * verbos/temas de investigación → `compleja`; todo lo demás → `simple`.
 *
 * Se exporta para poder probarla por separado del grafo y para que S16 (ReAct)
 * la reemplaze sin tocar las aristas.
 */
export function clasificar(consulta: string): Clasificacion {
  const texto = consulta.trim();
  if (texto.length > 220) return 'compleja';
  if (SENALES_COMPLEJA.test(texto)) return 'compleja';
  return 'simple';
}

/** Nodo 1 · clasifica y deja constancia de su paso en la traza. */
async function nodoClasificar(estado: Estado): Promise<Actualizacion> {
  return { clasificacion: clasificar(estado.consulta), traza: ['clasificar'] };
}

/** Nodo 2a · ruta simple: respuesta directa, sin recuperación (como el `? 'reason'` legado). */
async function nodoRespuestaDirecta(estado: Estado): Promise<Actualizacion> {
  return {
    respuesta: `[simple] Respuesta directa para «${estado.consulta}» — sin recuperación (ruta de fundamentos S15).`,
    traza: ['respuestaDirecta'],
  };
}

/** Nodo 2b · ruta compleja: recuperación y razonamiento (el cuerpo real vive en `langgraph.ts`). */
async function nodoRespuestaRag(estado: Estado): Promise<Actualizacion> {
  return {
    respuesta: `[compleja] Recuperación y razonamiento para «${estado.consulta}» — pasos simulados (ruta de fundamentos S15).`,
    traza: ['respuestaRag'],
  };
}

/**
 * Arista condicional después de `clasificar`.
 *
 * Es el equivalente declarativo del ternario de
 * `legacy/server/langgraph.ts:198` (`classification === 'simple' ? 'reason' :
 * 'retrieve'`): la decisión vive en la arista, no dentro del nodo.
 */
export function rutaTrasClasificar(estado: Estado): 'respuestaDirecta' | 'respuestaRag' {
  return estado.clasificacion === 'simple' ? 'respuestaDirecta' : 'respuestaRag';
}

/** Compila el grafo; el tipo de retorno se infiere para no pelear con los genéricos internos. */
function compilarGrafo() {
  return new StateGraph(EstadoS15)
    .addNode('clasificar', nodoClasificar)
    .addNode('respuestaDirecta', nodoRespuestaDirecta)
    .addNode('respuestaRag', nodoRespuestaRag)
    .addEdge(START, 'clasificar')
    .addConditionalEdges('clasificar', rutaTrasClasificar, ['respuestaDirecta', 'respuestaRag'])
    .addEdge('respuestaDirecta', END)
    .addEdge('respuestaRag', END)
    .compile();
}

type Grafo = ReturnType<typeof compilarGrafo>;

let grafoCompilado: Grafo | null = null;

/**
 * Compila el grafo una sola vez (la compilación construye el mapa de nodos y
 * aristas; recompilar por invocación sería trabajo inútil en caliente).
 */
export function construirGrafo(): Grafo {
  if (grafoCompilado) return grafoCompilado;
  grafoCompilado = compilarGrafo();
  return grafoCompilado;
}

/**
 * Ejecuta el grafo completo y devuelve el estado final con la traza de nodos.
 *
 * Determinista y sin red: es la función que el test de criterio de salida de
 * S15 invoca ("un grafo de 3 nodos con decisión condicional ejecutado y
 * trazado"). El estado inicial se pasa completo aunque los channels tengan
 * default: los defaults son red de seguridad, no contrato de entrada.
 */
export async function ejecutarFundamentos(consulta: string): Promise<Estado> {
  return construirGrafo().invoke({ consulta, clasificacion: '', respuesta: '', traza: [] });
}
