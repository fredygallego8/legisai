import type { NextRequest } from 'next/server';
import { streamChatResponse } from '@/lib/gemini';
import { buildExpedienteFicha } from '@/lib/expedienteContext';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({} as any));
  const { messages, contextText, attachedFiles, expedienteId } = body;
  let iterator: AsyncGenerator<string> | null = null;
  const encoder = new TextEncoder();
  try {
    // Mismo criterio que /api/chat: contexto y nombres, de la misma lectura (C9.4).
    const ficha = expedienteId
      ? await buildExpedienteFicha(String(expedienteId))
      : { contexto: '', nombresPii: [] };
    iterator = streamChatResponse({
      messages: Array.isArray(messages) ? messages : [],
      contextText,
      expedienteId,
      expedienteContext: ficha.contexto,
      nombresPii: ficha.nombresPii,
      attachedFiles,
    });
    const first = await iterator.next();
    if (first.done) throw new Error('El modelo no devolvio contenido.');
    const stream = new ReadableStream({
      async start(controller) {
        const send = (payload: any) => controller.enqueue(encoder.encode('data: ' + JSON.stringify(payload) + '\\n\\n'));
        try {
          send({ text: first.value });
          for await (const chunk of iterator!) send({ text: chunk });
          controller.enqueue(encoder.encode('data: [DONE]\\n\\n'));
        } catch (err: any) {
          console.error('Error durante el streaming:', err);
          send({ error: 'No se pudo completar la respuesta: ' + (err?.message || 'error'), code: 'LLM_UNAVAILABLE' });
          controller.enqueue(encoder.encode('data: [DONE]\\n\\n'));
        } finally { controller.close(); }
      },
      cancel() { iterator?.return?.(undefined as any).catch(() => {}); },
    });
    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (err: any) {
    console.error('Error en /api/chat/stream:', err);
    return Response.json(
      { success: false, error: 'No se pudo obtener respuesta del modelo: ' + (err?.message || 'error'), code: 'LLM_UNAVAILABLE' },
      { status: 502 },
    );
  }
}