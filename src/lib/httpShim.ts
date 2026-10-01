import type { NextRequest } from 'next/server';

/**
 * Adaptador Express -> Next route handler.
 *
 * Los route handlers de src/app/api/** se generaron a partir del servidor
 * Express ya verificado (server.ts del portal anterior). Para poder reutilizar
 * esos cuerpos sin reescribirlos, este módulo expone una superficie mínima
 * compatible con (req, res) de Express.
 */
export interface ShimReq {
  body: any;
  params: Record<string, string>;
  query: Record<string, string>;
  headers: Record<string, string | undefined>;
  method: string;
  header(name: string): string | undefined;
}

export interface ShimRes {
  status(code: number): ShimRes;
  json(payload: any): ShimRes;
  send(payload: any): ShimRes;
  setHeader(name: string, value: string): void;
  statusCode: number;
}

export interface Shim {
  req: ShimReq;
  res: ShimRes;
  /** Resuelve a la Response que Next devolverá. */
  done: Promise<Response>;
}

export async function makeReqRes(
  request: NextRequest,
  params: Record<string, string> = {},
): Promise<Shim> {
  const url = new URL(request.url);

  let body: any = {};
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const raw = await request.text().catch(() => '');
    if (raw) {
      try {
        body = JSON.parse(raw);
      } catch {
        body = {};
      }
    }
  }

  const headers: Record<string, string | undefined> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  const req: ShimReq = {
    body,
    params,
    query: Object.fromEntries(url.searchParams.entries()),
    headers,
    method: request.method,
    header: (name: string) => request.headers.get(name) ?? undefined,
  };

  let statusCode = 200;
  let resolveDone: (r: Response) => void;
  const done = new Promise<Response>((resolve) => {
    resolveDone = resolve;
  });

  const responseHeaders = new Headers();
  let settled = false;

  const finish = (payload: any, isJson: boolean) => {
    if (settled) return res;
    settled = true;
    const out = isJson ? JSON.stringify(payload) : String(payload ?? '');
    if (isJson) responseHeaders.set('Content-Type', 'application/json; charset=utf-8');
    resolveDone(new Response(out, { status: statusCode, headers: responseHeaders }));
    return res;
  };

  const res: ShimRes = {
    statusCode: 200,
    status(code: number) {
      statusCode = code;
      res.statusCode = code;
      return res;
    },
    json(payload: any) {
      return finish(payload, true);
    },
    send(payload: any) {
      return finish(payload, typeof payload === 'object');
    },
    setHeader(name: string, value: string) {
      responseHeaders.set(name, value);
    },
  };

  return { req, res, done };
}
