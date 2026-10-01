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
      const auditData = await sql`
        SELECT 
          d.id, 
          d.name, 
          d.type, 
          COUNT(rc.id) as chunk_count 
        FROM documentos d
        LEFT JOIN rag_chunks rc ON d.id = rc.document_id
        GROUP BY d.id, d.name, d.type
        UNION ALL
        SELECT 
          rc.document_id as id,
          'Doc Vectorizado RAG (' || COALESCE(rc.expediente_id, 'general') || ')' as name,
          CASE WHEN rc.content ILIKE '%html%' OR rc.id ILIKE '%html%' THEN 'html' ELSE 'pdf' END as type,
          COUNT(rc.id) as chunk_count
        FROM rag_chunks rc
        WHERE rc.document_id NOT IN (SELECT id FROM documentos)
        GROUP BY rc.document_id, rc.expediente_id, CASE WHEN rc.content ILIKE '%html%' OR rc.id ILIKE '%html%' THEN 'html' ELSE 'pdf' END
        ORDER BY chunk_count DESC;
      `;
      res.json({ success: true, data: auditData });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  
    })();
  } catch (err: any) {
    console.error('Error en la ruta:', err);
    res.status(err?.status || 500).json({ success: false, error: err?.message || 'Error interno.' });
  }

  return done;
}
