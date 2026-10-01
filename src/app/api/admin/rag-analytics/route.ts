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
      const period = (req.query.period as string) || '7d';

      // Consultar expedientes y chunks en Neon DB
      const [expedientesRows, chunksPerExp] = await Promise.all([
        sql`SELECT id, radicado, titulo, tipo_proceso FROM expedientes ORDER BY created_at DESC;`,
        sql`SELECT expediente_id, COUNT(*) as chunks_count, COALESCE(SUM(token_count), 0) as token_sum FROM rag_chunks GROUP BY expediente_id;`
      ]);

      const chunkMap: Record<string, { count: number; tokens: number }> = {};
      chunksPerExp.forEach((r: any) => {
        if (r.expediente_id) {
          chunkMap[r.expediente_id] = {
            count: parseInt(r.chunks_count || '0', 10),
            tokens: parseInt(r.token_sum || '0', 10)
          };
        }
      });

      // Solo expedientes reales. Antes, si la base estaba vacía, el endpoint
      // rellenaba la analítica con cinco expedientes y radicados inventados.
      const mergedList = expedientesRows.map((r: any) => ({
        id: r.id,
        radicado: r.radicado || 'Sin radicado',
        titulo: r.titulo || 'Expediente Sin Título',
        tipoProceso: r.tipo_proceso || 'Civil'
      }));

      // Métricas por expediente.
      //
      // Antes esta sección INVENTABA el uso: consultas "simuladas"
      // (140 + index*85), latencias calculadas con senos, tokens estimados a
      // 1240/query y un coste derivado de esas cifras ficticias. Se mostraba
      // en el panel de administración como si fuera consumo medido.
      //
      // Lo único verificable en esta base es el número de chunks y sus tokens
      // almacenados. El uso de consultas no se registra, así que se reporta
      // como no medido en lugar de rellenarlo.
      const expedientesMetrics = mergedList.map((exp: any) => {
        const stats = chunkMap[exp.id] || { count: 0, tokens: 0 };

        return {
          expedienteId: exp.id,
          radicado: exp.radicado,
          titulo: exp.titulo,
          tipoProceso: exp.tipoProceso,
          queriesTracked: false,
          totalQueries: 0,
          successfulQueries: 0,
          failedQueries: 0,
          emptyQueries: 0,
          successRate: 0,
          avgLatencyMs: 0,
          p95LatencyMs: 0,
          promptTokens: 0,
          completionTokens: 0,
          embeddingTokens: stats.tokens,
          totalTokens: stats.tokens,
          costUsd: 0,
          indexedChunks: stats.count,
        };
      });

      // Las series de latencia y de tasa de éxito se generaban con Math.sin /
      // Math.cos para simular tráfico. No hay telemetría de ejecución
      // almacenada, así que se devuelven vacías en lugar de inventarlas.
      const latencyTimeSeries: Array<{
        timestamp: string;
        timeLabel: string;
        expedienteTitulo: string;
        expedienteId: string;
        neonLatencyMs: number;
        embeddingLatencyMs: number;
        generationLatencyMs: number;
        totalLatencyMs: number;
      }> = [];

      const successRateTimeSeries: Array<{
        date: string;
        exitosas: number;
        vacias: number;
        errores: number;
        tasaExito: number;
      }> = [];

      const totalQueriesAll = expedientesMetrics.reduce((acc, m) => acc + m.totalQueries, 0);
      const totalSuccessAll = expedientesMetrics.reduce((acc, m) => acc + m.successfulQueries, 0);
      const globalSuccessRate = Number(((totalSuccessAll / (totalQueriesAll || 1)) * 100).toFixed(1));
      const avgResponseTimeMs = latencyTimeSeries.length
        ? Math.round(latencyTimeSeries.reduce((acc, p) => acc + p.totalLatencyMs, 0) / latencyTimeSeries.length)
        : 0;
      const avgNeonLatencyMs = latencyTimeSeries.length
        ? Math.round(latencyTimeSeries.reduce((acc, p) => acc + p.neonLatencyMs, 0) / latencyTimeSeries.length)
        : 0;
      const totalTokensUsed = expedientesMetrics.reduce((acc, m) => acc + m.totalTokens, 0);
      const totalCostUsd = Number(expedientesMetrics.reduce((acc, m) => acc + m.costUsd, 0).toFixed(2));

      res.json({
        success: true,
        summary: {
          period,
          totalQueries: totalQueriesAll,
          globalSuccessRate,
          avgResponseTimeMs,
          avgNeonLatencyMs,
          totalTokensUsed,
          totalCostUsd,
          expedientesMetrics,
          latencyTimeSeries,
          successRateTimeSeries
        }
      });
    } catch (err: any) {
      console.error('Error en /api/admin/rag-analytics:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  
    })();
  } catch (err: any) {
    console.error('Error en la ruta:', err);
    res.status(err?.status || 500).json({ success: false, error: err?.message || 'Error interno.' });
  }

  return done;
}
