import { describe, expect, it } from 'vitest';
import {
  applySessionPersistence,
  clearSiteDataFor,
  DEFAULT_EPHEMERAL_SESSION_MAX_AGE_SECS,
  evaluateSessionLifetime,
  resolveEphemeralMaxAgeSecs,
  resolveSessionPersistence,
  sessionAuthenticatedAt,
} from '@/lib/auth/session-policy';

/**
 * G100 — política de sesión «sin rastro». Todo puro: la matriz completa sin
 * tocar cookies ni red. La verificación por EFECTO (cookies reales, Auth real)
 * vive en `scripts/g100/session-probe.ts`.
 */

/** Un JWT con el payload dado. La firma no importa: aquí solo se decodifica
 *  (la valida `getUser()` antes, en el middleware). */
function jwt(payload: unknown): string {
  const enc = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
  return `${enc({ alg: 'ES256', typ: 'JWT' })}.${enc(payload)}.firma`;
}

describe('interruptor: el default es EFÍMERO', () => {
  it.each([
    [undefined, 'ephemeral'],
    [null, 'ephemeral'],
    ['', 'ephemeral'],
    ['false', 'ephemeral'],
    ['TRUE', 'ephemeral'],
    ['1', 'ephemeral'],
    ['yes', 'ephemeral'],
    ['true', 'persistent'],
    [' true ', 'persistent'],
  ] as const)('NEXT_PUBLIC_PERSISTENT_SESSIONS=%j ⇒ %s', (raw, expected) => {
    expect(resolveSessionPersistence(raw)).toBe(expected);
  });
});

describe('cookies: en modo efímero mueren con el navegador', () => {
  const WRITE = { httpOnly: true, sameSite: 'lax' as const, path: '/', maxAge: 400 * 24 * 3600 };

  it('se quitan maxAge y expires de una escritura normal', () => {
    const out = applySessionPersistence(
      { ...WRITE, expires: new Date(Date.now() + 86_400_000) },
      'ephemeral'
    );
    expect(out.maxAge).toBeUndefined();
    expect(out.expires).toBeUndefined();
    // Lo demás de G65 se conserva intacto.
    expect(out).toMatchObject({ httpOnly: true, sameSite: 'lax', path: '/' });
  });

  it('un BORRADO (maxAge 0) se respeta: si no, quedaría una cookie vacía viva', () => {
    expect(applySessionPersistence({ ...WRITE, maxAge: 0 }, 'ephemeral').maxAge).toBe(0);
  });

  it('un borrado por expires en el pasado también se respeta', () => {
    const past = new Date(0);
    expect(applySessionPersistence({ path: '/', expires: past }, 'ephemeral').expires).toBe(past);
  });

  it('control: en modo persistente la escritura conserva sus 400 días', () => {
    expect(applySessionPersistence(WRITE, 'persistent').maxAge).toBe(WRITE.maxAge);
  });
});

describe('hora de autenticación (claim amr)', () => {
  it('lee el timestamp de amr', () => {
    expect(
      sessionAuthenticatedAt(jwt({ iat: 2000, amr: [{ method: 'password', timestamp: 1000 }] }))
    ).toBe(1000);
  });

  it('NO usa iat: el iat cambia en cada refresco y volvería eterna la sesión', () => {
    expect(sessionAuthenticatedAt(jwt({ iat: 2000 }))).toBeNull();
  });

  it('con varias autenticaciones toma la más reciente', () => {
    expect(
      sessionAuthenticatedAt(
        jwt({
          amr: [
            { method: 'password', timestamp: 1000 },
            { method: 'totp', timestamp: 1500 },
          ],
        })
      )
    ).toBe(1500);
  });

  it('un payload con acentos no rompe la decodificación', () => {
    expect(
      sessionAuthenticatedAt(
        jwt({ user_metadata: { nombre: 'Ángel Núñez' }, amr: [{ method: 'otp', timestamp: 42 }] })
      )
    ).toBe(42);
  });

  it.each([
    ['nulo', null],
    ['vacío', ''],
    ['sin puntos', 'abc'],
    ['payload no JSON', 'a.@@@.c'],
    ['amr no arreglo', jwt({ amr: 'password' })],
    ['timestamp no numérico', jwt({ amr: [{ method: 'password', timestamp: 'ayer' }] })],
    ['timestamp cero', jwt({ amr: [{ method: 'password', timestamp: 0 }] })],
  ])('forma inesperada (%s) ⇒ null, nunca lanza', (_label, token) => {
    expect(sessionAuthenticatedAt(token)).toBeNull();
  });
});

describe('tope de vida de la sesión efímera', () => {
  const MAX = 12 * 3600;
  const base = { mode: 'ephemeral' as const, maxAgeSecs: MAX };

  it('dentro del tope sigue', () => {
    expect(evaluateSessionLifetime({ ...base, authenticatedAt: 0, nowSecs: MAX }).expired).toBe(
      false
    );
  });

  it('un segundo después del tope se cierra', () => {
    expect(evaluateSessionLifetime({ ...base, authenticatedAt: 0, nowSecs: MAX + 1 })).toEqual({
      expired: true,
      reason: 'MAX_AGE_EXCEEDED',
    });
  });

  it('una hora de autenticación en el futuro (reloj adelantado) no expulsa', () => {
    expect(
      evaluateSessionLifetime({ ...base, authenticatedAt: 10_000, nowSecs: 100 }).expired
    ).toBe(false);
  });

  it('sin hora legible NO expulsa (evita el bucle entrar-caducar) y lo dice', () => {
    expect(evaluateSessionLifetime({ ...base, authenticatedAt: null, nowSecs: 1e9 })).toEqual({
      expired: false,
      reason: 'UNKNOWN_AUTH_TIME',
    });
  });

  it('en modo persistente no hay tope', () => {
    expect(
      evaluateSessionLifetime({
        mode: 'persistent',
        maxAgeSecs: MAX,
        authenticatedAt: 0,
        nowSecs: 1e9,
      }).expired
    ).toBe(false);
  });
});

describe('EPHEMERAL_SESSION_MAX_AGE_SECS: un valor inválido no desactiva el tope', () => {
  it.each([
    [undefined, DEFAULT_EPHEMERAL_SESSION_MAX_AGE_SECS],
    ['', DEFAULT_EPHEMERAL_SESSION_MAX_AGE_SECS],
    ['abc', DEFAULT_EPHEMERAL_SESSION_MAX_AGE_SECS],
    ['0', DEFAULT_EPHEMERAL_SESSION_MAX_AGE_SECS],
    ['-5', DEFAULT_EPHEMERAL_SESSION_MAX_AGE_SECS],
    ['29', DEFAULT_EPHEMERAL_SESSION_MAX_AGE_SECS],
    ['1e9999', DEFAULT_EPHEMERAL_SESSION_MAX_AGE_SECS],
    ['3600.5', DEFAULT_EPHEMERAL_SESSION_MAX_AGE_SECS],
    ['30', 30],
    ['28800', 28800],
  ] as const)('%j ⇒ %d', (raw, expected) => {
    expect(resolveEphemeralMaxAgeSecs(raw)).toBe(expected);
  });

  it('el default es 12 h', () => {
    expect(DEFAULT_EPHEMERAL_SESSION_MAX_AGE_SECS).toBe(43_200);
  });
});

describe('Clear-Site-Data del cierre de sesión', () => {
  it('efímero borra caché, cookies y almacenamiento', () => {
    expect(clearSiteDataFor('ephemeral')).toBe('"cache", "cookies", "storage"');
  });
  it('persistente solo la caché', () => {
    expect(clearSiteDataFor('persistent')).toBe('"cache"');
  });
});
