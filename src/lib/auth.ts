import { betterAuth } from 'better-auth';
import { admin } from 'better-auth/plugins';
import { Pool } from 'pg';

// Mismo patrón que mebot.online y ferreteriaelhogar.com: better-auth sobre
// Postgres con el proveedor social de Google.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 1,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000,
});

export const auth = betterAuth({
  database: pool,
  baseURL: process.env.BETTER_AUTH_URL || 'https://ailaw.mebot.online',
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: [
    process.env.BETTER_AUTH_URL || 'https://ailaw.mebot.online',
    'http://localhost:3000',
  ],
  user: { modelName: 'ba_user' },
  session: { modelName: 'ba_session' },
  account: { modelName: 'ba_account' },
  verification: { modelName: 'ba_verification' },
  roles: {
    admin: {},
    user: {},
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  plugins: [admin({ defaultRole: 'user', adminRoles: ['admin'] })],
  // get-session se consulta en cada navegación desde el middleware: si
  // compartiera el bucket global (100 req/ventana), el usuario sería expulsado
  // con 429. La clave va SIN el prefijo /api/auth (normalizePathname lo pela
  // con basePath antes de comparar en resolveRateLimitConfig).
  rateLimit: { customRules: { '/get-session': false } },
});

export type AuthSession = typeof auth.$Infer.Session;
export type AuthUser = AuthSession['user'] & { role?: string };

/**
 * Lista blanca de correos. Son los mismos que ya entran en castillo-bot /
 * castillo-erp vía oauth2-proxy. Sin esto, cualquier cuenta de Google podría
 * crear sesión: la app guarda expedientes judiciales.
 */
export function getAllowedEmails(): string[] {
  return (process.env.ALLOWED_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isEmailAllowed(email: string | undefined | null): boolean {
  const allowed = getAllowedEmails();
  if (allowed.length === 0) return false; // falla en cerrado
  return Boolean(email) && allowed.includes(String(email).toLowerCase());
}
