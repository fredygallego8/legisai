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
      const { expedienteId } = req.query;

      let rows;
      if (expedienteId) {
        rows = await sql`SELECT * FROM documentos WHERE expediente_id = ${expedienteId as string} ORDER BY created_at DESC;`;
      } else {
        rows = await sql`SELECT * FROM documentos ORDER BY created_at DESC;`;
      }

      const documentos = rows.map((r: any) => ({
        id: r.id,
        expedienteId: r.expediente_id,
        name: r.name,
        type: r.type,
        size: Number(r.size),
        uploadDate: r.upload_date,
        uploadedBy: r.uploaded_by,
        securityHash: r.security_hash,
        pagesCount: r.pages_count,
        originZip: r.origin_zip || undefined,
        extractedContent: r.extracted_content || '',
        status: r.status,
        summary: r.summary || undefined,
        tags: Array.isArray(r.tags) ? r.tags : []
      }));

      res.json({ success: true, documentos });
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
      const docs = Array.isArray(req.body) ? req.body : [req.body];
      const now = Date.now();

      for (const doc of docs) {
        await sql`
          INSERT INTO documentos (
            id, expediente_id, name, type, size, upload_date, uploaded_by, 
            security_hash, pages_count, origin_zip, extracted_content, status, 
            summary, tags, created_at
          ) VALUES (
            ${doc.id}, ${doc.expedienteId || null}, ${doc.name}, ${doc.type}, 
            ${doc.size || 0}, ${doc.uploadDate || ''}, ${doc.uploadedBy || 'Abogado Titular'}, 
            ${doc.securityHash || 'SHA-256'}, ${doc.pagesCount || 1}, 
            ${doc.originZip || null}, ${doc.extractedContent || ''}, 
            ${doc.status || 'processed'}, ${doc.summary || null}, 
            ${JSON.stringify(doc.tags || [])}, ${now}
          )
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            expediente_id = EXCLUDED.expediente_id,
            size = EXCLUDED.size,
            origin_zip = EXCLUDED.origin_zip,
            extracted_content = EXCLUDED.extracted_content,
            status = EXCLUDED.status,
            summary = EXCLUDED.summary,
            tags = EXCLUDED.tags;
        `;
      }

      res.json({ success: true, count: docs.length });
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
