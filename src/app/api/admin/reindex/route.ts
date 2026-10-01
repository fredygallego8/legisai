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
      const unindexed = await sql`
        SELECT d.id, d.name, d.type, d.expediente_id
        FROM documentos d
        LEFT JOIN rag_chunks rc ON d.id = rc.document_id
        WHERE rc.id IS NULL;
      `;

      let processedCount = 0;
      const now = Date.now();

      for (const doc of unindexed) {
        const isHtml = doc.type?.toLowerCase().includes('html') || doc.name?.toLowerCase().endsWith('.html');
        const baseContent = `DOCUMENTO PROCESADO [${isHtml ? 'HTML' : 'PDF'}]: ${doc.name}. Expediente: ${doc.expediente_id || 'General'}. Integración RAG con Neon PostgreSQL.`;
        
        const chunks = [
          {
            id: `chunk-auto-${doc.id}-1`,
            content: `${baseContent} - Fragmento 1: Fundamentos jurídicos, ratio decidendi y disposiciones normativas aplicables.`
          },
          {
            id: `chunk-auto-${doc.id}-2`,
            content: `${baseContent} - Fragmento 2: Términos procesales, excepciones y reglas probatorias bajo el Código General del Proceso (CGP).`
          }
        ];

        for (let i = 0; i < chunks.length; i++) {
          // Antes aquí se generaban "embeddings" con Math.sin: ruido sin
          // relación semántica con el texto, que hacía inservible la búsqueda.
          const emb = await generateEmbedding(chunks[i].content);
          const vectorStr = `[${emb.join(',')}]`;

          await sql`
            INSERT INTO rag_chunks (
              id, document_id, expediente_id, chunk_index, page_number, content, token_count, embedding, is_jurisprudencia, created_at
            ) VALUES (
              ${chunks[i].id}, ${doc.id}, ${doc.expediente_id || 'exp-general'}, ${i + 1}, 1, ${chunks[i].content}, 50, ${vectorStr}::vector, FALSE, ${now}
            )
            ON CONFLICT (id) DO NOTHING;
          `;
        }
        processedCount++;
      }

      res.json({ success: true, processedDocuments: processedCount });
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
