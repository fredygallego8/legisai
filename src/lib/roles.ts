import { auth, type AuthUser } from '@/lib/auth';

import { headers } from 'next/headers';

/** Sesión actual (servidor). Devuelve null si no hay sesión válida. */
export async function getSession() {
  const hdrs = await headers();
  const session = await auth.api.getSession({ headers: hdrs });
  if (!session) return null;
  return { ...session, user: session.user as AuthUser };
}

export const checkRole = async (role: string): Promise<boolean> =>
  (await getSession())?.user?.role === role;

export const getRole = async (): Promise<string | undefined> =>
  (await getSession())?.user?.role;

/**
 * Guard para los route handlers: 401 si no hay sesión, 403 si el correo no
 * está en la lista blanca.
 */
export async function requireSession() {
  const session = await getSession();
  if (!session) {
    return { session: null, error: Response.json(
      { success: false, error: 'No autenticado.', code: 'UNAUTHENTICATED' },
      { status: 401 },
    ) };
  }
  const { isEmailAllowed } = await import('@/lib/auth');
  if (!isEmailAllowed(session.user?.email)) {
    return { session: null, error: Response.json(
      { success: false, error: 'Esta cuenta no tiene acceso a LegisAI.', code: 'FORBIDDEN' },
      { status: 403 },
    ) };
  }
  return { session, error: null };
}
