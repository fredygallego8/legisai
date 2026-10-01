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
      const { id: expedienteId } = req.params;
      const hitos = await sql`SELECT * FROM hitos_procesales WHERE expediente_id = ${expedienteId} ORDER BY fecha ASC;`;
      
      // Análisis de vencimientos con el modelo, vía la capa server-side.
      const prompt = `Analiza estos hitos procesales y compáralos con el CGP para identificar vencimientos.
      Devuelve una tabla Markdown con: Hito, Fecha, Estado (Vencido/Próximo), Observaciones Legales (CGP).
      No inventes hitos ni fechas que no aparezcan en la lista.
      Hitos: ${JSON.stringify(hitos)}`;

      const table = await generateFromPrompt(
        prompt,
        'Eres un analista procesal colombiano experto en el Código General del Proceso.',
      );

      res.json({ success: true, table });
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
