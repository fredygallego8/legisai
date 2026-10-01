import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Liveness público. A propósito NO importa @google/genai ni toca la base de
 * datos: debe responder aunque el resto de dependencias fallen.
 */
export async function GET() {
  // El proveedor de embeddings se lee de las variables de entorno, no del módulo que los
  // implementa: este endpoint debe responder aunque la librería del proveedor no cargue.
  const proveedorEmbeddings = String(process.env.EMBEDDING_PROVIDER || 'gemini').trim().toLowerCase();
  const claveEmbeddings = proveedorEmbeddings === 'openrouter'
    ? Boolean(process.env.OPENROUTER_API_KEY)
    : Boolean(process.env.GEMINI_API_KEY);

  return NextResponse.json({
    ok: true,
    auth: 'better-auth',
    gemini: Boolean(process.env.GEMINI_API_KEY),
    embeddings: { proveedor: proveedorEmbeddings, configurado: claveEmbeddings },
    db: Boolean(process.env.DATABASE_URL),
  });
}