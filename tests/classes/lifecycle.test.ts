import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  holds: [] as Array<{ id: string; stripeCheckoutSessionId: string | null; stripePaymentId: string | null }>,
  holdsThrows: false,
  awaiting: [] as Array<{
    id: string;
    scheduledAt: Date;
    paidAt: Date | null;
    confirmationRequestedAt: Date | null;
    adminAlertedAt: Date | null;
  }>,
  links: [] as Array<{
    id: string;
    scheduledAt: Date;
    durationMinutes: number;
    meetingUrl: string | null;
    meetingEventId: string | null;
  }>,
  refunds: [] as Array<{ id: string }>,
  confirmPayment: [] as Array<{ eventId: string; input: Record<string, unknown> }>,
  confirmOutcome: { kind: 'booked', classId: 'x' } as { kind: string; classId?: string },
  abandoned: [] as string[],
  requestMarked: [] as string[],
  alertMarked: [] as string[],
  linkMarked: [] as string[],
  savedMeetings: [] as string[],
  cancelled: [] as Array<{ classId: string; cause: string }>,
  refundCalls: [] as string[],
  refundStatus: 'refunded' as string,
  announced: [] as string[],
  requestEmailOk: true,
  alertOk: true,
  linksEmailOk: true,
  requestsSent: 0,
  alertsSent: 0,
  reports: [] as string[],
}));

vi.mock('@/lib/observability/report', () => ({
  reportSilentDegradation: (area: string, _e: unknown, ctx?: { step?: string }) =>
    h.reports.push(`${area}:${ctx?.step ?? ''}`),
}));
vi.mock('@/lib/db/classes', () => ({
  lifecycleQueries: {
    expiredHolds: async () => {
      if (h.holdsThrows) throw new Error('db caída');
      return h.holds;
    },
    awaitingConfirmation: async () => h.awaiting,
    meetingLinksDue: async () => h.links,
    refundsDue: async () => h.refunds,
  },
  classPaymentStore: {
    confirmPayment: async (eventId: string, _t: string, input: Record<string, unknown>) => {
      h.confirmPayment.push({ eventId, input });
      return h.confirmOutcome;
    },
  },
  abandonUnpaidClass: async (id: string) => {
    h.abandoned.push(id);
    return true;
  },
  getClassNotifyContext: async (id: string) => ({
    id,
    scheduledAt: new Date('2026-11-10T18:00:00Z'),
    teacher: { publicName: 'Ana P.' },
  }),
  markConfirmationRequested: async (id: string) => {
    h.requestMarked.push(id);
    return true;
  },
  markAdminAlerted: async (id: string) => {
    h.alertMarked.push(id);
    return true;
  },
  markMeetingLinkSent: async (id: string) => {
    h.linkMarked.push(id);
  },
  saveMeeting: async (id: string) => {
    h.savedMeetings.push(id);
  },
}));
vi.mock('@/lib/classes/notify', () => ({
  sendConfirmationRequest: async () => {
    h.requestsSent += 1;
    return h.requestEmailOk;
  },
  alertAdmins: async () => {
    h.alertsSent += 1;
    return h.alertOk;
  },
  sendUnconfirmedNotice: async () => true,
  sendMeetingLinks: async () => h.linksEmailOk,
  announceBooked: async (id: string) => {
    h.announced.push(id);
  },
}));
vi.mock('@/lib/classes/cancellation', () => ({
  cancelClassAndRefund: async (input: { classId: string; cause: string }) => {
    h.cancelled.push({ classId: input.classId, cause: input.cause });
    return {};
  },
}));
vi.mock('@/lib/classes/refunds', () => ({
  refundClassIfDue: async (id: string) => {
    h.refundCalls.push(id);
    return { status: h.refundStatus };
  },
}));

const { runClassLifecycle } = await import('@/lib/classes/lifecycle');

const NOW = new Date('2026-11-09T12:00:00Z');
const START = new Date('2026-11-10T18:00:00Z'); // 30 h después de NOW

function fakeStripe(opts: { intentStatus?: string; sessionPi?: string | null; throws?: boolean } = {}) {
  const expired: string[] = [];
  const stripe = {
    paymentIntents: {
      retrieve: async (id: string) => {
        if (opts.throws) throw new Error('Stripe caído');
        return { id, status: opts.intentStatus ?? 'canceled', amount_received: 30000, currency: 'mxn' };
      },
    },
    checkout: {
      sessions: {
        retrieve: async () => ({ payment_intent: opts.sessionPi ?? null }),
        expire: async (id: string) => {
          expired.push(id);
        },
      },
    },
    refunds: { create: async () => ({ id: 're_1' }) },
  };
  return { stripe: stripe as never, expired };
}

const run = (stripe: never, classroom: unknown = null, now = NOW) =>
  runClassLifecycle({ stripe, classroom: classroom as never, now });

beforeEach(() => {
  for (const k of Object.keys(h) as Array<keyof typeof h>) {
    const v = h[k];
    if (Array.isArray(v)) v.length = 0;
  }
  h.holdsThrows = false;
  h.confirmOutcome = { kind: 'booked', classId: 'x' };
  h.refundStatus = 'refunded';
  h.requestEmailOk = true;
  h.alertOk = true;
  h.linksEmailOk = true;
  h.requestsSent = 0;
  h.alertsSent = 0;
});

describe('reservas sin pagar', () => {
  it('una reserva vencida y sin cobro se SUELTA y su sesión de Checkout se expira', async () => {
    h.holds.push({ id: 'c1', stripeCheckoutSessionId: 'cs_1', stripePaymentId: null });
    const { stripe, expired } = fakeStripe({ sessionPi: null });
    const s = await run(stripe);
    expect(h.abandoned).toEqual(['c1']);
    expect(expired).toEqual(['cs_1']);
    expect(s.holdsReleased).toBe(1);
    expect(s.failedSteps).toEqual([]);
  });

  it('si el alumno SÍ pagó y el webhook se perdió, NO se suelta: se reconcilia con id sintético', async () => {
    h.holds.push({ id: 'c1', stripeCheckoutSessionId: null, stripePaymentId: 'pi_9' });
    const { stripe } = fakeStripe({ intentStatus: 'succeeded' });
    const s = await run(stripe);
    expect(h.abandoned).toEqual([]);
    expect(h.confirmPayment[0]).toMatchObject({
      eventId: 'reconcile:pi_9',
      input: { classSessionId: 'c1', amountReceivedCents: 30000, currency: 'mxn' },
    });
    expect(h.announced).toEqual(['c1']);
    expect(s.paymentsReconciled).toBe(1);
  });

  it('un cobro que no coincide con la clase queda para reembolso', async () => {
    h.confirmOutcome = { kind: 'mismatch', classId: 'c1' };
    h.holds.push({ id: 'c1', stripeCheckoutSessionId: null, stripePaymentId: 'pi_9' });
    await run(fakeStripe({ intentStatus: 'succeeded' }).stripe);
    expect(h.refundCalls).toEqual(['c1']);
    expect(h.announced).toEqual([]);
  });

  it('si Stripe no responde NO se suelta (podría haber cobro) y el paso se marca fallido', async () => {
    h.holds.push({ id: 'c1', stripeCheckoutSessionId: null, stripePaymentId: 'pi_9' });
    const s = await run(fakeStripe({ throws: true }).stripe);
    expect(h.abandoned).toEqual([]);
    expect(s.failedSteps).toContain('holds');
    expect(h.reports).toContain('class_lifecycle:hold');
  });
});

describe('confirmación del profesor', () => {
  const row = (over: Partial<(typeof h.awaiting)[number]> = {}) => ({
    id: 'c1',
    scheduledAt: START,
    paidAt: new Date('2026-11-01T00:00:00Z'),
    confirmationRequestedAt: null,
    adminAlertedAt: null,
    ...over,
  });
  // Para START = 10 nov 18:00Z: petición 9 nov 18:00Z, alerta 22:00Z, cancelación 10 nov 06:00Z.
  const at = (iso: string) => new Date(iso);

  it('antes de la hora de petición no hace nada', async () => {
    h.awaiting.push(row());
    await run(fakeStripe().stripe, null, at('2026-11-09T17:59:00Z'));
    expect(h.requestsSent).toBe(0);
    expect(h.cancelled).toEqual([]);
  });

  it('a las 24 h pide confirmar y sella SOLO si el correo salió', async () => {
    h.awaiting.push(row());
    await run(fakeStripe().stripe, null, at('2026-11-09T18:00:00Z'));
    expect(h.requestMarked).toEqual(['c1']);

    h.requestMarked.length = 0;
    h.requestEmailOk = false;
    await run(fakeStripe().stripe, null, at('2026-11-09T18:00:00Z'));
    expect(h.requestMarked).toEqual([]); // se reintenta en la siguiente corrida
  });

  it('una petición ya enviada no se repite', async () => {
    h.awaiting.push(row({ confirmationRequestedAt: at('2026-11-09T18:00:00Z') }));
    await run(fakeStripe().stripe, null, at('2026-11-09T19:00:00Z'));
    expect(h.requestsSent).toBe(0);
  });

  it('a las 4 h sin confirmar alerta al admin y sella; sin admin alcanzado NO sella', async () => {
    h.awaiting.push(row({ confirmationRequestedAt: at('2026-11-09T18:00:00Z') }));
    const s = await run(fakeStripe().stripe, null, at('2026-11-09T22:00:00Z'));
    expect(h.alertMarked).toEqual(['c1']);
    expect(s.adminAlerts).toBe(1);

    h.alertMarked.length = 0;
    h.alertOk = false;
    await run(fakeStripe().stripe, null, at('2026-11-09T22:00:00Z'));
    expect(h.alertMarked).toEqual([]);
  });

  it('a las 12 h sin confirmar se cancela con la causa que CUENTA contra el profesor', async () => {
    h.awaiting.push(row({ confirmationRequestedAt: at('2026-11-09T18:00:00Z') }));
    const s = await run(fakeStripe().stripe, null, at('2026-11-10T06:00:00Z'));
    expect(h.cancelled).toEqual([{ classId: 'c1', cause: 'TEACHER_NO_CONFIRMATION' }]);
    expect(s.autoCancelled).toBe(1);
    // Al cancelar ya no se manda petición ni alerta.
    expect(h.requestsSent).toBe(0);
  });
});

describe('enlace del aula', () => {
  const due = { id: 'c1', scheduledAt: START, durationMinutes: 50, meetingUrl: null, meetingEventId: null };
  const classroom = () => ({
    created: [] as string[],
    createMeeting: async function (this: { created: string[] }, i: { classId: string }) {
      this.created.push(i.classId);
      return { meetingUrl: 'https://meet.google.com/abc', eventId: 'ev1' };
    },
    deleteMeeting: async () => undefined,
  });

  it('crea el enlace, lo guarda, lo manda y lo sella', async () => {
    h.links.push({ ...due });
    const room = classroom();
    const s = await run(fakeStripe().stripe, room);
    expect(room.created).toEqual(['c1']);
    expect(h.savedMeetings).toEqual(['c1']);
    expect(h.linkMarked).toEqual(['c1']);
    expect(s.meetingLinks).toBe(1);
  });

  it('un enlace ya creado no se vuelve a crear (idempotente)', async () => {
    h.links.push({ ...due, meetingUrl: 'https://meet.google.com/zzz', meetingEventId: 'ev0' });
    const room = classroom();
    await run(fakeStripe().stripe, room);
    expect(room.created).toEqual([]);
    expect(h.linkMarked).toEqual(['c1']);
  });

  it('si los correos no salen, NO se sella (se reenvía la próxima corrida)', async () => {
    h.links.push({ ...due });
    h.linksEmailOk = false;
    await run(fakeStripe().stripe, classroom());
    expect(h.linkMarked).toEqual([]);
  });

  it('clases con enlace pendiente y SIN aula configurada es un fallo visible, no un cero', async () => {
    h.links.push({ ...due });
    const s = await run(fakeStripe().stripe, null);
    expect(s.failedSteps).toContain('meeting-links');
    expect(h.reports).toContain('class_lifecycle:meeting-links');
  });

  it('si Google falla, se reporta y el paso queda fallido', async () => {
    h.links.push({ ...due });
    const room = { createMeeting: async () => { throw new Error('Google caído'); }, deleteMeeting: async () => undefined };
    const s = await run(fakeStripe().stripe, room);
    expect(s.failedSteps).toContain('meeting-links');
    expect(h.linkMarked).toEqual([]);
  });
});

describe('reembolsos y aislamiento de pasos', () => {
  it('reintenta los reembolsos pendientes y cuenta los saldados', async () => {
    h.refunds.push({ id: 'c1' }, { id: 'c2' });
    const s = await run(fakeStripe().stripe);
    expect(h.refundCalls).toEqual(['c1', 'c2']);
    expect(s.refundsSettled).toBe(2);
  });

  it('un reembolso que sigue fallando marca el paso como fallido (no cuenta como 0 limpio)', async () => {
    h.refunds.push({ id: 'c1' });
    h.refundStatus = 'failed';
    const s = await run(fakeStripe().stripe);
    expect(s.failedSteps).toContain('refunds');
  });

  it('si el primer paso revienta, los demás SIGUEN corriendo', async () => {
    h.holdsThrows = true;
    h.refunds.push({ id: 'c1' });
    const s = await run(fakeStripe().stripe);
    expect(s.failedSteps).toContain('holds');
    expect(h.refundCalls).toEqual(['c1']);
  });

  it('sin nada que hacer, todo en cero y sin fallos', async () => {
    const s = await run(fakeStripe().stripe);
    expect(s).toEqual({
      holdsReleased: 0,
      paymentsReconciled: 0,
      confirmationRequests: 0,
      adminAlerts: 0,
      autoCancelled: 0,
      meetingLinks: 0,
      refundsSettled: 0,
      failedSteps: [],
    });
  });
});
