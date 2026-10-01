/**
 * Embeddings de la aplicación: un proveedor seleccionable por entorno — SOLO SERVIDOR.
 *
 * Motivo (Brecha 6 · medición): medir y operar dependían de una sola cuota (Google). Con la clave
 * de desarrollo agotada, medir el recuperador era imposible. Ahora el proveedor se elige con
 * `EMBEDDING_PROVIDER`:
 *
 *  - `gemini` (por defecto): `gemini-embedding-2-preview`, 768 dimensiones nativas.
 *  - `openrouter`: `openai/text-embedding-3-small` con `dimensions: 768`, compatible con OpenAI.
 *
 * Dos reglas que no se pueden relajar:
 *
 * 1. **Siempre 768 dimensiones.** `rag_chunks.embedding` es `vector(768)`. Un proveedor que
 *    devuelva 1536 se rechaza aquí, con un error claro, en vez de fallar más tarde en el INSERT
 *    (ya pasó una vez: el código leía `response.embedding` y caía siempre a un vector de relleno).
 * 2. **Un solo proveedor por tabla.** Los vectores de dos modelos distintos viven en espacios
 *    distintos: mezclarlos da resultados silenciosamente incorrectos, sin error. Por eso
 *    `modeloDeEmbeddings()` es la única fuente del nombre del modelo y `scripts/re-embed-corpus.ts`
 *    exige autorización explícita para cambiar el que ya está almacenado.
 */
import { GoogleGenAI } from '@google/genai';

/** Debe coincidir con rag_chunks.embedding (vector(768)). */
export const EMBEDDING_DIMENSIONS = 768;

export type ProveedorEmbeddings = 'gemini' | 'openrouter';

const MODELOS: Record<ProveedorEmbeddings, string> = {
  gemini: 'gemini-embedding-2-preview',
  openrouter: 'openai/text-embedding-3-small',
};

export function proveedorDeEmbeddings(): ProveedorEmbeddings {
  const valor = String(process.env.EMBEDDING_PROVIDER || 'gemini').trim().toLowerCase();
  if (valor === 'gemini' || valor === 'openrouter') return valor;
  throw new Error(
    `EMBEDDING_PROVIDER desconocido: "${valor}". Valores admitidos: gemini | openrouter.`,
  );
}

export function modeloDeEmbeddings(): string {
  const proveedor = proveedorDeEmbeddings();
  const porEntorno = String(process.env.EMBEDDING_MODEL || '').trim();
  return porEntorno || MODELOS[proveedor];
}

let clienteGoogle: GoogleGenAI | null = null;

function clienteGemini(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY no está configurada en el servidor.');
  if (!clienteGoogle) {
    clienteGoogle = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'legisai-server' } },
    });
  }
  return clienteGoogle;
}

/** Reinicia clientes (tests). */
export function __resetEmbeddingClientsForTests(): void {
  clienteGoogle = null;
}

function validar(vector: unknown, proveedor: string): number[] {
  const values = Array.isArray(vector) ? (vector as number[]) : [];
  if (values.length === 0) throw new Error(`${proveedor} no devolvió un embedding utilizable.`);
  if (values.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `El embedding tiene ${values.length} dimensiones y el esquema espera ${EMBEDDING_DIMENSIONS}.`,
    );
  }
  return values;
}

async function embeddingGemini(texto: string): Promise<number[]> {
  const response = await clienteGemini().models.embedContent({
    model: modeloDeEmbeddings(),
    contents: texto,
    config: { outputDimensionality: EMBEDDING_DIMENSIONS },
  });
  return validar(response.embeddings?.[0]?.values, 'Gemini');
}

async function embeddingOpenRouter(texto: string): Promise<number[]> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY no está configurada en el servidor.');
  const base = String(process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1').replace(/\/+$/, '');

  const response = await fetch(`${base}/embeddings`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: modeloDeEmbeddings(),
      input: texto,
      // 768 explícito: el modelo devuelve 1536 por defecto y la columna es vector(768).
      dimensions: EMBEDDING_DIMENSIONS,
    }),
  });

  if (!response.ok) {
    const detalle = await response.text().catch(() => '');
    throw new Error(`OpenRouter respondió ${response.status}: ${detalle.slice(0, 200)}`);
  }
  const payload: any = await response.json();
  if (payload?.error) throw new Error(`OpenRouter devolvió un error: ${String(payload.error).slice(0, 200)}`);
  return validar(payload?.data?.[0]?.embedding, 'OpenRouter');
}

/**
 * Vector de 768 dimensiones de un texto. Lanza si el proveedor falla: nunca devuelve un vector
 * de relleno, porque un relleno no rompe la búsqueda, la degrada en silencio.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const clean = String(text || '').trim();
  if (!clean) throw new Error('No se puede generar un embedding de un texto vacío.');
  return proveedorDeEmbeddings() === 'openrouter'
    ? embeddingOpenRouter(clean)
    : embeddingGemini(clean);
}

/** Estado del proveedor, para informes y diagnósticos (nunca expone claves). */
export function estadoEmbeddings(): {
  proveedor: ProveedorEmbeddings;
  modelo: string;
  dimensiones: number;
  configurado: boolean;
} {
  const proveedor = proveedorDeEmbeddings();
  const configurado = proveedor === 'openrouter'
    ? Boolean(process.env.OPENROUTER_API_KEY)
    : Boolean(process.env.GEMINI_API_KEY);
  return { proveedor, modelo: modeloDeEmbeddings(), dimensiones: EMBEDDING_DIMENSIONS, configurado };
}
