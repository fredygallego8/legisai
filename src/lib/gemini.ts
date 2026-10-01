/**
 * Capa de acceso a Gemini — SOLO SERVIDOR.
 *
 * Este módulo es el único punto del proyecto que conoce la GEMINI_API_KEY.
 * El navegador nunca habla con Google directamente: todo pasa por /api/*.
 *
 * Notas verificadas contra la API real (2026-09-25):
 *  - `embedContent` devuelve `{ embeddings: [...] }`; NO existe `response.embedding`.
 *    El código anterior leía `response.embedding?.values` y por eso SIEMPRE
 *    caía al vector de respaldo (búsqueda por hash de palabras, no semántica).
 *  - La dimensión por defecto del modelo de embeddings es 3072, incompatible con
 *    la columna `rag_chunks.embedding vector(768)`. Se fuerza
 *    `outputDimensionality: 768` para respetar el esquema existente.
 */
import { GoogleGenAI, Type } from '@google/genai';
import { EMBEDDING_DIMENSIONS, generateEmbedding, modeloDeEmbeddings } from './embeddings';
import { makeRehydrator, maskText, rehydrateText, type PIIMapping } from './piiMasker';
import type { ExecutiveSummaryData } from '@/types';

/**
 * Los embeddings tienen su propio módulo (`lib/embeddings.ts`) porque el proveedor se elige por
 * entorno (Gemini u OpenRouter). Aquí se reexportan para no romper a quien ya los importaba.
 */
export { EMBEDDING_DIMENSIONS, generateEmbedding };

export function getChatModel(): string {
  return process.env.GEMINI_CHAT_MODEL || 'gemini-3.8-flash';
}

/** Modelo de embeddings en uso; lo decide `EMBEDDING_PROVIDER` (ver lib/embeddings.ts). */
export function getEmbeddingModel(): string {
  return modeloDeEmbeddings();
}

let client: GoogleGenAI | null = null;

export function isConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY no está configurada en el servidor.');
  }
  if (!client) {
    client = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'legisai-server' } },
    });
  }
  return client;
}

/** Reinicia los clientes (tests). */
export function __resetClientForTests(): void {
  client = null;
}

// ------------------------------------------------------------------ chat

export interface ChatFilePart {
  /** Base64 sin prefijo data: */
  data: string;
  /** MIME type, ej. application/pdf */
  type: string;
}

export interface ChatRequest {
  messages: Array<{ role?: string; content: string }>;
  contextText?: string;
  expedienteId?: string;
  attachedFiles?: ChatFilePart[];
  /** Contexto del expediente ya resuelto desde la base de datos */
  expedienteContext?: string;
  /**
   * Nombres de las partes que el llamador conoce (demandante, demandado), leídos de la ficha del
   * expediente. No se adivinan por patrón a propósito: un detector de nombres mete en el mismo
   * saco "Juzgado 29 Civil Municipal" o "Corte Suprema".
   */
  nombresPii?: string[];
}

export const DEFAULT_SYSTEM_INSTRUCTION = `Eres el Consultor Jurídico Senior de LegisAI Colombia, especialista en Derecho Procesal Civil (Código General del Proceso - Ley 1564 de 2012), Derecho Hipotecario y Comercial, y jurisprudencia de las Altas Cortes (Corte Suprema de Justicia, Corte Constitucional y Consejo de Estado).

Trabajas exclusivamente con la información que se te entrega en el contexto (expediente y fragmentos recuperados del corpus). Nunca inventes radicados, nombres de partes, despachos, fechas ni números de sentencia.

REGLAS DE RESPUESTA:
1. Responde en español jurídico colombiano, de forma profesional, clara y directa.
2. Fundaméntate en las normas y fragmentos citados en el contexto; cita el artículo o la providencia cuando corresponda.
3. Si el contexto no contiene la información necesaria para responder, dilo expresamente y explica qué pieza procesal o documento falta. No completes con suposiciones.
4. Si el usuario pregunta por el estado de un caso, sintetiza únicamente los hitos y datos presentes en el contexto.`;

interface InstruccionEnmascarada {
  instruction: string;
  mapping: PIIMapping[];
}

/**
 * Arma la instrucción de sistema enmascarando el contexto (Brecha 9 · C9.4).
 *
 * Devuelve también el mapeo token → valor: sin él, si el modelo repite un token, el usuario lee
 * `<PII_NOMBRE_0>` en la respuesta. La versión heredada descartaba ese mapeo.
 */
function buildSystemInstruction(req: ChatRequest): InstruccionEnmascarada {
  const blocks: string[] = [DEFAULT_SYSTEM_INSTRUCTION];
  const opciones = { nombres: req.nombresPii || [] };
  const mapping: PIIMapping[] = [];
  if (req.expedienteContext) {
    const bloque = maskText(req.expedienteContext, opciones);
    mapping.push(...bloque.mapping);
    blocks.push(`[EXPEDIENTE ACTIVO]\n${bloque.masked}`);
  }
  if (req.contextText) {
    const bloque = maskText(req.contextText, opciones);
    mapping.push(...bloque.mapping);
    blocks.push(`[CONTEXTO RECUPERADO]\n${bloque.masked}`);
  }
  return { instruction: blocks.join('\n\n'), mapping };
}

/** Las partes de la pregunta. La pregunta del usuario también puede traer PII. */
function buildParts(
  req: ChatRequest,
  opciones: { nombres: string[] },
): { parts: any[]; mapping: PIIMapping[] } {
  const last = req.messages?.[req.messages.length - 1];
  const pregunta = maskText(last?.content || 'Analiza el material adjunto.', opciones);
  const parts: any[] = [{ text: pregunta.masked }];
  for (const file of req.attachedFiles || []) {
    if (file?.data && file?.type) {
      parts.push({ inlineData: { data: file.data, mimeType: file.type } });
    }
  }
  return { parts, mapping: pregunta.mapping };
}

/**
 * Respuesta completa. Lanza si Gemini falla: nunca devuelve texto simulado.
 */
export async function generateChatResponse(req: ChatRequest): Promise<string> {
  const opciones = { nombres: req.nombresPii || [] };
  const sistema = buildSystemInstruction(req);
  const { parts, mapping } = buildParts(req, opciones);

  const response = await getClient().models.generateContent({
    model: getChatModel(),
    contents: [{ role: 'user', parts }],
    config: {
      systemInstruction: sistema.instruction,
      temperature: 0.2,
    },
  });

  const text = response.text;
  if (!text || !text.trim()) {
    throw new Error('Gemini devolvió una respuesta vacía.');
  }
  // El mapeo vuelve por el mismo camino: lo que se enmascaró se rehidrata antes de responder.
  return rehydrateText(text, [...sistema.mapping, ...mapping]);
}

/**
 * Respuesta en streaming. Lanza si Gemini falla.
 */
export async function* streamChatResponse(req: ChatRequest): AsyncGenerator<string> {
  const opciones = { nombres: req.nombresPii || [] };
  const sistema = buildSystemInstruction(req);
  const { parts, mapping } = buildParts(req, opciones);

  const stream = await getClient().models.generateContentStream({
    model: getChatModel(),
    contents: [{ role: 'user', parts }],
    config: {
      systemInstruction: sistema.instruction,
      temperature: 0.2,
    },
  });

  // Un token puede partirse entre dos trozos del stream: el rehidratador retiene el final del
  // búfer hasta saber si empieza un token.
  const rehidratar = makeRehydrator([...sistema.mapping, ...mapping]);
  let emitted = false;
  for await (const chunk of stream) {
    const text = chunk.text;
    if (text) {
      emitted = true;
      const listo = rehidratar.push(text);
      if (listo) yield listo;
    }
  }
  if (!emitted) {
    throw new Error('Gemini no devolvió contenido en el streaming.');
  }
  const cola = rehidratar.flush();
  if (cola) yield cola;
}

/** Respuesta abierta a partir de un prompt ya construido (usado por el RAG de PDFs). */
export async function generateFromPrompt(
  userPrompt: string,
  systemInstruction: string,
  files?: ChatFilePart[],
  nombresPii?: string[],
): Promise<string> {
  // Este camino lo usa el RAG de documentos: el prompt lo arma el llamador y puede llevar el
  // contexto del expediente, así que se enmascara igual que el chat.
  const opciones = { nombres: nombresPii || [] };
  const prompt = maskText(userPrompt, opciones);
  const sistema = maskText(systemInstruction, opciones);
  const parts: any[] = [{ text: prompt.masked }];
  for (const file of files || []) {
    if (file?.data && file?.type) {
      parts.push({ inlineData: { data: file.data, mimeType: file.type } });
    }
  }

  const response = await getClient().models.generateContent({
    model: getChatModel(),
    contents: [{ role: 'user', parts }],
    config: { systemInstruction: sistema.masked, temperature: 0.2 },
  });

  const text = response.text;
  if (!text || !text.trim()) {
    throw new Error('Gemini devolvió una respuesta vacía.');
  }
  return rehydrateText(text, [...prompt.mapping, ...sistema.mapping]);
}

// ------------------------------------------------------------ resumen ejecutivo

const EXECUTIVE_SUMMARY_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    radicado: { type: Type.STRING, description: 'Número o radicado de la sentencia' },
    corporacion: { type: Type.STRING, description: 'Corporación emisora' },
    magistradoPonente: { type: Type.STRING, description: 'Magistrado ponente' },
    fecha: { type: Type.STRING, description: 'Fecha de expedición del fallo' },
    temaPrincipal: { type: Type.STRING, description: 'Materia jurídica principal' },
    problemaJuridico: { type: Type.STRING, description: 'Problema jurídico formulado' },
    ratioDecidendi: { type: Type.STRING, description: 'Regla jurídica determinante del fallo' },
    puntosClave: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Puntos clave' },
    decision: { type: Type.STRING, description: 'Sentido del fallo y órdenes principales' },
    normasAplicadas: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Normas aplicadas' },
    obiterDicta: { type: Type.STRING, description: 'Consideraciones adicionales no vinculantes' },
    precedentesCitados: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Precedentes citados' },
  },
  required: ['radicado', 'corporacion', 'problemaJuridico', 'ratioDecidendi', 'puntosClave', 'decision'],
} as const;

/**
 * Resumen ejecutivo de una providencia.
 *
 * NO se enmascara a propósito, y conviene no "arreglarlo" por simetría: la ficha existe para
 * extraer justamente el radicado, la corporación y el magistrado ponente —los identificadores que
 * el enmascarador oculta— y su entrada es el texto de una providencia pública, no datos de un
 * cliente. Enmascararla exigiría rehidratar el JSON antes de parsearlo, sin ganancia real.
 */
export async function generateExecutiveSummary(
  textOrPrompt: string,
  files?: ChatFilePart[],
): Promise<ExecutiveSummaryData> {
  const prompt = `Actúa como Magistrado Auxiliar de la Corte Constitucional de Colombia.
Analiza la siguiente sentencia, expediente o consulta jurídica colombiana y genera una ficha rigurosa.

CONTENIDO A ANALIZAR:
${textOrPrompt}

Si algún dato no aparece en el contenido, devuélvelo como una cadena vacía o con "No consta en el documento". No inventes radicados, magistrados, fechas ni normas.`;

  const parts: any[] = [{ text: prompt }];
  for (const file of files || []) {
    if (file?.data && file?.type) {
      parts.push({ inlineData: { data: file.data, mimeType: file.type } });
    }
  }

  const response = await getClient().models.generateContent({
    model: getChatModel(),
    contents: [{ role: 'user', parts }],
    config: {
      systemInstruction:
        'Eres el analista de jurisprudencia constitucional y de casación de LegisAI Colombia. Responde estrictamente en formato JSON válido y no inventes datos.',
      responseMimeType: 'application/json',
      responseSchema: EXECUTIVE_SUMMARY_SCHEMA,
    },
  });

  const text = response.text;
  if (!text) throw new Error('Gemini no devolvió el resumen ejecutivo.');

  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('El resumen ejecutivo devuelto no es JSON válido.');
  }

  return {
    radicado: parsed.radicado || '',
    corporacion: parsed.corporacion || '',
    magistradoPonente: parsed.magistradoPonente || '',
    fecha: parsed.fecha || '',
    temaPrincipal: parsed.temaPrincipal || '',
    problemaJuridico: parsed.problemaJuridico || '',
    ratioDecidendi: parsed.ratioDecidendi || '',
    puntosClave: Array.isArray(parsed.puntosClave) ? parsed.puntosClave : [],
    decision: parsed.decision || '',
    normasAplicadas: Array.isArray(parsed.normasAplicadas) ? parsed.normasAplicadas : [],
    obiterDicta: parsed.obiterDicta || '',
    precedentesCitados: Array.isArray(parsed.precedentesCitados) ? parsed.precedentesCitados : [],
  };
}
