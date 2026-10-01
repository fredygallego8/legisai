import type { NextRequest } from 'next/server';
import { makeReqRes } from '@/lib/httpShim';
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
      const { userPrompt, systemInstruction } = req.body;
      if (!userPrompt || typeof userPrompt !== 'string') {
        return res.status(400).json({ success: false, error: 'El campo "userPrompt" es obligatorio.' });
      }
      const text = await generateFromPrompt(
        userPrompt,
        systemInstruction ||
          'Responde en español jurídico colombiano basándote únicamente en el contexto entregado.',
      );
      res.json({ success: true, text, model: getChatModel() });
    } catch (err: any) {
      console.error('Error en /api/rag/answer:', err);
      res.status(502).json({ success: false, error: err.message, code: 'LLM_UNAVAILABLE' });
    }
  
    })();
  } catch (err: any) {
    console.error('Error en la ruta:', err);
    res.status(err?.status || 500).json({ success: false, error: err?.message || 'Error interno.' });
  }

  return done;
}
