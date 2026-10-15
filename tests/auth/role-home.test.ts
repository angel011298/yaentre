import { describe, expect, it } from 'vitest';
import { homePathForRole } from '@/lib/auth/role-home';
import { isSameOriginRequest } from '@/lib/auth/same-origin';

/** G100 — a dónde aterriza cada rol tras iniciar sesión, en cualquier dispositivo. */
describe('homePathForRole', () => {
  it.each([
    ['ADMIN', '/admin'],
    ['PARENT', '/tutor'],
    ['STUDENT', '/app'],
    [null, '/app'],
    [undefined, '/app'],
  ] as const)('%s ⇒ %s', (role, path) => {
    expect(homePathForRole(role)).toBe(path);
  });
});

/** G100 — el cierre de sesión es un Route Handler: no trae la validación de
 *  Origin de las Server Actions, la pone este chequeo. */
describe('isSameOriginRequest', () => {
  const h = (entries: Record<string, string>) => ({
    get: (name: string) => entries[name.toLowerCase()] ?? null,
  });

  it('Sec-Fetch-Site same-origin pasa', () => {
    expect(isSameOriginRequest(h({ 'sec-fetch-site': 'same-origin' }))).toBe(true);
  });

  it.each(['cross-site', 'same-site', 'none'])('Sec-Fetch-Site %s se rechaza', (site) => {
    // Sec-Fetch-Site manda aunque Origin coincida: lo pone el navegador.
    expect(
      isSameOriginRequest(
        h({ 'sec-fetch-site': site, origin: 'https://yaentre.com', host: 'yaentre.com' })
      )
    ).toBe(false);
  });

  it('sin Sec-Fetch-Site, Origin igual al host pasa', () => {
    expect(isSameOriginRequest(h({ origin: 'https://yaentre.com', host: 'yaentre.com' }))).toBe(
      true
    );
  });

  it('sin Sec-Fetch-Site, Origin ajeno se rechaza', () => {
    expect(isSameOriginRequest(h({ origin: 'https://evil.example', host: 'yaentre.com' }))).toBe(
      false
    );
  });

  it.each([
    ['sin cabeceras', {}],
    ['Origin null', { origin: 'null', host: 'yaentre.com' }],
    ['Origin ilegible', { origin: 'no es url', host: 'yaentre.com' }],
  ])('%s se rechaza', (_l, entries) => {
    expect(isSameOriginRequest(h(entries as Record<string, string>))).toBe(false);
  });
});
