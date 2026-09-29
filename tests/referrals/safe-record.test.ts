import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({ throwOn: '' as string }));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    subscription: {
      findUnique: async () => {
        if (h.throwOn === 'subscription') throw new Error('db down');
        return null;
      },
    },
  },
}));
vi.mock('@/lib/db/auth-users', () => ({ getAuthEmails: vi.fn(async () => new Map()) }));
vi.mock('@/lib/observability/report', () => ({ reportControlFailure: vi.fn(), reportSilentDegradation: vi.fn() }));

const { recordReferralSaleSafely, recordReferralSale } = await import('@/lib/db/referrals');
const { reportControlFailure } = await import('@/lib/observability/report');

beforeEach(() => {
  vi.clearAllMocks();
  h.throwOn = '';
});

describe('recordReferralSaleSafely — el camino caliente del webhook', () => {
  it('NUNCA lanza: un fallo aquí no puede volver un 200 en 500 (Stripe reintentaría una activación que ya aplicó)', async () => {
    h.throwOn = 'subscription';
    await expect(recordReferralSaleSafely('sub1')).resolves.toBeUndefined();
  });

  it('pero tampoco se queda en silencio: reporta referral_sale', async () => {
    h.throwOn = 'subscription';
    await recordReferralSaleSafely('sub1');
    expect(reportControlFailure).toHaveBeenCalledWith('referral_sale', 'degraded', expect.any(Error), { subscriptionId: 'sub1' });
  });

  it('el rojo es alcanzable: la versión SIN «Safely» sí propaga el error (para que el respaldo reintente)', async () => {
    h.throwOn = 'subscription';
    await expect(recordReferralSale('sub1')).rejects.toThrow('db down');
  });

  it('si todo va bien no reporta nada', async () => {
    await recordReferralSaleSafely('sub1');
    expect(reportControlFailure).not.toHaveBeenCalled();
  });
});
