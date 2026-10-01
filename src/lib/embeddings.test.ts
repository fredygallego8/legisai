import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import {
  EMBEDDING_DIMENSIONS,
  estadoEmbeddings,
  generateEmbedding,
  modeloDeEmbeddings,
  proveedorDeEmbeddings,
} from './embeddings';

// El punto delicado de este módulo no es llamar a un proveedor: es que un vector de otra
// dimensión o de otro modelo no rompa nada y degrade la búsqueda en silencio. Eso es lo que se
// prueba aquí.

const entornoOriginal = { ...process.env };

function vector(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i / 1000);
}

beforeEach(() => {
  process.env = { ...entornoOriginal };
});

afterEach(() => {
  process.env = { ...entornoOriginal };
  mock.restore();
});

describe('proveedor y modelo', () => {
  it('por defecto usa Gemini', () => {
    delete process.env.EMBEDDING_PROVIDER;
    expect(proveedorDeEmbeddings()).toBe('gemini');
    expect(modeloDeEmbeddings()).toBe('gemini-embedding-2-preview');
  });

  it('con EMBEDDING_PROVIDER=openrouter usa el modelo de OpenAI', () => {
    process.env.EMBEDDING_PROVIDER = 'openrouter';
    expect(proveedorDeEmbeddings()).toBe('openrouter');
    expect(modeloDeEmbeddings()).toBe('openai/text-embedding-3-small');
  });

  it('acepta mayúsculas y espacios', () => {
    process.env.EMBEDDING_PROVIDER = ' OpenRouter ';
    expect(proveedorDeEmbeddings()).toBe('openrouter');
  });

  it('un proveedor desconocido falla en vez de caer a Gemini en silencio', () => {
    process.env.EMBEDDING_PROVIDER = 'deepsek';
    expect(() => proveedorDeEmbeddings()).toThrow(/desconocido/);
  });

  it('EMBEDDING_MODEL permite forzar otro modelo del mismo proveedor', () => {
    process.env.EMBEDDING_PROVIDER = 'openrouter';
    process.env.EMBEDDING_MODEL = 'openai/text-embedding-3-large';
    expect(modeloDeEmbeddings()).toBe('openai/text-embedding-3-large');
  });

  it('estadoEmbeddings no filtra claves', () => {
    process.env.EMBEDDING_PROVIDER = 'openrouter';
    process.env.OPENROUTER_API_KEY = 'clave-secreta-que-no-debe-salir';
    const estado = estadoEmbeddings();
    expect(estado.proveedor).toBe('openrouter');
    expect(estado.dimensiones).toBe(768);
    expect(estado.configurado).toBe(true);
    expect(JSON.stringify(estado)).not.toContain('clave-secreta');
  });
});

describe('generateEmbedding con OpenRouter', () => {
  beforeEach(() => {
    process.env.EMBEDDING_PROVIDER = 'openrouter';
    process.env.OPENROUTER_API_KEY = 'clave-de-prueba';
  });

  it('pide 768 dimensiones explícitamente y devuelve el vector', async () => {
    let cuerpo: any = null;
    let url = '';
    // @ts-ignore: se sustituye fetch solo durante la prueba
    globalThis.fetch = async (destino: string, opciones: any) => {
      url = String(destino);
      cuerpo = JSON.parse(opciones.body);
      return new Response(JSON.stringify({ data: [{ embedding: vector(768) }] }), { status: 200 });
    };

    const v = await generateEmbedding('medida cautelar de embargo');
    expect(v).toHaveLength(EMBEDDING_DIMENSIONS);
    expect(cuerpo.dimensions).toBe(768);
    expect(cuerpo.model).toBe('openai/text-embedding-3-small');
    expect(cuerpo.input).toBe('medida cautelar de embargo');
    expect(url).toContain('/embeddings');
  });

  it('rechaza un vector de 1536 dimensiones en vez de escribirlo', async () => {
    // @ts-ignore
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ data: [{ embedding: vector(1536) }] }), { status: 200 });
    await expect(generateEmbedding('x')).rejects.toThrow(/1536 dimensiones/);
  });

  it('propaga el error del proveedor con el código', async () => {
    // @ts-ignore
    globalThis.fetch = async () => new Response('{"error":"rate limited"}', { status: 429 });
    await expect(generateEmbedding('x')).rejects.toThrow(/429/);
  });

  it('falla si la respuesta trae un error aunque el HTTP sea 200', async () => {
    // @ts-ignore
    globalThis.fetch = async () => new Response(JSON.stringify({ error: { message: 'sin saldo' } }), { status: 200 });
    await expect(generateEmbedding('x')).rejects.toThrow(/sin saldo|error/i);
  });

  it('sin clave del proveedor falla con un mensaje que dice cuál falta', async () => {
    delete process.env.OPENROUTER_API_KEY;
    await expect(generateEmbedding('x')).rejects.toThrow(/OPENROUTER_API_KEY/);
  });

  it('no llama al proveedor con texto vacío', async () => {
    let llamado = false;
    // @ts-ignore
    globalThis.fetch = async () => { llamado = true; return new Response('{}', { status: 200 }); };
    await expect(generateEmbedding('   ')).rejects.toThrow(/vacío/);
    expect(llamado).toBe(false);
  });
});

describe('generateEmbedding con Gemini', () => {
  it('sin GEMINI_API_KEY falla antes de salir a la red', async () => {
    process.env.EMBEDDING_PROVIDER = 'gemini';
    delete process.env.GEMINI_API_KEY;
    await expect(generateEmbedding('x')).rejects.toThrow(/GEMINI_API_KEY/);
  });
});
