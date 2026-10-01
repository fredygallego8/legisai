import { NextResponse } from 'next/server';
import { retrieve, AiServiceError } from '@/lib/aiService';

export const dynamic = 'force-dynamic';

/**
 * Búsqueda sobre el servicio de IA en Python.
 *
 * Es la ruta nueva, hermana de `/api/rag/search` (que sigue en pie porque dos servicios la llaman
 * con un embedding ya calculado y no con texto). La diferencia no es cosmética: esta ruta manda
 * **texto** y deja que el servicio vectorice, fusione por rango recíproco y opcionalmente rerankee
 * con el cross-encoder. La otra solo compara coseno contra un vector que el cliente calculó.
 *
 * El cuerpo acepta `query` (texto) o, si se necesita comparar contra un embedding ya calculado,
 * `queryEmbedding` con `vectorizar: false` para no gastar una llamada al proveedor.
 *
 * `AI_SERVICE_ENABLED` actúa de interruptor: mientras esté apagado, la ruta responde 503 con el
 * motivo en vez de devolver vacío. Así se puede desplegar el código antes que el servicio y que
 * el fallo sea explícito en vez de un "no encontré nada" que parece un problema de recuperación.
 */
export async function POST(request: Request) {
  // El cuerpo se lee y se valida antes de mirar el interruptor: si falta `query`, el problema es
  // del que llama y hay que decirlo con 400. Comprobar el flag primero devolvía 503 y hacía creer
  // que el servicio estaba apagado cuando en realidad la petición iba mal formada.
  let cuerpo: {
    query?: string;
    top_k?: number;
    modo?: 'vector' | 'lexical' | 'hibrida';
    expediente_id?: string;
    jurisprudencia?: boolean;
    rerank?: boolean;
  };

  try {
    cuerpo = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Cuerpo JSON inválido.', codigo: 'JSON_INVALIDO' },
      { status: 400 },
    );
  }

  if (!cuerpo.query || typeof cuerpo.query !== 'string' || !cuerpo.query.trim()) {
    return NextResponse.json(
      { success: false, error: 'query (texto) es requerido.', codigo: 'QUERY_REQUERIDA' },
      { status: 400 },
    );
  }

  if (String(process.env.AI_SERVICE_ENABLED ?? '').toLowerCase() !== 'true') {
    return NextResponse.json(
      {
        success: false,
        error: 'El servicio de IA está desactivado (AI_SERVICE_ENABLED).',
        codigo: 'AI_SERVICE_DESACTIVADO',
      },
      { status: 503 },
    );
  }

  const modo = cuerpo.modo ?? 'hibrida';

  try {
    // El rerank se pide dentro de la misma llamada, no con una segunda a /rerank. El servicio lo
    // aplica sobre lo que acaba de recuperar, que es justo lo que se quiere, y así se evita
    // mandar los documentos dos veces por la red y reordenar dos veces lo mismo.
    const respuesta = await retrieve({
      query: cuerpo.query,
      top_k: cuerpo.top_k ?? 10,
      modo,
      rerank: cuerpo.rerank === true,
      ...(cuerpo.expediente_id ? { expediente_id: cuerpo.expediente_id } : {}),
      ...(cuerpo.jurisprudencia === undefined ? {} : { jurisprudencia: cuerpo.jurisprudencia }),
    });

    const fragmentos = respuesta.fragmentos;
    // El servicio no dice si pudo rerankear. Se infiere de las puntuaciones: las del cross-encoder
    // van de 0 a 1 con varios decimales, y las de la fusión por rango recíproco son magnitudes
    // pequeñas (1/distancia de rango). No es una prueba, es una pista para el log.
    const rerankAplicado =
      cuerpo.rerank === true &&
      fragmentos.length > 0 &&
      fragmentos.some((f) => typeof f.score === 'number' && f.score > 0.1);

    return NextResponse.json({
      success: true,
      modo,
      recuperados: respuesta.recuperados,
      total: respuesta.total,
      rerankAplicado,
      results: fragmentos,
    });
  } catch (error) {
    if (error instanceof AiServiceError) {
      return NextResponse.json(
        { success: false, error: error.message, codigo: error.codigo },
        { status: error.estado },
      );
    }
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message,
        codigo: 'ERROR_INTERNO',
      },
      { status: 500 },
    );
  }
}