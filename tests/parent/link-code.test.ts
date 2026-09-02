import { describe, expect, it } from 'vitest';
import {
  computeLinkCodeExpiry,
  generateLinkCode,
  isLinkCodeRedeemable,
  LINK_CODE_LENGTH,
  LINK_CODE_TTL_MINUTES,
} from '@/lib/parent/link-code';

describe('generateLinkCode', () => {
  it('genera exactamente 6 dígitos', () => {
    const code = generateLinkCode(() => 0.123456);
    expect(code).toHaveLength(LINK_CODE_LENGTH);
    expect(code).toMatch(/^\d{6}$/);
  });

  it('rellena con ceros a la izquierda cuando el número es chico', () => {
    const code = generateLinkCode(() => 0.0000001);
    expect(code).toBe('000000');
  });

  it('el máximo posible sigue siendo 6 dígitos', () => {
    const code = generateLinkCode(() => 0.9999999);
    expect(code).toHaveLength(6);
  });

  // ── G65 ────────────────────────────────────────────────────────────────────
  // Este código es la llave que le abre a un adulto el tablero de un MENOR.
  // Antes salía de `Math.random()` (xorshift128+, reconstruible observando unas
  // pocas salidas — y cualquiera puede registrarse y pedir códigos a voluntad).
  // Ahora, sin generador inyectado, viene de `crypto.randomInt`.
  it('sin generador inyectado usa entropía criptográfica y no repite', () => {
    const codes = new Set(Array.from({ length: 500 }, () => generateLinkCode()));
    // 500 muestras de 10^6: por el problema del cumpleaños se esperan ~0.12
    // colisiones. Más de 5 delataría un generador degenerado.
    expect(codes.size).toBeGreaterThan(495);
    for (const code of codes) expect(code).toMatch(/^\d{6}$/);
  });

  it('cubre todo el rango, incluidos los que empiezan por cero', () => {
    const codes = Array.from({ length: 3000 }, () => generateLinkCode());
    expect(codes.some((c) => c.startsWith('0'))).toBe(true);
    expect(codes.some((c) => Number(c) > 500_000)).toBe(true);
  });
});

describe('computeLinkCodeExpiry', () => {
  it('vence exactamente 10 minutos después', () => {
    const now = new Date('2027-01-01T12:00:00.000Z');
    const expiry = computeLinkCodeExpiry(now);
    expect(expiry.getTime() - now.getTime()).toBe(LINK_CODE_TTL_MINUTES * 60 * 1000);
  });
});

describe('isLinkCodeRedeemable', () => {
  const now = new Date('2027-01-01T12:10:00.000Z');

  it('true: no usado y todavía no vence', () => {
    expect(
      isLinkCodeRedeemable({ usedAt: null, expiresAt: new Date('2027-01-01T12:10:01.000Z') }, now)
    ).toBe(true);
  });

  it('false: ya se usó, aunque no haya vencido', () => {
    expect(
      isLinkCodeRedeemable(
        { usedAt: new Date('2027-01-01T12:05:00.000Z'), expiresAt: new Date('2027-01-01T12:20:00.000Z') },
        now
      )
    ).toBe(false);
  });

  it('false: vencido exactamente en este instante (borde estricto)', () => {
    expect(
      isLinkCodeRedeemable({ usedAt: null, expiresAt: new Date('2027-01-01T12:10:00.000Z') }, now)
    ).toBe(false);
  });

  it('false: vencido hace rato', () => {
    expect(
      isLinkCodeRedeemable({ usedAt: null, expiresAt: new Date('2027-01-01T12:00:00.000Z') }, now)
    ).toBe(false);
  });

  it('un código no se puede reusar tras canjearse (single-use)', () => {
    const expiresAt = new Date('2027-01-01T13:00:00.000Z'); // vigente de sobra
    const fresh = { usedAt: null, expiresAt };
    expect(isLinkCodeRedeemable(fresh, now)).toBe(true);
    const afterRedeem = { usedAt: now, expiresAt };
    expect(isLinkCodeRedeemable(afterRedeem, now)).toBe(false);
  });
});
