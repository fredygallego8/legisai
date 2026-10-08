import { describe, expect, it } from 'bun:test';
import { MemorySaver } from '@langchain/langgraph';
import {
  MAX_INTENTOS_S17,
  construirGrafoS17,
  ejecutarTurnoS17,
  leerEstadoS17,
  reanudarS17,
  type ConfigThread,
} from './subgrafosEstado';

// S17 tampoco toca red: el checkpointer es MemorySaver (mismo que usará
// desarrollo; producción enchufa Neon) y no hay LLM — lo que se prueba de
// verdad es la composición padre↔subgrafo, los reducers del estado y la
// reanudación del thread tras un corte con interrupt.

const config = (thread: string): ConfigThread => ({ configurable: { thread_id: thread } });

/** Consulta corta: se verifica con un lote de evidencia (camino automático). */
const CONSULTA_CORTA = '¿Cuál es el plazo para interponer el recurso de apelación?';

/** Consulta extensa: exige más evidencia de la que el bucle junta (corte humano). */
const CONSULTA_EXIGENTE = `${'analiza la jurisprudencia sobre término de caducidad '.repeat(6)}`;

describe('S17 · Subgrafos y estado', () => {
  it('el subgrafo corre como nodo del padre y su veredicto llega al estado final', async () => {
    const estado = await ejecutarTurnoS17(CONSULTA_CORTA, config('t-auto'), new MemorySaver());

    expect(estado.veredicto).toBe('verificado');
    // 'verificar' es el nodo del padre que compone al subgrafo: aparece en la
    // traza del padre, y el subgrafo aportó el veredicto al estado.
    expect(estado.traza).toEqual(['redactar', 'verificar', 'pedirEvidencia', 'verificar']);
    expect(estado.evidencia).toHaveLength(2); // un lote del nodo pedirEvidencia
    expect(estado.intentos).toBe(1);
  });

  it('el reducer de evidencia acumula entre turnos del mismo thread', async () => {
    const checkpointer = new MemorySaver();
    await ejecutarTurnoS17(CONSULTA_CORTA, config('t-acumula'), checkpointer);
    const segundo = await ejecutarTurnoS17('¿Y el de casación?', config('t-acumula'), checkpointer);

    // El segundo turno arranca verificado (hereda evidencia y respuesta): solo
    // redactar y verificar. La traza crece sobre la del primero porque el
    // reducer acumula: el estado del thread es la base.
    expect(segundo.traza).toEqual([
      'redactar',
      'verificar',
      'pedirEvidencia',
      'verificar',
      'redactar',
      'verificar',
    ]);
    expect(segundo.evidencia).toHaveLength(2); // no pidió lote nuevo: ya tenía
    expect(segundo.consulta).toBe('¿Y el de casación?');
    expect(segundo.veredicto).toBe('verificado');
  });

  it('threads distintos no se contaminan: cada uno arranca su propio estado', async () => {
    const checkpointer = new MemorySaver();
    const a = await ejecutarTurnoS17(CONSULTA_CORTA, config('t-a'), checkpointer);
    const b = await ejecutarTurnoS17(CONSULTA_CORTA, config('t-b'), checkpointer);

    expect(a.traza).toEqual(b.traza);
    expect(a.evidencia).toEqual(['evidencia-1-a', 'evidencia-1-b']);
    expect(b.evidencia).toEqual(['evidencia-1-a', 'evidencia-1-b']);
    // El thread b no arrastra los pasos del a: 4 pasos propios, ni uno más.
    expect(b.traza).toHaveLength(4);
  });

  it('el checkpointer persiste el estado: getState devuelve lo guardado', async () => {
    const checkpointer = new MemorySaver();
    const ejecutado = await ejecutarTurnoS17(CONSULTA_CORTA, config('t-leer'), checkpointer);

    const guardado = await leerEstadoS17(config('t-leer'), checkpointer);

    expect(guardado.veredicto).toBe(ejecutado.veredicto);
    expect(guardado.evidencia).toEqual(ejecutado.evidencia);
    expect(guardado.respuesta).toBe(ejecutado.respuesta);
  });

  it('la consulta exigente agota el bucle y corta por revisión humana', async () => {
    const checkpointer = new MemorySaver();
    const cortado = await ejecutarTurnoS17(CONSULTA_EXIGENTE, config('t-corte'), checkpointer);

    // El grafo quedó congelado en revisionHumana: el bucle automático corrió
    // MAX_INTENTOS lotes y el subgrafo siguió rechazando (2 lotes < 5 exigidos).
    expect(cortado.veredicto).toBe('rechazado');
    expect(cortado.intentos).toBe(MAX_INTENTOS_S17);
    expect(cortado.traza).toEqual([
      'redactar',
      'verificar',
      'pedirEvidencia',
      'verificar',
      'pedirEvidencia',
      'verificar',
    ]);

    const grafo = construirGrafoS17(checkpointer);
    const snapshot = await grafo.getState(config('t-corte'));
    // next marcando el nodo cortado y el payload del interrupt a la vista de
    // quien reanuda: eso es lo que demuestra que hay de dónde colgarse.
    expect(snapshot.next).toEqual(['corteHumano']);
    const tareas = snapshot.tasks ?? [];
    const payload = tareas
      .flatMap((t) => t.interrupts ?? [])
      .map((i) => i.value as { motivo?: string });
    expect(payload[0]?.motivo).toContain('intentos automáticos');
  });

  it('reanudar con aprobación cierra el thread verificado; rechazar lo cierra rechazado', async () => {
    const checkpointer = new MemorySaver();
    await ejecutarTurnoS17(CONSULTA_EXIGENTE, config('t-aprobar'), checkpointer);
    const aprobado = await reanudarS17('aprobar', config('t-aprobar'), checkpointer);

    expect(aprobado.revisionHumana).toBe('aprobada');
    expect(aprobado.veredicto).toBe('verificado');
    expect(aprobado.traza.at(-1)).toBe('corteHumano');

    await ejecutarTurnoS17(CONSULTA_EXIGENTE, config('t-rechazar'), checkpointer);
    const rechazado = await reanudarS17('rechazar', config('t-rechazar'), checkpointer);

    expect(rechazado.revisionHumana).toBe('rechazada');
    expect(rechazado.veredicto).toBe('rechazado');
  });
});
