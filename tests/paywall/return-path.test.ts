import { describe, expect, it } from 'vitest';
import { sanitizeReturnPath } from '@/lib/paywall/return-path';

describe('sanitizeReturnPath — "Ahora no" nunca es un open redirect', () => {
  it('acepta rutas relativas normales', () => {
    expect(sanitizeReturnPath('/app')).toBe('/app');
    expect(sanitizeReturnPath('/diagnostico')).toBe('/diagnostico');
    expect(sanitizeReturnPath('/app/examen-oficial?x=1')).toBe('/app/examen-oficial?x=1');
  });

  it('rechaza URLs absolutas (http/https) y cae al fallback', () => {
    expect(sanitizeReturnPath('https://evil.com/phish')).toBe('/app');
    expect(sanitizeReturnPath('http://evil.com')).toBe('/app');
  });

  it('rechaza protocol-relative (//host) — el truco clásico de open redirect', () => {
    expect(sanitizeReturnPath('//evil.com')).toBe('/app');
    expect(sanitizeReturnPath('//evil.com/path')).toBe('/app');
  });

  it('rechaza backslashes (algunos navegadores los tratan como /)', () => {
    expect(sanitizeReturnPath('/\\evil.com')).toBe('/app');
  });

  it('vacío, undefined o null caen al fallback', () => {
    expect(sanitizeReturnPath(undefined)).toBe('/app');
    expect(sanitizeReturnPath(null)).toBe('/app');
    expect(sanitizeReturnPath('')).toBe('/app');
  });

  it('respeta un fallback personalizado', () => {
    expect(sanitizeReturnPath(undefined, '/onboarding')).toBe('/onboarding');
    expect(sanitizeReturnPath('javascript:alert(1)', '/onboarding')).toBe('/onboarding');
  });
});
