/**
 * Rerank por relevancia jurídica (Brecha 1 · W7).
 *
 * Reordena los candidatos del retrieval por coincidencia léxica con la consulta, presencia de
 * referencias normativas y longitud útil. Es deliberadamente **local**: sin sentence-transformers,
 * sin red y sin una clave más que configurar, para que el grafo pueda reordenar candidatos aunque
 * el proveedor de modelos esté caído. El nombre `CrossEncoderProvider` se mantiene del portal
 * anterior para no romper a quien ya lo importa; si algún día se sustituye por un modelo real, el
 * contrato (`rank(query, docs, topK) -> [doc, score][]`) es lo único que tiene que respetarse.
 */

export interface DocPuntuado {
  doc: string;
  score: number;
}

const NORMATIVA_RE =
  /(articulo|ley|codigo|decreto|sentencia|jurisprudencia|tutela|expediente|radicado|cgp|constitucion|corte)/i;

function sinAcentos(texto: string): string {
  // El rango combinante se escribe con los literales Unicode reales del escapado NFD.
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function tokenizar(texto: string): string[] {
  return sinAcentos(String(texto || ''))
    .toLowerCase()
    .split(/[^a-z0-9_]+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 2);
}

/** Puntuación de un documento frente a la consulta. Mayor = más relevante. */
export function scoreDoc(query: string, doc: string): number {
  const consulta = new Set(tokenizar(query));
  const documento = tokenizar(doc);
  if (consulta.size === 0 || documento.length === 0) return 0;

  const conjuntoDoc = new Set(documento);
  let coincidencias = 0;
  for (const token of consulta) if (conjuntoDoc.has(token)) coincidencias++;

  const cobertura = coincidencias / consulta.size;
  const densidad = coincidencias / Math.max(1, documento.length);
  const normativa = NORMATIVA_RE.test(sinAcentos(doc)) ? 0.15 : 0;
  const longitud = Math.min(0.1, documento.length / 2000);
  return cobertura * 0.6 + densidad * 10 * 0.15 + normativa + longitud;
}

export class CrossEncoderProvider {
  /** Devuelve los `topK` documentos mejor puntuados como pares [documento, puntuación]. */
  rank(query: string, docs: string[], topK = 10): Array<[string, number]> {
    const puntuados: DocPuntuado[] = (docs || [])
      .filter((d) => d && d.trim().length > 0)
      .map((doc) => ({ doc, score: scoreDoc(query, doc) }));
    puntuados.sort((a, b) => b.score - a.score);
    return puntuados.slice(0, Math.max(1, topK)).map((r) => [r.doc, r.score] as [string, number]);
  }
}
