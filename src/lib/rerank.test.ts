import { describe, expect, it } from 'bun:test';
import { CrossEncoderProvider, scoreDoc } from './rerank';

// Lo que se prueba aquí es el orden: el retrieval vectorial ya trajo candidatos, y si el reranker
// los barajara, el modelo respondería con el chunk equivocado sin que nadie se enterase.

const CONSULTA = '¿qué plazo hay para oponer excepciones en un proceso ejecutivo?';

const CON_PLAZO =
  'El ejecutado deberá oponer excepciones dentro de los diez (10) días siguientes a la notificación del mandamiento ejecutivo (Art. 442 CGP).';
const SIN_QUE_VER =
  'El expediente fue archivado en la oficina judicial por falta de impulso procesal de la parte demandante.';

describe('scoreDoc', () => {
  it('puntúa por delante el documento que comparte términos con la consulta', () => {
    expect(scoreDoc(CONSULTA, CON_PLAZO)).toBeGreaterThan(scoreDoc(CONSULTA, SIN_QUE_VER));
  });

  it('no distingue acentos ni mayúsculas', () => {
    const a = scoreDoc('MEDIDA CAUTELAR', 'La medida cautelar de embargo');
    const b = scoreDoc('medida cautelar', 'la medida CAUTELAR de embargo');
    expect(a).toBe(b);
    expect(a).toBeGreaterThan(0);
  });

  it('vale cero si la consulta o el documento no aportan términos', () => {
    expect(scoreDoc('', CON_PLAZO)).toBe(0);
    expect(scoreDoc(CONSULTA, '   ')).toBe(0);
    // "un" y "ay" tienen dos letras: el tokenizador las descarta, la consulta queda vacía.
    expect(scoreDoc('un ay', CON_PLAZO)).toBe(0);
  });

  it('premia la referencia normativa con 0.15 sobre un texto con los mismos términos', () => {
    // Mismo recuento de tokens y ninguna de las dos palabras aparece en la consulta: lo único que
    // cambia es el bonus normativo, así que la diferencia tiene que ser exacta.
    const sinRef = 'el plazo para excepciones es diez días según norma';
    const conRef = 'el plazo para excepciones es diez días según artículo';
    expect(scoreDoc(CONSULTA, conRef) - scoreDoc(CONSULTA, sinRef)).toBeCloseTo(0.15, 5);
  });
});

describe('CrossEncoderProvider.rank', () => {
  const reranker = new CrossEncoderProvider();

  it('devuelve orden descendente con su puntuación', () => {
    const ranked = reranker.rank(CONSULTA, [SIN_QUE_VER, CON_PLAZO]);
    expect(ranked[0][0]).toBe(CON_PLAZO);
    expect(ranked[0][1]).toBeGreaterThanOrEqual(ranked[1][1]);
  });

  it('respeta topK', () => {
    const ranked = reranker.rank(CONSULTA, [CON_PLAZO, SIN_QUE_VER, 'otro texto cualquiera'], 1);
    expect(ranked).toHaveLength(1);
    expect(ranked[0][0]).toBe(CON_PLAZO);
  });

  it('descarta los documentos vacíos en vez de puntuarlos', () => {
    expect(reranker.rank(CONSULTA, ['', '   ', CON_PLAZO])).toHaveLength(1);
  });

  it('un topK menor que 1 devuelve al menos un documento', () => {
    expect(reranker.rank(CONSULTA, [CON_PLAZO], 0)).toHaveLength(1);
  });

  it('sin documentos no inventa resultados', () => {
    expect(reranker.rank(CONSULTA, [])).toEqual([]);
  });
});
