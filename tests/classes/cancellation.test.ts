import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  result: null as any,
  cancelThrows: false,
  refunded: [] as string[],
  notified: 0,
  tracked: [] as Array<{ id: string; event: string; props: unknown }>,
  reports: [] as string[],
}));

vi.mock('@/lib/observability/report', () => ({
  reportSilentDegradation: (_a: string, _e: unknown, ctx?: { stage?: string }) => h.reports.push(ctx?.stage ?? ''),
}));
vi.mock('@/lib/analytics/server', () => ({
  trackServerEvent: async (id: string, event: string, props: unknown) => {
    h.tracked.push({ id, event, props });
  },
}));
vi.mock('@/lib/db/classes', () => ({
  cancelClass: async () => {
    if (h.cancelThrows) throw new Error('no se puede cancelar');
    return h.result;
  },
}));
vi.mock('@/lib/classes/refunds', () => ({
  refundClassIfDue: async (id: string) => {
    h.refunded.push(id);
    return { status: 'refunded', amountCents: 1 };
  },
}));
vi.mock('@/lib/classes/notify', () => ({
  notifyCancellation: async () => {
    h.notified += 1;
    return true;
  },
}));

const { cancelClassAndRefund } = await import('@/lib/classes/cancellation');

const NOW = new Date('2026-11-09T12:00:00Z');
const base = (over: Record<string, unknown> = {}) => ({
  classId: 'c1',
  studentProfileId: 'ckstudent0001',
  cancelledBy: 'STUDENT',
  paid: true,
  stripeCheckoutSessionId: null,
  meetingEventId: null,
  outcome: { refundCents: 30000 },
  ...over,
});

function deps(over: { expireThrows?: boolean; deleteThrows?: boolean; withRoom?: boolean } = {}) {
  const expired: string[] = [];
  const deleted: string[] = [];
  return {
    expired,
    deleted,
    deps: {
      now: NOW,
      stripe: {
        refunds: { create: async () => ({ id: 're' }) },
        checkout: {
          sessions: {
            expire: async (id: string) => {
              if (over.expireThrows) throw new Error('ya expiró');
              expired.push(id);
            },
          },
        },
      } as never,
      classroom:
        over.withRoom === false
          ? null
          : {
              createMeeting: async () => ({ meetingUrl: 'u', eventId: 'e' }),
              deleteMeeting: async (id: string) => {
                if (over.deleteThrows) throw new Error('Google caído');
                deleted.push(id);
              },
            },
    },
  };
}

const input = { classId: 'c1', actor: { kind: 'SYSTEM' as const }, cause: 'STUDENT_REQUEST' as const };

beforeEach(() => {
  h.result = base();
  h.cancelThrows = false;
  h.refunded.length = 0;
  h.notified = 0;
  h.tracked.length = 0;
  h.reports.length = 0;
});

describe('cancelClassAndRefund', () => {
  it('cancela, devuelve el dinero, avisa y mide', async () => {
    const { deps: d } = deps();
    const r = await cancelClassAndRefund(input, d);
    expect(r.refundCents).toBe(30000);
    expect(h.refunded).toEqual(['c1']);
    expect(h.notified).toBe(1);
    expect(h.tracked).toEqual([
      { id: 'ckstudent0001', event: 'class_cancelled', props: { by: 'STUDENT', refundCents: 30000 } },
    ]);
  });

  it('si la cancelación se rechaza no se toca Stripe ni se avisa a nadie', async () => {
    h.cancelThrows = true;
    const { deps: d, expired } = deps();
    await expect(cancelClassAndRefund(input, d)).rejects.toThrow('no se puede cancelar');
    expect(h.refunded).toEqual([]);
    expect(h.notified).toBe(0);
    expect(expired).toEqual([]);
  });

  it('sin reembolso no llama a Stripe para devolver', async () => {
    h.result = base({ outcome: { refundCents: 0 } });
    await cancelClassAndRefund(input, deps().deps);
    expect(h.refunded).toEqual([]);
  });

  it('una reserva SIN cobrar expira su sesión de Checkout; una cobrada no', async () => {
    h.result = base({ paid: false, stripeCheckoutSessionId: 'cs_1', outcome: { refundCents: 0 } });
    const a = deps();
    await cancelClassAndRefund(input, a.deps);
    expect(a.expired).toEqual(['cs_1']);

    h.result = base({ paid: true, stripeCheckoutSessionId: 'cs_1' });
    const b = deps();
    await cancelClassAndRefund(input, b.deps);
    expect(b.expired).toEqual([]);
  });

  it('borra el evento del aula si existe', async () => {
    h.result = base({ meetingEventId: 'ev1' });
    const a = deps();
    await cancelClassAndRefund(input, a.deps);
    expect(a.deleted).toEqual(['ev1']);
  });

  it('un fallo al expirar o al borrar el aula NO revierte la cancelación ni impide el reembolso, y se reporta', async () => {
    h.result = base({ paid: false, stripeCheckoutSessionId: 'cs_1', meetingEventId: 'ev1', outcome: { refundCents: 500 } });
    const a = deps({ expireThrows: true, deleteThrows: true });
    const r = await cancelClassAndRefund(input, a.deps);
    expect(r.refundCents).toBe(500);
    expect(h.refunded).toEqual(['c1']);
    expect(h.reports).toEqual(expect.arrayContaining(['expire_checkout', 'delete_meeting']));
  });
});
