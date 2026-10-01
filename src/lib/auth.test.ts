import { describe, expect, it } from 'bun:test';
import { auth, getAllowedEmails, isEmailAllowed } from './auth';

// get-session se consulta en cada navegación desde el middleware: si
// compartiera el bucket global (100 req/ventana), el usuario sería expulsado
// con 429. better-auth admite `false` en `customRules` para eximir una ruta
// (la clave va sin el prefijo /api/auth).
describe('auth · rateLimit exime /get-session', () => {
  it('desactiva el límite solo en /get-session', () => {
    const customRules = auth.options.rateLimit?.customRules as Record<string, unknown> | undefined;
    expect(customRules?.['/get-session']).toBe(false);
  });
});

describe('auth · lista blanca falla en cerrado', () => {
  it('sin ALLOWED_EMAILS nadie entra', () => {
    const antes = process.env.ALLOWED_EMAILS;
    delete process.env.ALLOWED_EMAILS;
    try {
      expect(getAllowedEmails()).toEqual([]);
      expect(isEmailAllowed('juez@rama.co')).toBe(false);
    } finally {
      if (antes !== undefined) process.env.ALLOWED_EMAILS = antes;
    }
  });

  it('compara sin distinguir mayúsculas y rechaza lo no listado', () => {
    const antes = process.env.ALLOWED_EMAILS;
    process.env.ALLOWED_EMAILS = 'Juez@Rama.Co';
    try {
      expect(isEmailAllowed('juez@rama.co')).toBe(true);
      expect(isEmailAllowed('otro@rama.co')).toBe(false);
    } finally {
      if (antes !== undefined) process.env.ALLOWED_EMAILS = antes;
      else delete process.env.ALLOWED_EMAILS;
    }
  });
});
