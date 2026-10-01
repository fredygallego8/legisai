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
      const { queryEmbedding, expedienteId, limit = 5, buscarJurisprudencia = false } = req.body;

      if (!queryEmbedding || !Array.isArray(queryEmbedding)) {
        return res.status(400).json({ success: false, error: 'queryEmbedding array es requerido' });
      }

      // Convertir array a formato vector de postgres: '[0.12, 0.34, ...]'
      const vectorStr = `[${queryEmbedding.join(',')}]`;

      let results: any[] = [];
      let isCollectionEmpty = false;
      let searchedCollectionId = expedienteId || (buscarJurisprudencia ? 'exp-jurisprudencia-hipotecas-colombia' : 'general_corpus');

      if (buscarJurisprudencia) {
        results = await sql`
          SELECT id, document_id, expediente_id, chunk_index, page_number, content,
                 1 - (embedding <=> ${vectorStr}::vector) as similarity
          FROM rag_chunks
          WHERE (is_jurisprudencia = TRUE OR expediente_id = 'exp-jurisprudencia-hipotecas-colombia') AND embedding IS NOT NULL
          ORDER BY embedding <=> ${vectorStr}::vector
          LIMIT ${limit};
        `;
        if (!results || results.length === 0) {
          isCollectionEmpty = true;
        }
      } else if (expedienteId) {
        results = await sql`
          SELECT id, document_id, expediente_id, chunk_index, page_number, content,
                 1 - (embedding <=> ${vectorStr}::vector) as similarity
          FROM rag_chunks
          WHERE expediente_id = ${expedienteId} AND embedding IS NOT NULL
          ORDER BY embedding <=> ${vectorStr}::vector
          LIMIT ${limit};
        `;
        if (!results || results.length === 0) {
          isCollectionEmpty = true;
        }
      } else {
        results = await sql`
          SELECT id, document_id, expediente_id, chunk_index, page_number, content,
                 1 - (embedding <=> ${vectorStr}::vector) as similarity
          FROM rag_chunks
          WHERE embedding IS NOT NULL
          ORDER BY embedding <=> ${vectorStr}::vector
          LIMIT ${limit};
        `;
        if (!results || results.length === 0) {
          isCollectionEmpty = true;
        }
      }

      res.json({ 
        success: true, 
        results: results || [],
        totalMatches: results ? results.length : 0,
        isCollectionEmpty,
        searchedCollectionId,
        expedienteId: expedienteId || undefined
      });
    } catch (err: any) {
      console.error('Error en /api/rag/search:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  
    })();
  } catch (err: any) {
    console.error('Error en la ruta:', err);
    res.status(err?.status || 500).json({ success: false, error: err?.message || 'Error interno.' });
  }

  return done;
}
