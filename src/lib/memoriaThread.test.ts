import { describe, expect, it } from 'bun:test';
import { MemorySaver } from '@langchain/langgraph';
import {
  createMemoriaStore,
  crearGrafoMemoria,
  resumirThread,
  turnoMemoria,
  type MemoriaStore,
} from './memoriaThread';

// S18 tampoco toca red: el checkpointer es MemorySaver (mismo que S17) y el
// responder es un doble determinista. Lo que se prueba de verdad es la
// memoria: qué recuerda un turno del thread y qué NO hereda otro thread.

const config = (thread: string) => ({ configurable: { thread_id: thread } });

describe('S18 · Memoria de conversación', () => {
  it('el turno siguiente recuerda los anteriores del mismo thread', async () => {
    const checkpointer = new MemorySaver();
    await turnoMemoria('¿Cuál es el plazo de apelación?', config('m1'), undefined, checkpointer);
    const segundo = await turnoMemoria('¿Y para casación?', config('m1'), undefined, checkpointer);

    // Memoria viva: los dos turnos están en el canal acumulado del thread.
    expect(segundo.turnos).toEqual(['¿Cuál es el plazo de apelación?', '¿Y para casación?']);
    // El responder del segundo turno vio el estado del primero (2 = tras 1 turno).
    expect(segundo.respuesta).toContain('turno 2 del hilo');
  });

  it('threads distintos no comparten memoria: cada uno arranca en su turno 1', async () => {
    const checkpointer = new MemorySaver();
    await turnoMemoria('pregunta del hilo A', config('A'), undefined, checkpointer);
    const enB = await turnoMemoria('pregunta del hilo B', config('B'), undefined, checkpointer);

    expect(enB.turnos).toEqual(['pregunta del hilo B']);
    expect(enB.respuesta).toContain('turno 1 del hilo');
  });

  it('el perfil acumula hechos de larga vida a lo largo de los turnos', async () => {
    const checkpointer = new MemorySaver();
    await turnoMemoria('Me llamo Fredy', config('m2'), undefined, checkpointer);
    const conExpediente = await turnoMemoria(
      'mi expediente es 11001',
      config('m2'),
      undefined,
      checkpointer,
    );

    expect(conExpediente.perfil).toEqual(['Me llamo Fredy', 'mi expediente es 11001']);
    expect(conExpediente.turnos).toHaveLength(2);
  });

  it('la memoria persiste: getState del thread devuelve los turnos acumulados', async () => {
    const checkpointer = new MemorySaver();
    await turnoMemoria('primer turno', config('m3'), undefined, checkpointer);
    await turnoMemoria('segundo turno', config('m3'), undefined, checkpointer);

    const guardado = (await crearGrafoMemoria(async () => ({ respuesta: '' }), checkpointer).getState(
      config('m3'),
    )).values;

    expect(guardado.turnos).toEqual(['primer turno', 'segundo turno']);
  });

  it('el store guarda el resumen del thread y lo comparte entre hilos', async () => {
    const checkpointer = new MemorySaver();
    const store: MemoriaStore = createMemoriaStore();
    await turnoMemoria('Me llamo Fredy', config('m4'), undefined, checkpointer);
    await turnoMemoria('¿Plazo de apelación?', config('m4'), undefined, checkpointer);

    const resumen = await resumirThread(config('m4'), store, checkpointer);

    expect(resumen).toContain('2 turno(s)');
    expect(resumen).toContain('Me llamo Fredy');
    // Otro thread lee lo que m4 dejó: memoria de largo plazo, entre hilos.
    expect(await store.get('m4', 'resumen')).toBe(resumen);
  });
});
