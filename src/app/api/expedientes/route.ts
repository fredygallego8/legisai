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
      const includeArchived = req.query.includeArchived === 'true';

      let rows;
      if (includeArchived) {
        rows = await sql`SELECT * FROM expedientes ORDER BY created_at DESC;`;
      } else {
        rows = await sql`SELECT * FROM expedientes WHERE is_archived = FALSE ORDER BY created_at DESC;`;
      }

      const expedientes = rows.map((r: any) => ({
        id: r.id,
        radicado: r.radicado,
        titulo: r.titulo,
        demandante: r.demandante,
        demandado: r.demandado,
        despacho: r.despacho,
        tipoProceso: r.tipo_proceso,
        estado: r.estado,
        isArchived: r.is_archived,
        archivedAt: r.archived_at ? Number(r.archived_at) : undefined,
        archiveReason: r.archive_reason || undefined,
        cuantia: r.cuantia || undefined,
        fechaInicio: r.fecha_inicio || '',
        temaJuridico: r.tema_juridico || undefined,
        createdAt: Number(r.created_at || Date.now()),
        updatedAt: Number(r.updated_at || Date.now())
      }));

      res.json({ success: true, expedientes });
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
      const exp = req.body;
      const now = Date.now();

      await sql`
        INSERT INTO expedientes (
          id, radicado, titulo, demandante, demandado, despacho, tipo_proceso, 
          estado, is_archived, archived_at, archive_reason, cuantia, fecha_inicio, 
          tema_juridico, created_at, updated_at
        ) VALUES (
          ${exp.id}, ${exp.radicado}, ${exp.titulo}, ${exp.demandante}, 
          ${exp.demandado}, ${exp.despacho}, ${exp.tipoProceso}, 
          ${exp.estado || 'En Trámite'}, ${!!exp.isArchived}, 
          ${exp.archivedAt || null}, ${exp.archiveReason || null}, 
          ${exp.cuantia || null}, ${exp.fechaInicio || ''}, 
          ${exp.temaJuridico || null}, ${exp.createdAt || now}, ${now}
        )
        ON CONFLICT (id) DO UPDATE SET
          radicado = EXCLUDED.radicado,
          titulo = EXCLUDED.titulo,
          demandante = EXCLUDED.demandante,
          demandado = EXCLUDED.demandado,
          despacho = EXCLUDED.despacho,
          tipo_proceso = EXCLUDED.tipo_proceso,
          estado = EXCLUDED.estado,
          is_archived = EXCLUDED.is_archived,
          archived_at = EXCLUDED.archived_at,
          archive_reason = EXCLUDED.archive_reason,
          cuantia = EXCLUDED.cuantia,
          fecha_inicio = EXCLUDED.fecha_inicio,
          tema_juridico = EXCLUDED.tema_juridico,
          updated_at = ${now};
      `;

      res.json({ success: true, expediente: exp });
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
