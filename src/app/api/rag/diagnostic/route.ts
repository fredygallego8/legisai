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
    const startTime = Date.now();
    const expedienteId = (req.query.expedienteId as string) || '';
    try {
      const sql = getDb();
      const stats = await sql`
        SELECT 
          (SELECT COUNT(*) FROM expedientes) as expedientes_count,
          (SELECT COUNT(*) FROM documentos) as documentos_count,
          (SELECT COUNT(*) FROM rag_chunks) as chunks_count,
          current_database() as database_name
      `;

      let expedienteChunks = 0;
      if (expedienteId) {
        const expChunkRows = await sql`
          SELECT COUNT(*) as count FROM rag_chunks WHERE expediente_id = ${expedienteId};
        `;
        expedienteChunks = parseInt(expChunkRows[0]?.count || '0', 10);
      }

      // Comprobar la extensión pgvector
      const extRows = await sql`
        SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';
      `;
      const hasVector = extRows.length > 0;
      const latencyMs = Math.max(1, Date.now() - startTime);
      const totalChunks = parseInt(stats[0]?.chunks_count || '0', 10);

      let status: 'OPTIMAL' | 'WARNING' | 'ERROR' = 'OPTIMAL';
      let message = `Neon DB conectado (${latencyMs}ms) • pgvector activo`;

      if (expedienteId && expedienteChunks === 0) {
        status = 'WARNING';
        message = `Neon DB conectado (${latencyMs}ms), pero la colección del expediente activo no contiene fragmentos vectorizados (RAG_EMPTY)`;
      } else {
        message = `Neon DB operativo (${latencyMs}ms) • ${totalChunks} fragmentos indexados`;
      }

      res.json({
        success: true,
        connected: true,
        latencyMs,
        database: stats[0]?.database_name || 'neondb',
        engine: 'Neon Serverless PostgreSQL (pgvector)',
        pgvector: hasVector,
        pgvectorVersion: extRows[0]?.extversion || '0.7.0',
        totalChunks,
        expedienteChunks,
        expedientesCount: parseInt(stats[0]?.expedientes_count || '0', 10),
        documentosCount: parseInt(stats[0]?.documentos_count || '0', 10),
        status,
        diagnosticMessage: message,
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      res.status(500).json({
        success: false,
        connected: false,
        latencyMs,
        database: 'neondb',
        engine: 'Neon Serverless PostgreSQL (pgvector)',
        pgvector: false,
        totalChunks: 0,
        expedienteChunks: 0,
        status: 'ERROR',
        diagnosticMessage: `Pérdida de conexión con Neon DB: ${err.message}`,
        error: err.message,
        timestamp: new Date().toISOString()
      });
    }
  
    })();
  } catch (err: any) {
    console.error('Error en la ruta:', err);
    res.status(err?.status || 500).json({ success: false, error: err?.message || 'Error interno.' });
  }

  return done;
}
