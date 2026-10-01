import type { NextRequest } from 'next/server';
import { makeReqRes } from '@/lib/httpShim';
import { buildExpedienteFicha } from '@/lib/expedienteContext';
import { getDb, initDatabaseSchema } from '@/lib/db';
import { DocumentParser } from '@/lib/documentParser';
import { RamaJudicialCrawlerService } from '@/lib/ramaJudicialService';
import {
  generateChatResponse,
  streamChatResponse,
  generateEmbedding,
  generateExecutiveSummary,
  generateFromPrompt,
  getChatModel,
  getEmbeddingModel,
  isConfigured as isGeminiConfigured,
} from '@/lib/gemini';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  ctx: { params?: Promise<Record<string, string>> },
) {
  const params = ctx?.params ? await ctx.params : {};
  const { req, res, done } = await makeReqRes(request, params);

  try {
    await (async () => {
    try {
      const { messages, contextText, attachedFiles, expedienteId } = req.body;
      // Una sola lectura: el contexto que ve el modelo y los nombres que se enmascaran salen del
      // mismo registro. Si se leyeran por separado, se podría enmascarar un nombre y enviar otro.
      const ficha = expedienteId
        ? await buildExpedienteFicha(String(expedienteId))
        : { contexto: '', nombresPii: [] };

      const text = await generateChatResponse({
        messages: Array.isArray(messages) ? messages : [],
        contextText,
        expedienteId,
        expedienteContext: ficha.contexto,
        nombresPii: ficha.nombresPii,
        attachedFiles,
      });

      res.json({ success: true, text, model: getChatModel() });
    } catch (err: any) {
      console.error('Error en /api/chat:', err);
      res.status(502).json({
        success: false,
        error: `No se pudo obtener respuesta del modelo: ${err.message}`,
        code: 'LLM_UNAVAILABLE',
      });
    }
  
    })();
  } catch (err: any) {
    console.error('Error en la ruta:', err);
    res.status(err?.status || 500).json({ success: false, error: err?.message || 'Error interno.' });
  }

  return done;
}
