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
      const sql = getDb();
      const { chunks } = req.body;
      const now = Date.now();

      if (!Array.isArray(chunks)) {
        return res.status(400).json({ success: false, error: 'chunks array requerido' });
      }

      for (const chunk of chunks) {
        const textContent = chunk.content || chunk.text || '';
        if (!textContent.trim()) continue;

        const tokenCount = chunk.tokenCount || chunk.tokenEstimate || Math.ceil(textContent.length / 4);
        const vectorStr = chunk.embedding && Array.isArray(chunk.embedding) 
          ? `[${chunk.embedding.join(',')}]` 
          : null;
        const pageNumber = chunk.pageNumber || chunk.page_number || 1;
        const chunkIndex = chunk.chunkIndex !== undefined ? chunk.chunkIndex : (chunk.index || 1);
        const docId = chunk.documentId || chunk.document_id || 'doc-general';
        const expId = chunk.expedienteId || chunk.expediente_id || null;
        const isJuris = chunk.is_jurisprudencia || chunk.isJurisprudencia || false;

        if (vectorStr) {
          await sql`
            INSERT INTO rag_chunks (
              id, document_id, expediente_id, chunk_index, page_number, content, token_count, embedding, is_jurisprudencia, created_at
            ) VALUES (
              ${chunk.id}, ${docId}, ${expId}, 
              ${chunkIndex}, ${pageNumber}, ${textContent}, 
              ${tokenCount}, ${vectorStr}::vector, ${isJuris}, ${now}
            )
            ON CONFLICT (id) DO UPDATE SET
              content = EXCLUDED.content,
              embedding = EXCLUDED.embedding,
              is_jurisprudencia = EXCLUDED.is_jurisprudencia;
          `;
        } else {
          await sql`
            INSERT INTO rag_chunks (
              id, document_id, expediente_id, chunk_index, page_number, content, token_count, is_jurisprudencia, created_at
            ) VALUES (
              ${chunk.id}, ${docId}, ${expId}, 
              ${chunkIndex}, ${pageNumber}, ${textContent}, 
              ${tokenCount}, ${isJuris}, ${now}
            )
            ON CONFLICT (id) DO UPDATE SET
              content = EXCLUDED.content,
              is_jurisprudencia = EXCLUDED.is_jurisprudencia;
          `;
        }
      }

      res.json({ success: true, saved: chunks.length });
    } catch (err: any) {
      console.error('Error en /api/rag/chunks:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  
    })();
  } catch (err: any) {
    console.error('Error en la ruta:', err);
    res.status(err?.status || 500).json({ success: false, error: err?.message || 'Error interno.' });
  }

  return done;
}
