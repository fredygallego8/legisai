/**
 * S17 · Subgrafos y estado — el subgrafo como nodo del padre y el checkpointer
 * como memoria del thread.
 *
 * Entregable de S17 (documento de S15, sección 4): *"S17 · Subgrafos y
 * checkpointer declarado (S17, sobre Neon)"*. Criterio de salida: el grafo
 * padre compone un subgrafo reutilizable, el estado viaja entre ambos por
 * channels con reducer, y el thread reanuda donde quedó gracias al
 * checkpointer inyectado.
 *
 * Cómo se cumple:
 *
 * - `crearSubgrafoVerificacion` compila un grafo propio (un solo nodo,
 *   `cruzar`) que el padre compone en su nodo `verificar`. El subgrafo no
 *   sabe que es subgrafo — declara su propio esquema y se invoca como
 *   cualquier grafo compilado.
 * - **Lección de composición:** el subgrafo NO comparte el esquema completo
 *   del padre. Cuando padre e hijo declaran los mismos canales con reducer
 *   acumulador (`evidencia`, `traza`), el hijo devuelve su estado final
 *   COMPLETO como update del nodo y el reducer del padre vuelve a sumar lo
 *   heredado: la traza y la evidencia se duplican en cada vuelta. Por eso el
 *   subgrafo declara solo los canales que necesita para decidir
 *   (`consulta`, `respuesta`, `evidencia`) y el único canal de retorno
 *   (`veredicto`); el padre conserva `traza`, `intentos` y `revisionHumana`
 *   para sí. La comunicación es por canales de nombre compartido, que es el
 *   contrato real entre grafos.
 * - El checkpointer (`MemorySaver` aquí, la factoría para Neon queda
 *   documentada más abajo) persiste el estado por `thread_id`: `getState`
 *   devuelve lo guardado y un corte con `interrupt` reanuda con `Command`.
 *
 * Sin red ni clave: respuestas y evidencia son sintéticas, para que la
 * reanudación se pueda ejecutar y verificar sin entorno. Lo inyectable es
 * también el punto de enchufe de producción: la recuperación real (RAG/MCP)
 * entra por los nodos sin tocar el grafo.
 */

import {
  Annotation,
  Command,
  END,
  MemorySaver,
  START,
  StateGraph,
  interrupt,
} from '@langchain/langgraph';

/** Veredicto del subgrafo de verificación sobre la respuesta redactada. */
export type Veredicto = 'pendiente' | 'verificado' | 'rechazado';

/**
 * Estado del SUBGRAFO: solo los canales que necesita para decidir y el canal
 * de retorno compartido con el padre. Sin `traza` a propósito — ver la
 * lección de composición en la cabecera.
 */
export const EstadoSubgrafoS17 = Annotation.Root({
  consulta: Annotation<string>({ value: (_previa, nueva) => nueva, default: () => '' }),
  respuesta: Annotation<string>({ value: (_previa, nueva) => nueva, default: () => '' }),
  evidencia: Annotation<string[]>({
    reducer: (previa, nueva) => [...previa, ...nueva],
    default: () => [],
  }),
  veredicto: Annotation<Veredicto>({ value: (_previa, nueva) => nueva, default: () => 'pendiente' }),
});

/**
 * Estado del PADRE.
 *
 * Todos los channels llevan default: el estado inicial se puede pasar
 * parcial y el grafo arranca igual (los defaults son red de seguridad, no
 * contrato de entrada). `evidencia`, `intentos` y `traza` son los que
 * demuestran el punto de la semana: con reducer, acumulan; sin él, cada nodo
 * borraría lo anterior.
 */
export const EstadoS17 = Annotation.Root({
  consulta: Annotation<string>({ value: (_previa, nueva) => nueva, default: () => '' }),
  respuesta: Annotation<string>({ value: (_previa, nueva) => nueva, default: () => '' }),
  evidencia: Annotation<string[]>({
    reducer: (previa, nueva) => [...previa, ...nueva],
    default: () => [],
  }),
  intentos: Annotation<number>({ value: (_previa, nueva) => nueva, default: () => 0 }),
  veredicto: Annotation<Veredicto>({ value: (_previa, nueva) => nueva, default: () => 'pendiente' }),
  revisionHumana: Annotation<'pendiente' | 'aprobada' | 'rechazada'>({
    value: (_previa, nueva) => nueva,
    default: () => 'pendiente',
  }),
  traza: Annotation<string[]>({
    reducer: (previa, nueva) => [...previa, ...nueva],
    default: () => [],
  }),
});

type Estado = typeof EstadoS17.State;
type Actualizacion = Partial<Estado>;
type EstadoSubgrafo = typeof EstadoSubgrafoS17.State;

/** Config de invocación: el `thread_id` es lo que ata el estado al checkpointer. */
export type ConfigThread = { configurable: { thread_id: string } };

/** Máximo de vueltas del bucle padre → evidencia → subgrafo antes de rendirse. */
export const MAX_INTENTOS_S17 = 2;

/** Respuesta sintética determinista; el redactor real lo inyecta producción. */
function redactarSintetico(consulta: string, intentos: number): string {
  return intentos === 0
    ? `Borrador inicial para «${consulta}» — sin evidencia citada todavía.`
    : `Respuesta para «${consulta}» apoyada en ${intentos} lote(s) de evidencia del thread.`;
}

/** Evidencia sintética determinista; la recuperación real (RAG/MCP) la inyecta producción. */
function evidenciaSintetica(intentos: number): string[] {
  return [`evidencia-${intentos}-a`, `evidencia-${intentos}-b`];
}

/**
 * Nodo del subgrafo: cruza la respuesta del padre con la evidencia acumulada.
 *
 * La exigencia escala con la consulta: una consulta corta se verifica con un
 * lote; una consulta extensa pide más evidencia de la que el bucle automático
 * alcanza en `MAX_INTENTOS_S17` lotes, y eso la deriva al corte humano del
 * padre — los dos caminos del grafo (auto-verificado y revisión humana)
 * quedan así ejercitados con entradas deterministas.
 */
async function nodoCruzar(estado: EstadoSubgrafo): Promise<Partial<EstadoSubgrafo>> {
  const exigente = estado.consulta.trim().length > 120;
  const minimoEvidencia = exigente ? 5 : 1;
  const conRespuesta = estado.respuesta.trim().length > 0;
  const veredicto: Veredicto =
    conRespuesta && estado.evidencia.length >= minimoEvidencia ? 'verificado' : 'rechazado';
  return { veredicto };
}

let subgrafoCompilado: ReturnType<typeof crearSubgrafoVerificacionInterno> | null = null;

function crearSubgrafoVerificacionInterno() {
  return new StateGraph(EstadoSubgrafoS17)
    .addNode('cruzar', nodoCruzar)
    .addEdge(START, 'cruzar')
    .addEdge('cruzar', END)
    .compile();
}

/**
 * Subgrafo de verificación, compilado una sola vez por proceso.
 *
 * Es deliberadamente mínimo (un nodo): la semana S17 enseña la COMPOSICIÓN
 * (cómo el padre invoca al subgrafo y cómo viaja el estado), no la lógica de
 * verificación — esa la aporta cada dominio.
 */
export function crearSubgrafoVerificacion() {
  if (!subgrafoCompilado) subgrafoCompilado = crearSubgrafoVerificacionInterno();
  return subgrafoCompilado;
}

/** Arista del padre tras el subgrafo: reintenta, corta por humano o termina. */
function rutaTrasVerificar(estado: Estado): 'pedirEvidencia' | 'corteHumano' | typeof END {
  if (estado.veredicto === 'verificado') return END;
  if (estado.intentos >= MAX_INTENTOS_S17) return 'corteHumano';
  return 'pedirEvidencia';
}

/** Nodo del padre: pide otro lote de evidencia y cuenta el intento. */
async function nodoPedirEvidencia(estado: Estado): Promise<Actualizacion> {
  const intentos = estado.intentos + 1;
  return {
    respuesta: redactarSintetico(estado.consulta, intentos),
    evidencia: evidenciaSintetica(intentos),
    intentos,
    traza: ['pedirEvidencia'],
  };
}

/**
 * Nodo de corte humano: `interrupt` congela el grafo y devuelve el control.
 *
 * El valor pasado a `interrupt` es lo que ve quien reanuda (aquí, el motivo
 * del corte); reanudar es invocar de nuevo con `new Command({ resume })`. Sin
 * checkpointer no habría de dónde colgar la reanudación — por eso este nodo
 * es también la prueba de que el checkpointer funciona.
 */
async function nodoRevisionHumana(estado: Estado): Promise<Actualizacion> {
  const decision = await interrupt<{ motivo: string; respuesta: string; intentos: number }>({
    motivo: 'El subgrafo rechazó la respuesta y se agotaron los intentos automáticos.',
    respuesta: estado.respuesta,
    intentos: estado.intentos,
  }) as unknown as 'aprobar' | 'rechazar';
  return {
    revisionHumana: decision === 'aprobar' ? 'aprobada' : 'rechazada',
    veredicto: decision === 'aprobar' ? 'verificado' : 'rechazado',
    traza: ['corteHumano'],
  };
}

/**
 * Compila el grafo padre con el subgrafo colgado y el checkpointer inyectado.
 *
 * El checkpointer es parámetro a propósito: `MemorySaver` para pruebas y
 * desarrollo; para producción basta pasar un checkpointer de Neon
 * (`@langchain/langgraph-checkpoint-postgres` sobre `DATABASE_URL`, la misma
 * URL que ya usa `db.ts`). El grafo no cambia — eso es lo que quiere decir
 * "declarado" en el entregable.
 */
export function construirGrafoS17(checkpointer: MemorySaver) {
  return new StateGraph(EstadoS17)
    .addNode('redactar', async (estado: Estado): Promise<Actualizacion> => ({
      respuesta: redactarSintetico(estado.consulta, estado.intentos),
      traza: ['redactar'],
    }))
    .addNode('verificar', async (estado: Estado): Promise<Actualizacion> => {
      // El padre invoca al subgrafo como un grafo compilado más. El subgrafo
      // decide con lo que el padre le pasa y devuelve solo `veredicto`; la
      // traza del paso la escribe el padre (no el hijo — ver la lección de
      // composición en la cabecera).
      const salida = await crearSubgrafoVerificacion().invoke({
        consulta: estado.consulta,
        respuesta: estado.respuesta,
        evidencia: estado.evidencia,
        veredicto: 'pendiente',
      });
      return { veredicto: salida.veredicto, traza: ['verificar'] };
    })
    .addNode('pedirEvidencia', nodoPedirEvidencia)
    .addNode('corteHumano', nodoRevisionHumana)
    .addEdge(START, 'redactar')
    .addEdge('redactar', 'verificar')
    .addConditionalEdges('verificar', rutaTrasVerificar, ['pedirEvidencia', 'corteHumano', END])
    .addEdge('pedirEvidencia', 'verificar')
    .addEdge('corteHumano', END)
    .compile({ checkpointer });
}

type GrafoS17 = ReturnType<typeof construirGrafoS17>;

/**
 * Ejecuta un turno del thread: el estado previo del thread (si lo hay) es la
 * base; los canales con reducer arrastran lo acumulado.
 */
export async function ejecutarTurnoS17(
  consulta: string,
  config: ConfigThread,
  checkpointer: MemorySaver,
): Promise<Estado> {
  const grafo = construirGrafoS17(checkpointer);
  return grafo.invoke({ consulta }, config);
}

/** Lee el estado persistido del thread (lo que el checkpointer guardó). */
export async function leerEstadoS17(
  config: ConfigThread,
  checkpointer: MemorySaver,
): Promise<Estado> {
  const grafo = construirGrafoS17(checkpointer);
  const snapshot = await grafo.getState(config);
  return snapshot.values as Estado;
}

/**
 * Reanuda un thread cortado por `interrupt` con la decisión humana.
 *
 * Devuelve el estado final; si el grafo sigue cortado (otro `interrupt` más
 * adelante), el estado refleja el nuevo punto de espera.
 */
export async function reanudarS17(
  decision: 'aprobar' | 'rechazar',
  config: ConfigThread,
  checkpointer: MemorySaver,
): Promise<Estado> {
  const grafo: GrafoS17 = construirGrafoS17(checkpointer);
  return grafo.invoke(new Command({ resume: decision }), config);
}

/** Exportado para que los tests construyan la reanudación sin duplicar el import. */
export { Command };

