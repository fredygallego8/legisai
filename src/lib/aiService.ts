/**
 * Cliente del servicio de IA en Python (LegisAI AI Service).
 *
 * La web no reimplementa el retrieval: lo pide a la FastAPI, que es quien lo tiene probado. Este
 * módulo es el único que habla con ella, para que el token interno no se disperse por las rutas y
 * el contrato se cambie en un sitio.
 *
 * Dos reglas que este módulo no rompe:
 *
 * 1. El token **nunca** va al navegador. Solo se lee en el servidor, y las rutas de API lo reenvían
 *    en el header. `AI_SERVICE_TOKEN` no lleva el prefijo `NEXT_PUBLIC_` justamente por esto: con él,
 *    Next lo incrustaría en el bundle y cualquiera podría leerlo desde el navegador.
 * 2. Si falta configuración, se falla al llamar y se dice qué falta, en vez de devolver un vacío
 *    silencioso que después parece un problema de recuperación. Es la misma postura que
 *    `getDb()` en `lib/db.ts`, y la que el propio servicio aplica en `/ready`.
 *
 * Contrato: `GET /openapi.json` del servicio. Los tipos de abajo reflejan lo que publica hoy.
 */

// Se leen en cada llamada, no al importar el módulo: las variables de entorno pueden fijarse
// después de cargarlo (en pruebas, y también cuando Next las inyecta en caliente). Leerlas una
// sola vez arriba dejaba el cliente con un valor congelado y sin poder reconfigurarse.
function entorno(): { url?: string; token?: string; timeoutMs: number } {
  return {
    url: process.env.AI_SERVICE_URL,
    token: process.env.AI_SERVICE_TOKEN,
    timeoutMs: Number(process.env.AI_SERVICE_TIMEOUT_MS ?? 15_000),
  };
}

/** Lo que devuelve el servicio cuando algo falla. La forma está congelada por sus pruebas. */
interface ErrorDelServicio {
  error: { code: string; mensaje: string };
}

export interface Fragmento {
  // El servicio define el resto de campos del fragmento; solo se reaffirman los que usa la web.
  texto?: string;
  puntuacion?: number;
  [clave: string]: unknown;
}

export interface RespuestaRetrieve {
  modo: string;
  total: number;
  recuperados: number;
  fragmentos: Fragmento[];
}

export interface RespuestaRerank {
  [clave: string]: unknown;
}

export interface RespuestaEmbed {
  model: string;
  dimensions: number;
  values: number[];
}

/**
 * Error del servicio, con su código intacto.
 *
 * Se distingue de un fallo de red a propósito: si la IA no está desplegada es un problema de
 * despliegue; si responde `DATABASE_URL_NO_CONFIGURADA` es que falta la base; si responde
 * `TOKEN_INTERNO_NO_CONFIGURADO` es que el token no coincide. Sin el código, los tres se ven
 * iguales desde la web y se depuran a ciegas.
 */
export class AiServiceError extends Error {
  readonly codigo: string;
  readonly estado: number;

  constructor(codigo: string, mensaje: string, estado: number) {
    super(mensaje);
    this.name = 'AiServiceError';
    this.codigo = codigo;
    this.estado = estado;
  }
}

function configuracion(): { url: string; token: string; timeoutMs: number } {
  const { url, token, timeoutMs } = entorno();
  if (!url) {
    throw new AiServiceError(
      'AI_SERVICE_URL_NO_CONFIGURADA',
      'No se encontró AI_SERVICE_URL en las variables de entorno.',
      503,
    );
  }
  if (!token) {
    throw new AiServiceError(
      'AI_SERVICE_TOKEN_NO_CONFIGURADO',
      'No se encontró AI_SERVICE_TOKEN. Sin él el servicio responde 503 y no sirve datos.',
      503,
    );
  }
  return { url: url.replace(/\/+$/, ''), token, timeoutMs };
}

async function pedir<T>(ruta: string, cuerpo?: unknown): Promise<T> {
  const { url, token, timeoutMs } = configuracion();
  const control = new AbortController();
  const t = setTimeout(() => control.abort(), timeoutMs);

  try {
    const respuesta = await fetch(`${url}${ruta}`, {
      method: cuerpo === undefined ? 'GET' : 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        ...(cuerpo === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
      signal: control.signal,
      cache: 'no-store',
    });

    const texto = await respuesta.text();
    let cuerpoRespuesta: unknown = null;
    if (texto) {
      try {
        cuerpoRespuesta = JSON.parse(texto);
      } catch {
        // Una respuesta que no es JSON (un 502 de HTML del proxy, por ejemplo) no se pierde:
        // se propaga como error con el estado, que es lo accionable.
        throw new AiServiceError('RESPUESTA_NO_JSON', texto.slice(0, 200), respuesta.status);
      }
    }

    if (!respuesta.ok) {
      const e = cuerpoRespuesta as ErrorDelServicio | null;
      throw new AiServiceError(
        e?.error?.code ?? `HTTP_${respuesta.status}`,
        e?.error?.mensaje ?? `El servicio respondió ${respuesta.status}`,
        respuesta.status,
      );
    }

    return cuerpoRespuesta as T;
  } catch (error) {
    if (error instanceof AiServiceError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new AiServiceError('TIMEOUT', `El servicio no respondió en ${timeoutMs} ms.`, 504);
    }
    throw new AiServiceError(
      'SERVICIO_INALCANZABLE',
      `No se pudo contactar con el servicio de IA: ${(error as Error).message}`,
      503,
    );
  } finally {
    clearTimeout(t);
  }
}

/**
 * Recupera fragmentos. `modo` es `vector`, `lexica` o `hibrida`; la híbrida es la que fusiona por
 * rango recíproco y es la que usa el grafo.
 */
export function retrieve(params: {
  query: string;
  top_k?: number;
  // El contrato admite 'vector', 'lexical' y 'hibrida'. Ojo: es 'lexical' en inglés, no 'lexica';
  // mandarlo mal devuelve 422 VALIDACION y la diferencia se nota tarde.
  modo?: 'vector' | 'lexical' | 'hibrida';
  expediente_id?: string;
  jurisprudencia?: boolean;
  // Rerank con el cross-encoder dentro del retrieval. Va en la misma llamada a propósito: el
  // servicio lo aplica sobre lo que acaba de recuperar, y pedirlo aparte significaria mandar los
  // documentos dos veces por la red.
  rerank?: boolean;
}): Promise<RespuestaRetrieve> {
  return pedir<RespuestaRetrieve>('/retrieve', {
    query: params.query,
    top_k: params.top_k ?? 10,
    modo: params.modo ?? 'hibrida',
    ...(params.expediente_id ? { expediente_id: params.expediente_id } : {}),
    ...(params.jurisprudencia === undefined ? {} : { jurisprudencia: params.jurisprudencia }),
    ...(params.rerank === undefined ? {} : { rerank: params.rerank }),
  });
}

/** Reordena candidatos con el cross-encoder del servicio. */
export function rerank(params: {
  query: string;
  documents: string[];
  top_k?: number;
}): Promise<RespuestaRerank> {
  return pedir<RespuestaRerank>('/rerank', {
    query: params.query,
    documents: params.documents,
    top_k: params.top_k ?? 10,
  });
}

/** Vectoriza con el proveedor del servicio, para que web y API usen el mismo. */
export function embed(texto: string): Promise<RespuestaEmbed> {
  return pedir<RespuestaEmbed>('/embed', { text: texto });
}

/**
 * Estado del servicio, para la ruta de salud.
 *
 * Distingue "no está desplegado" de "está desplegado pero degradado": el segundo caso es el que
 * importa en producción, porque el servicio responde y aun así no puede recuperar.
 */
export async function health(): Promise<{
  desplegado: boolean;
  estado?: string;
  detalle?: unknown;
}> {
  const { url, token, timeoutMs } = configuracion();
  try {
    const respuesta = await fetch(`${url}/ready`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(timeoutMs),
      cache: 'no-store',
    });
    const cuerpo = (await respuesta.json().catch(() => null)) as
      | { status?: string; checks?: unknown }
      | null;
    return {
      desplegado: true,
      estado: cuerpo?.status ?? (respuesta.ok ? 'ok' : 'degraded'),
      detalle: cuerpo?.checks ?? null,
    };
  } catch {
    // Que no esté desplegado es un estado válido, no una excepción que tumbe la ruta de salud.
    return { desplegado: false };
  }
}
