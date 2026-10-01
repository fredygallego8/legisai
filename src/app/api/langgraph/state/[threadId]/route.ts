import type { NextRequest } from 'next/server';
import { requireSession } from '@/lib/roles';
import { pasosDelHilo } from '@/lib/langgraph';

export const dynamic = 'force-dynamic';

/**
 * Trazabilidad de un hilo: el estado guardado tras cada nodo, en orden.
 *
 * El `thread_id` viene por URL, o sea que es un identificador manipulable. Por eso la lectura va
 * filtrada por `owner_id`: un hilo de otra persona responde 404, no 403, para no confirmar que
 * ese hilo existe.
 */
export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ threadId: string }> },
) {
  const { session, error } = await requireSession();
  if (!session) {
    return (
      error ??
      Response.json({ success: false, error: 'No autenticado.', code: 'UNAUTHENTICATED' }, { status: 401 })
    );
  }

  const { threadId } = await ctx.params;

  try {
    const pasos = await pasosDelHilo(String(threadId || ''), session.user.id);
    if (!pasos.length) {
      return Response.json(
        { success: false, error: 'Hilo inexistente.', code: 'NOT_FOUND' },
        { status: 404 },
      );
    }
    return Response.json({ success: true, thread_id: threadId, total: pasos.length, pasos });
  } catch (err: any) {
    console.error('Error en /api/langgraph/state:', err);
    return Response.json(
      { success: false, error: err?.message || 'No se pudo leer el historial.', code: 'DB_UNAVAILABLE' },
      { status: 500 },
    );
  }
}
