/**
 * Cliente HTTP del frontend.
 *
 * TODAS las llamadas a /api/* pasan por aquí. La autenticación es por cookie
 * de sesión de better-auth: no hay token que adjuntar, basta con llamar al
 * mismo origen.
 */

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

function isApiPath(input: string): boolean {
  return input.startsWith('/api/');
}

/**
 * fetch con autenticación. Devuelve la Response cruda para poder usarla
 * como reemplazo directo de fetch en el código existente.
 */
export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers || {});

  if (isApiPath(input)) {
    if (init.body && !headers.has('Content-Type') && typeof init.body === 'string') {
      headers.set('Content-Type', 'application/json');
    }
  }

  return fetch(input, { ...init, headers });
}

/**
 * Igual que apiFetch pero lanza ApiError si la respuesta no es 2xx.
 */
export async function apiJson<T = any>(input: string, init: RequestInit = {}): Promise<T> {
  const res = await apiFetch(input, init);
  const raw = await res.text();
  let parsed: any = null;
  if (raw) {
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = null;
    }
  }

  if (!res.ok) {
    throw new ApiError(
      parsed?.error || `La petición a ${input} falló con HTTP ${res.status}.`,
      res.status,
      parsed?.code,
    );
  }
  return (parsed ?? {}) as T;
}

/**
 * Consume un endpoint SSE (text/event-stream) y emite los fragmentos de texto.
 */
export async function* apiStream(
  input: string,
  init: RequestInit = {},
): AsyncGenerator<string> {
  const res = await apiFetch(input, init);

  if (!res.ok) {
    const raw = await res.text();
    let parsed: any = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = null;
    }
    throw new ApiError(
      parsed?.error || `El streaming a ${input} falló con HTTP ${res.status}.`,
      res.status,
      parsed?.code,
    );
  }

  if (!res.body) {
    throw new ApiError('La respuesta no incluye cuerpo para leer el streaming.', res.status);
  }

  // El servidor puede haber terminado devolviendo JSON en lugar de SSE.
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('text/event-stream')) {
    const json = await res.json().catch(() => null);
    if (json?.text) {
      yield json.text;
      return;
    }
    throw new ApiError('El servidor no devolvió un stream de eventos.', res.status);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let sawData = false;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const data = trimmed.slice(5).trim();
        if (data === '[DONE]') return;
        if (!data) continue;

        sawData = true;
        try {
          const parsed = JSON.parse(data);
          if (parsed?.error) {
            throw new ApiError(parsed.error, res.status, parsed.code);
          }
          if (parsed?.text) yield parsed.text;
        } catch (err) {
          if (err instanceof ApiError) throw err;
          yield data;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  if (!sawData) {
    throw new ApiError('El stream terminó sin contenido.', res.status);
  }
}
