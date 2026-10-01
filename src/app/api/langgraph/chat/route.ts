import type { NextRequest } from 'next/server';
import { requireSession } from '@/lib/roles';
import { modeloUsado, runGraph } from '@/lib/langgraph';

export const dynamic = 'force-dynamic';

/**
 * Chat sobre la máquina de estados (Brecha 1).
 *
 * A diferencia de las rutas portadas del portal anterior, esta es nueva y responde con
 * `Response.json` en vez de pasar por `httpShim`: no hay un cuerpo de Express que reutilizar.
 *
 * El `user.id` de la sesión es el `owner_id` que se guarda en cada checkpoint. El `middleware.ts`
 * ya exige sesión para llegar aquí, pero una sesión válida no dice de quién es un `thread_id`:
 * sin el dueño en la fila, cualquiera autenticado podría leer el contexto y la respuesta de otro.
 */
export async function POST(request: NextRequest) {
  const { session, error } = await requireSession();
  if (!session) {
    return (
      error ??
      Response.json({ success: false, error: 'No autenticado.', code: 'UNAUTHENTICATED' }, { status: 401 })
    );
  }

  const cuerpo = (await request.json().catch(() => ({}))) as any;
  const consulta =
    typeof cuerpo?.consulta === 'string'
      ? cuerpo.consulta
      : typeof cuerpo?.message === 'string'
        ? cuerpo.message
        : '';
  if (!consulta.trim()) {
    return Response.json(
      { success: false, error: 'Falta el campo `consulta`.', code: 'BAD_REQUEST' },
      { status: 400 },
    );
  }

  // Sin thread_id se abre un hilo nuevo; con uno existente y `resume`, el grafo sigue donde se quedó.
  const threadId =
    typeof cuerpo?.thread_id === 'string' && cuerpo.thread_id.trim()
      ? cuerpo.thread_id.trim()
      : crypto.randomUUID();

  try {
    const estado = await runGraph(consulta, threadId, session.user.id, {
      reanudar: cuerpo?.resume === true,
      expedienteId: typeof cuerpo?.expedienteId === 'string' ? cuerpo.expedienteId : undefined,
    });

    return Response.json(
      {
        success: !estado.error,
        text: estado.answer ?? '',
        thread_id: estado.thread_id,
        step: estado.step,
        query_type: estado.query_type,
        confidence: estado.confidence,
        verify_retries: estado.verify_retries ?? 0,
        // `no_guardado` avisa de que la respuesta existe pero no se podrá reanudar el hilo.
        checkpoint: estado.checkpoint_error ? 'no_guardado' : 'ok',
        model: modeloUsado(),
        ...(estado.error ? { error: estado.error, code: 'GRAPH_STEP_FAILED' } : {}),
      },
      { status: estado.error ? 502 : 200 },
    );
  } catch (err: any) {
    console.error('Error en /api/langgraph/chat:', err);
    return Response.json(
      { success: false, error: `No se pudo obtener respuesta del modelo: ${err?.message}`, code: 'LLM_UNAVAILABLE' },
      { status: 502 },
    );
  }
}
