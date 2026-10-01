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

      // Consultas agregadas a Neon DB
      const [
        totalExpedientes,
        expedientesPorEstado,
        expedientesPorTipo,
        totalDocumentos,
        documentosPorTipo,
        totalChunks
      ] = await Promise.all([
        sql`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE is_archived = false) as activos, COUNT(*) FILTER (WHERE is_archived = true) as archivados FROM expedientes;`,
        sql`SELECT estado, COUNT(*) as count FROM expedientes WHERE is_archived = false GROUP BY estado;`,
        sql`SELECT tipo_proceso, COUNT(*) as count FROM expedientes GROUP BY tipo_proceso;`,
        sql`SELECT COUNT(*) as total, COALESCE(SUM(pages_count), 0) as total_pages, COALESCE(SUM(size), 0) as total_bytes FROM documentos;`,
        sql`SELECT type, COUNT(*) as count FROM documentos GROUP BY type;`,
        sql`
          SELECT 
            COALESCE(d.type, CASE WHEN rc.content ILIKE '%html%' OR rc.id ILIKE '%html%' THEN 'html' ELSE 'pdf' END) as type, 
            COUNT(rc.id) as chunk_count 
          FROM rag_chunks rc
          LEFT JOIN documentos d ON rc.document_id = d.id
          GROUP BY COALESCE(d.type, CASE WHEN rc.content ILIKE '%html%' OR rc.id ILIKE '%html%' THEN 'html' ELSE 'pdf' END);
        `
      ]);

      // Métricas REALES. Los valores anteriores (423800 prompt tokens, coste
      // 0.28 USD, uso diario, reparto por modelo) eran literales inventados que
      // se mostraban en el panel como si fueran consumo medido.
      // Lo único medible hoy es el token_count almacenado en rag_chunks.
      const embeddingTokensResult = await sql`
        SELECT COALESCE(SUM(token_count), 0)::bigint AS total FROM rag_chunks;
      `;
      const embeddingTokens = parseInt(String(embeddingTokensResult[0]?.total || '0'), 10);

      const tokenStats = {
        totalTokensVectorizados: embeddingTokens,
        promptTokens: 0,
        completionTokens: 0,
        embeddingTokens,
        estimatedCostUsd: 0,
        tracked: false,
        note: 'El consumo de prompt/completion no se registra en esta base de datos.',
        modelsUsed: [
          {
            model: getEmbeddingModel(),
            tokens: embeddingTokens,
            label: 'Embeddings RAG (medido)',
            share: embeddingTokens > 0 ? 100 : 0,
          },
        ],
        dailyUsage: [],
      };

      const pdfChunksCount = totalChunks.find((r: any) => r.type?.toLowerCase() === 'pdf')?.chunk_count || '0';
      const htmlChunksCount = totalChunks.find((r: any) => r.type?.toLowerCase() === 'html')?.chunk_count || '0';
      const totalAllChunks = totalChunks.reduce((acc: number, r: any) => acc + parseInt(r.chunk_count || '0', 10), 0);

      const neonChunksSummary = {
        total: totalAllChunks,
        pdf: parseInt(pdfChunksCount, 10),
        html: parseInt(htmlChunksCount, 10),
        otros: totalAllChunks - parseInt(pdfChunksCount, 10) - parseInt(htmlChunksCount, 10),
        porTipo: totalChunks.map((r: any) => ({ type: r.type.toUpperCase(), count: parseInt(r.chunk_count, 10) }))
      };

      res.json({
        success: true,
        database: {
          total: parseInt(totalExpedientes[0]?.total || '0', 10),
          activos: parseInt(totalExpedientes[0]?.activos || '0', 10),
          archivados: parseInt(totalExpedientes[0]?.archivados || '0', 10),
          porEstado: expedientesPorEstado.map((r: any) => ({ name: r.estado, count: parseInt(r.count, 10) })),
          porTipo: expedientesPorTipo.map((r: any) => ({ name: r.tipo_proceso, count: parseInt(r.count, 10) }))
        },
        documentos: {
          total: parseInt(totalDocumentos[0]?.total || '0', 10),
          totalPages: parseInt(totalDocumentos[0]?.total_pages || '0', 10),
          totalBytes: parseInt(totalDocumentos[0]?.total_bytes || '0', 10),
          porTipo: documentosPorTipo.map((r: any) => ({ type: r.type.toUpperCase(), count: parseInt(r.count, 10) })),
          chunksPorTipo: totalChunks.map((r: any) => ({ type: r.type.toUpperCase(), count: parseInt(r.chunk_count, 10) }))
        },
        neonChunks: neonChunksSummary,
        tokens: tokenStats
      });
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
