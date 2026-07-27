import { beforeEach, describe, expect, it } from 'vitest';
import { checkRateLimit, resetRateLimitState } from '@/lib/rate-limit/limiter';

describe('checkRateLimit — ventana fija en memoria (F20 tarea 5)', () => {
  beforeEach(() => {
    resetRateLimitState();
  });

  it('permite hasta el límite dentro de la ventana', () => {
    const now = 1_000_000;
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit('ip:/api/x', 5, 60_000, now + i).allowed).toBe(true);
    }
  });

  it('bloquea la petición que excede el límite, con retryAfterSecs > 0', () => {
    const now = 1_000_000;
    for (let i = 0; i < 5; i++) {
      checkRateLimit('ip:/api/x', 5, 60_000, now + i);
    }
    const result = checkRateLimit('ip:/api/x', 5, 60_000, now + 6);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSecs).toBeGreaterThan(0);
  });

  it('libera la ventana una vez que expira', () => {
    const now = 1_000_000;
    for (let i = 0; i < 5; i++) {
      checkRateLimit('ip:/api/x', 5, 60_000, now + i);
    }
    expect(checkRateLimit('ip:/api/x', 5, 60_000, now + 5).allowed).toBe(false);
    // Un instante después de que la ventana de 60s expiró.
    expect(checkRateLimit('ip:/api/x', 5, 60_000, now + 60_001).allowed).toBe(true);
  });

  it('cada key (ip+ruta) tiene su propio cupo independiente', () => {
    const now = 1_000_000;
    for (let i = 0; i < 5; i++) {
      checkRateLimit('ip1:/api/x', 5, 60_000, now + i);
    }
    expect(checkRateLimit('ip1:/api/x', 5, 60_000, now + 6).allowed).toBe(false);
    expect(checkRateLimit('ip2:/api/x', 5, 60_000, now + 6).allowed).toBe(true);
  });
});
