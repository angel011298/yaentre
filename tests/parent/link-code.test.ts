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
