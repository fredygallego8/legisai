/**
 * Prueba del cliente contra el servicio real.
 *
 * No reimplementación: estas pruebas ejercitan el mismo `fetch` que usa la web contra un
 * servidor que devuelve lo que el servicio devuelve de verdad —incluidos sus errores— y se
 * comprueba que el código de error sobreviva intacto.
 *
 * Levanta un servidor propio con `node:http`, así que no depende de que la FastAPI esté desplegada
 * ni de que tenga base de datos. Corre con `bun test`, como el resto de la suite.
 */
import { describe, expect, it, beforeAll, afterAll } from 'bun:test';
import { createServer, type Server } from 'node:http';
import { retrieve, health, AiServiceError } from './aiService';

let servidor: Server;
let urlBase: string;

/** Lo que el servicio devuelve en cada caso, copiado de sus respuestas reales. */
const RESPUESTAS: Record<string, { estado: number; cuerpo: unknown }> = {
  '/retrieve': {
    estado: 503,
    cuerpo: {
      error: {
        code: 'DATABASE_URL_NO_CONFIGURADA',
        mensaje: 'no hay base de datos configurada: la recuperación no puede ejecutarse',
      },
    },
  },
  '/ready': {
    estado: 503,
    cuerpo: {
      status: 'degraded',
      checks: { database: { ok: false, detalle: { error: 'DATABASE_URL no configurada' } } },
    },
  },
};

/** Peticiones recibidas, para comprobar el header del token. */
let cabecerasRecibidas: Record<string, string | undefined>[] = [];

/** Último cuerpo JSON recibido, para comprobar lo que el cliente envía y no solo lo que recibe. */
let ultimoCuerpo: unknown = null;

/** Ejecuta `accion` y devuelve el cuerpo que el servidor llegó a recibir. */
async function cuerpoDe(accion: () => Promise<unknown>): Promise<any> {
  ultimoCuerpo = null;
  await accion().catch(() => undefined);
  return ultimoCuerpo;
}

beforeAll(async () => {
  servidor = createServer((peticion, respuesta) => {
    cabecerasRecibidas.push(peticion.headers as Record<string, string | undefined>);
    // El cuerpo se lee antes de responder: si se contesta de inmediato, el evento 'end' puede
    // llegar despues de que la prueba mire `ultimoCuerpo` y lo veria null.
    let datos = '';
    peticion.on('data', (trozo) => {
      datos += trozo;
    });
    peticion.on('end', () => {
      if (datos) {
        try {
          ultimoCuerpo = JSON.parse(datos);
        } catch {
          ultimoCuerpo = datos;
        }
      }
      const definicion = RESPUESTAS[peticion.url ?? ''];
      if (!definicion) {
        respuesta.writeHead(404).end('{}');
        return;
      }
      respuesta
        .writeHead(definicion.estado, { 'Content-Type': 'application/json' })
        .end(JSON.stringify(definicion.cuerpo));
    });
    return;
    const definicion = RESPUESTAS[peticion.url ?? ''];
    if (!definicion) {
      respuesta.writeHead(404).end('{}');
      return;
    }
    respuesta
      .writeHead(definicion.estado, { 'Content-Type': 'application/json' })
      .end(JSON.stringify(definicion.cuerpo));
  });
  await new Promise<void>((resolver) => servidor.listen(0, '127.0.0.1', resolver));
  const direccion = servidor.address();
  const puerto = typeof direccion === 'object' && direccion ? direccion.port : 0;
  urlBase = `http://127.0.0.1:${puerto}`;
  process.env.AI_SERVICE_URL = urlBase;
  process.env.AI_SERVICE_TOKEN = 'token-de-prueba-123';
});

afterAll(async () => {
  await new Promise<void>((resolver) => servidor.close(() => resolver()));
});

describe('cliente del servicio de IA', () => {
  it('manda el token interno en el header Authorization', async () => {
    cabecerasRecibidas = [];
    await retrieve({ query: 'prescripción' }).catch(() => undefined);
    expect(cabecerasRecibidas[0]?.authorization).toBe('Bearer token-de-prueba-123');
  });

  it('conserva el código de error del servicio en vez de un error genérico', async () => {
    // Sin esto, "no hay base" y "el servicio no está desplegado" se verían iguales desde la web.
    await expect(retrieve({ query: 'prescripción' })).rejects.toMatchObject({
      codigo: 'DATABASE_URL_NO_CONFIGURADA',
      estado: 503,
    });
  });

  it('el error que lanza es AiServiceError, para poder distinguirlo', async () => {
    const error = await retrieve({ query: 'x' }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AiServiceError);
  });

  it('health() informa "desplegado pero degradado", no "todo bien"', async () => {
    // El caso que importa en produccion: el servicio responde y aun así no puede recuperar.
    const estado = await health();
    expect(estado.desplegado).toBe(true);
    expect(estado.estado).toBe('degraded');
  });

  it('envía "hibrida" por defecto, el único modo que fusiona por rango recíproco', async () => {
    // Si el valor por defecto cambiara, el retrieval dejaría de ser híbrido sin que nada lo note, y
    // las métricas de recall se compararían contra otro sistema. Se fija a propósito.
    const recibido = await cuerpoDe(() => retrieve({ query: 'plazo' }));
    expect(recibido).toMatchObject({ modo: 'hibrida' });
  });

  it('propaga "lexical" tal cual; el contrato lo exige en inglés', async () => {
    // Se descubrió contra el servicio real: mandar 'lexica' devuelve 422 VALIDACION. El tipo de
    // TypeScript lo impide, pero esta prueba fija que el valor viaje sin traducir.
    const recibido = await cuerpoDe(() => retrieve({ query: 'plazo', modo: 'lexical' }));
    expect(recibido).toMatchObject({ modo: 'lexical' });
  });
});
