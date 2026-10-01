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

export async function GET(
  request: NextRequest,
  ctx: { params?: Promise<Record<string, string>> },
) {
  const params = ctx?.params ? await ctx.params : {};
  const { req, res, done } = await makeReqRes(request, params);

  try {
    await (async () => {
    try {
      const sql = getDb();
      const stats = await sql`
        SELECT 
          (SELECT COUNT(*) FROM expedientes) as expedientes_count,
          (SELECT COUNT(*) FROM documentos) as documentos_count,
          (SELECT COUNT(*) FROM rag_chunks) as chunks_count,
          current_database() as database_name
      `;
      res.json({
        connected: true,
        database: stats[0]?.database_name || 'neondb',
        expedientesCount: parseInt(stats[0]?.expedientes_count || '0', 10),
        documentosCount: parseInt(stats[0]?.documentos_count || '0', 10),
        chunksCount: parseInt(stats[0]?.chunks_count || '0', 10),
        pgvector: true
      });
    } catch (err: any) {
      res.status(500).json({
        connected: false,
        error: err.message
      });
    }
  
    })();
  } catch (err: any) {
    console.error('Error en la ruta:', err);
    res.status(err?.status || 500).json({ success: false, error: err?.message || 'Error interno.' });
  }

  return done;
}
