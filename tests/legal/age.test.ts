import { describe, expect, it } from 'vitest';
import {
  ADULT_AGE,
  MIN_REGISTRATION_AGE,
  computeAge,
  isBelowMinAge,
  parseDeclaredBirthDate,
  requiresTutorConsent,
} from '@/lib/legal/age';

const NOW = new Date('2026-10-01T12:00:00Z');

describe('computeAge — años cumplidos', () => {
  it('cuenta el cumpleaños ya pasado y el aún no cumplido en el año', () => {
    expect(computeAge(new Date('2010-09-30T00:00:00Z'), NOW)).toBe(16); // ya cumplió
    expect(computeAge(new Date('2010-10-02T00:00:00Z'), NOW)).toBe(15); // aún no
    expect(computeAge(new Date('2010-10-01T00:00:00Z'), NOW)).toBe(16); // justo hoy
  });

  it('no se desfasa por años bisiestos (no aproxima con milisegundos)', () => {
    // Nacida el 29-feb-2008; a 1-oct-2026 tiene 18 (cumplió en feb).
    expect(computeAge(new Date('2008-02-29T00:00:00Z'), NOW)).toBe(18);
  });
});

describe('reglas de edad — Bloque 1', () => {
  it('los pisos documentados son 15 (registro) y 18 (mayoría)', () => {
    expect(MIN_REGISTRATION_AGE).toBe(15);
    expect(ADULT_AGE).toBe(18);
  });

  it('< 15 no puede registrarse; ≥ 15 sí', () => {
    expect(isBelowMinAge(new Date('2012-01-01T00:00:00Z'), NOW)).toBe(true); // 14
    expect(isBelowMinAge(new Date('2011-01-01T00:00:00Z'), NOW)).toBe(false); // 15
  });

  it('< 18 requiere tutor; ≥ 18 no', () => {
    expect(requiresTutorConsent(new Date('2010-01-01T00:00:00Z'), NOW)).toBe(true); // 16
    expect(requiresTutorConsent(new Date('2008-09-01T00:00:00Z'), NOW)).toBe(false); // 18
  });
});

describe('parseDeclaredBirthDate', () => {
  it('acepta una fecha válida de un adolescente y la normaliza a medianoche UTC', () => {
    const r = parseDeclaredBirthDate('2010-05-20', NOW);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.date.toISOString()).toBe('2010-05-20T00:00:00.000Z');
  });

  it('rechaza formato inválido y fechas que "se acomodan" (31 de febrero)', () => {
    expect(parseDeclaredBirthDate('20-05-2010', NOW)).toEqual({ ok: false, reason: 'INVALID' });
    expect(parseDeclaredBirthDate('2010-02-31', NOW)).toEqual({ ok: false, reason: 'INVALID' });
    expect(parseDeclaredBirthDate('no-es-fecha', NOW)).toEqual({ ok: false, reason: 'INVALID' });
  });

  it('rechaza fechas futuras, implausibles y de menores de 15', () => {
    expect(parseDeclaredBirthDate('2030-01-01', NOW)).toEqual({ ok: false, reason: 'FUTURE' });
    expect(parseDeclaredBirthDate('1900-01-01', NOW)).toEqual({ ok: false, reason: 'TOO_OLD' });
    expect(parseDeclaredBirthDate('2015-01-01', NOW)).toEqual({ ok: false, reason: 'TOO_YOUNG' }); // 11
  });
});
