import { describe, expect, it } from 'vitest';
import { safeInternalPath } from '@/lib/auth/safe-redirect';

describe('safeInternalPath', () => {
  const FALLBACK = '/app';

  it('acepta una ruta interna simple', () => {
    expect(safeInternalPath('/app/simulador', FALLBACK)).toBe('/app/simulador');
    expect(safeInternalPath('/tutor', FALLBACK)).toBe('/tutor');
    expect(safeInternalPath('/checkout?session_id=abc', FALLBACK)).toBe('/checkout?session_id=abc');
  });

  it('rechaza URLs absolutas a otro host', () => {
    expect(safeInternalPath('https://evil.com', FALLBACK)).toBe(FALLBACK);
    expect(safeInternalPath('http://evil.com/app', FALLBACK)).toBe(FALLBACK);
  });

  it('rechaza las formas que el navegador interpreta como host', () => {
    expect(safeInternalPath('//evil.com', FALLBACK)).toBe(FALLBACK);
    expect(safeInternalPath('/\\evil.com', FALLBACK)).toBe(FALLBACK);
    expect(safeInternalPath('/\tevil', FALLBACK)).toBe(FALLBACK);
  });

  it('rechaza rutas relativas, protocol-relative y esquemas raros', () => {
    expect(safeInternalPath('app/simulador', FALLBACK)).toBe(FALLBACK);
    expect(safeInternalPath('@evil.com', FALLBACK)).toBe(FALLBACK);
    expect(safeInternalPath('javascript:alert(1)', FALLBACK)).toBe(FALLBACK);
    expect(safeInternalPath('mailto:x@y.com', FALLBACK)).toBe(FALLBACK);
  });

  it('rechaza vacío, no-string y desmesurado', () => {
    expect(safeInternalPath('', FALLBACK)).toBe(FALLBACK);
    expect(safeInternalPath(null, FALLBACK)).toBe(FALLBACK);
    expect(safeInternalPath(undefined, FALLBACK)).toBe(FALLBACK);
    expect(safeInternalPath(42, FALLBACK)).toBe(FALLBACK);
    expect(safeInternalPath('/' + 'a'.repeat(600), FALLBACK)).toBe(FALLBACK);
  });
});
