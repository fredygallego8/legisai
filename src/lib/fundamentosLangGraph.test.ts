import { describe, expect, it } from 'bun:test';
import {
  clasificar,
  construirGrafo,
  ejecutarFundamentos,
  rutaTrasClasificar,
} from './fundamentosLangGraph';

// S15 no toca Neon ni Gemini: el grafo de fundamentos es determinista por
// diseño (el criterio de salida es "ejecutado y trazado", no "con coste real").
// Así el recorrido completo queda cubierto sin `LLM_KEY`.

describe('S15 · Fundamentos LangGraph', () => {
  it('ejecuta la rama simple y traza clasificar → respuestaDirecta', async () => {
    const estado = await ejecutarFundamentos('¿Qué es una tutela?');

    expect(estado.clasificacion).toBe('simple');
    expect(estado.traza).toEqual(['clasificar', 'respuestaDirecta']);
    expect(estado.respuesta).toContain('[simple]');
  });

  it('ejecuta la rama compleja y traza clasificar → respuestaRag', async () => {
    const estado = await ejecutarFundamentos(
      'Investiga jurisprudencia de casación civil sobre rescisión contractual y compara criterios',
    );

    expect(estado.clasificacion).toBe('compleja');
    expect(estado.traza).toEqual(['clasificar', 'respuestaRag']);
    expect(estado.respuesta).toContain('[compleja]');
  });

  it('el grafo compilado tiene exactamente 3 nodos propios (START/END aparte)', () => {
    const nodos = Object.keys(construirGrafo().getGraph().nodes).filter(
      (n) => n !== '__start__' && n !== '__end__',
    );

    expect(nodos.sort()).toEqual(['clasificar', 'respuestaDirecta', 'respuestaRag']);
  });

  it('el stream de updates registra los nodos en orden de ejecución (trazado)', async () => {
    // `stream()` devuelve una promesa del iterable: se await y luego se itera.
    const stream = await construirGrafo().stream(
      { consulta: 'Compara los artículos 1545 y 1602 del Código Civil' },
      { streamMode: 'updates' },
    );

    const recorrido: string[] = [];
    for await (const paso of stream) {
      for (const nodo of Object.keys(paso)) recorrido.push(nodo);
    }

    expect(recorrido).toEqual(['clasificar', 'respuestaRag']);
  });

  it('la arista condicional decide por el estado, no por efectos ocultos', async () => {
    const simple = await ejecutarFundamentos('¿Cuánto dura un proceso?');
    const compleja = await ejecutarFundamentos(
      'Analiza el precedente constitucional y desarrolla el argumento completo con casaciones',
    );

    expect(rutaTrasClasificar(simple)).toBe('respuestaDirecta');
    expect(rutaTrasClasificar(compleja)).toBe('respuestaRag');
  });

  describe('clasificar · heurística determinista', () => {
    it('pregunta corta directa → simple', () => {
      expect(clasificar('¿Qué es una tutela?')).toBe('simple');
    });

    it('tema de investigación → compleja', () => {
      expect(clasificar('busca jurisprudencia de casación')).toBe('compleja');
      expect(clasificar('compara sentencias de la Corte')).toBe('compleja');
    });

    it('consulta muy extensa → compleja aunque no traiga señales', () => {
      const larga = 'describe el procedimiento '.repeat(15);
      expect(larga.length).toBeGreaterThan(220);
      expect(clasificar(larga)).toBe('compleja');
    });
  });
});
