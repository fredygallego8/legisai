import { NextResponse, type NextRequest } from 'next/server';

/**
 * Puerta de entrada: todo exige sesión salvo /login y /api/auth.
 *
 * La sesión se consulta contra el propio /api/auth/get-session (mismo patrón
 * que mebot.online) y además se comprueba la lista blanca de correos.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith('/api/auth') ||
    pathname === '/api/health' ||
    pathname === '/login' ||
    pathname === '/no-autorizado'
  ) {
    return NextResponse.next();
  }

  const sessionRes = await fetch(new URL('/api/auth/get-session', request.url), {
    headers: { cookie: request.headers.get('cookie') || '' },
    cache: 'no-store',
  }).catch(() => null);

  const session = sessionRes && sessionRes.ok ? await sessionRes.json().catch(() => null) : null;

  if (!session?.user) {
    const url = new URL('/login', request.url);
    url.searchParams.set('rd', pathname);
    return NextResponse.redirect(url);
  }

  // Lista blanca: tener sesión de Google NO basta. La app guarda expedientes
  // judiciales, así que solo entran los correos declarados en ALLOWED_EMAILS.
  // Sin la variable configurada se cierra el paso a todo el mundo.
  const allowed = (process.env.ALLOWED_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const email = String(session.user.email || '').toLowerCase();
  if (!email || !allowed.includes(email)) {
    const url = new URL('/login', request.url);
    url.searchParams.set('error', 'forbidden');
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
