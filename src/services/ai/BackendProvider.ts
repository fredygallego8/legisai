/**
 * Proveedor LLM respaldado por el backend (/api/*).
 *
 * Reemplaza al antiguo GeminiProvider, que instanciaba el SDK de Google
 * dentro del navegador y por tanto obligaba a incrustar la API key en el
 * bundle público. Aquí el navegador NUNCA ve la clave.
 */
import { apiJson, apiStream } from '../api/apiClient';
import type { ILLMProvider, FilePart } from './ILLMProvider';
import type { Message, ExecutiveSummaryData } from '../../types';

const ACTIVE_EXPEDIENTE_KEY = 'legisai_active_expediente_id';

function activeExpedienteId(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  return localStorage.getItem(ACTIVE_EXPEDIENTE_KEY) || undefined;
}

function toPayload(messages: Message[], contextText?: string, files?: FilePart[]) {
  return {
    messages: (messages || []).map((m) => ({ role: m.role, content: m.content })),
    contextText: contextText || undefined,
    attachedFiles: (files || []).map((f) => ({ data: f.data, type: f.mimeType })),
    expedienteId: activeExpedienteId(),
  };
}

export class BackendProvider implements ILLMProvider {
  readonly id = 'backend';

  async generateEmbedding(text: string): Promise<number[]> {
    const res = await apiJson<{ success: boolean; values: number[] }>('/api/embeddings', {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
    if (!Array.isArray(res.values) || res.values.length === 0) {
      throw new Error('El servidor no devolvió un embedding válido.');
    }
    return res.values;
  }

  async getChatCompletion(
    messages: Message[],
    contextText?: string,
    files?: FilePart[],
  ): Promise<string> {
    const res = await apiJson<{ success: boolean; text: string }>('/api/chat', {
      method: 'POST',
      body: JSON.stringify(toPayload(messages, contextText, files)),
    });
    if (!res.text) throw new Error('El servidor no devolvió texto.');
    return res.text;
  }

  async *getChatCompletionStream(
    messages: Message[],
    contextText?: string,
    files?: FilePart[],
  ): AsyncGenerator<string> {
    const payload = toPayload(messages, contextText, files);
    yield* apiStream('/api/chat/stream', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async generateExecutiveSummary(
    text: string,
    files?: FilePart[],
  ): Promise<ExecutiveSummaryData> {
    const res = await apiJson<{ success: boolean; summary: ExecutiveSummaryData }>(
      '/api/executive-summary',
      {
        method: 'POST',
        body: JSON.stringify({
          text,
          attachedFiles: (files || []).map((f) => ({ data: f.data, type: f.mimeType })),
        }),
      },
    );
    if (!res.summary) throw new Error('El servidor no devolvió el resumen ejecutivo.');
    return res.summary;
  }
}
