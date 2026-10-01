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
      const { fileName, metadata, fileContentText } = req.body;
      if (!fileName || !metadata) {
        return res.status(400).json({ success: false, error: 'fileName y metadata son obligatorios' });
      }

      const result = await DocumentParser.saveParsedCaseToNeon(fileName, metadata);
      
      if (fileContentText && result.expedienteId) {
        await DocumentParser.extractTimelineEvents(fileContentText, result.expedienteId);
      }

      res.json({ success: true, ...result });
    } catch (err: any) {
      console.error('Error en /api/confirm-document-parse:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  
    })();
  } catch (err: any) {
    console.error('Error en la ruta:', err);
    res.status(err?.status || 500).json({ success: false, error: err?.message || 'Error interno.' });
  }

  return done;
}
