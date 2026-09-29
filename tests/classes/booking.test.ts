import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * `bookClass` es el ÚNICO camino que crea una clase y toca dinero. Las pruebas
 * comprueban el orden de las comprobaciones (nada se cobra ni se retiene si una
 * previa falla) y, sobre todo, lo que se le manda a Stripe.
 */

const h = vi.hoisted(() => ({
  marketplaceOpen: true,
  salesOpen: true,
  rateAllowed: true,
  premium: { expiresAt: new Date('2027-06-01T00:00:00Z'), stripeCustomerId: 'cus_1' } as null | {
    expiresAt: Date | null;
    stripeCustomerId: string | null;
  },
  tutorConfirmed: true,
  tutorRecording: false,
  teacher: null as null | {
    id: string;
    userProfileId: string;
    publicName: string;
    level: 'INICIAL' | 'VERIFICADO' | 'DESTACADO';
    availability: unknown;
    subjects: string[];
    recordingPolicyAccepted: boolean;
  },
  created: [] as Array<Record<string, unknown>>,
  abandoned: [] as Array<{ classId: string; reason: string }>,
  attachedPi: [] as Array<{ classId: string; pi: string }>,
  attachedSession: [] as Array<{ classId: string; session: string }>,
  slotTaken: false,
  reports: [] as Array<{ control: string; outcome: string; stage?: string }>,
}));

vi.mock('@/lib/marketplace/marketplace-gate', () => ({ marketplaceGate: () => ({ open: h.marketplaceOpen }) }));
vi.mock('@/lib/stripe/sales-gate', () => ({ salesGate: () => ({ open: h.salesOpen }) }));
vi.mock('@/lib/rate-limit/store', () => ({ consumeRateLimit: async () => ({ allowed: h.rateAllowed }) }));
vi.mock('@/lib/auth/site-url', () => ({ getSiteUrl: () => 'https://yaentre.test' }));
vi.mock('@/lib/observability/report', () => ({
  reportControlFailure: (control: string, outcome: string, _e: unknown, ctx?: { stage?: string }) =>
    h.reports.push({ control, outcome, stage: ctx?.stage }),
}));
vi.mock('@/lib/db/tutor-consent', () => ({
  hasConfirmedTutorConsent: async () => h.tutorConfirmed,
  hasTutorRecordingConsent: async () => h.tutorRecording,
}));
vi.mock('@/lib/db/classes', () => ({
  getActivePremium: async () => h.premium,
  getTeacherForBooking: async () => h.teacher,
  createPendingClass: async (input: Record<string, unknown> & { tariff: { finalCents: number } }) => {
    if (h.slotTaken) {
      const { MarketplaceError } = await import('@/lib/classes/errors');
      throw new MarketplaceError('SLOT_TAKEN', 'Ese horario ya se ocupó. Elige otro.');
    }
    h.created.push(input);
    return { id: 'ckclass1', finalTariffCents: input.tariff.finalCents };
  },
  abandonUnpaidClass: async (classId: string, reason: string) => {
    h.abandoned.push({ classId, reason });
    return true;
  },
  attachPaymentIntent: async (classId: string, pi: string) => {
    h.attachedPi.push({ classId, pi });
  },
  attachCheckoutSession: async (classId: string, session: string) => {
    h.attachedSession.push({ classId, session });
  },
}));

const { bookClass } = await import('@/lib/classes/booking');
const { MarketplaceError } = await import('@/lib/classes/errors');
const { calculateTariff } = await import('@/lib/teachers/tariff');

// Lunes 5 oct 2026, 06:00 hora de México. La clase: miércoles 7 oct, 17:00 (23:00Z).
const NOW = new Date('2026-10-05T12:00:00Z');
const WHEN = new Date('2026-10-07T23:00:00Z');
const ADULT = { profileId: 'ckstudent0001', email: 'alumno@example.com', birthDate: new Date('2000-01-15T00:00:00Z') };
const MINOR = { ...ADULT, birthDate: new Date('2010-01-15T00:00:00Z') };

function baseTeacher() {
  return {
    id: 'ckteacher001',
    userProfileId: 'ckteacheruser',
    publicName: 'Ana P.',
    level: 'INICIAL' as const,
    availability: [{ weekday: 3, startMinute: 8 * 60, endMinute: 22 * 60 }],
    subjects: ['matematicas', 'fisica'],
    recordingPolicyAccepted: true,
  };
}

/** El precio que la interfaz habría mostrado: 59 h de anticipación = EARLY, miércoles 17:00 (antes de las 18:00) = DAYTIME. */
const EARLY = calculateTariff({
  subjectKey: 'matematicas',
  teacherLevel: 'INICIAL',
  durationMinutes: 50,
  advanceCategory: 'EARLY',
  scheduleCategory: 'DAYTIME',
  demandCategory: 'NORMAL',
});

const request = (over: Partial<Parameters<typeof bookClass>[1]> = {}) => ({
  teacherId: 'ckteacher001',
  subjectKey: 'matematicas',
  scheduledAt: WHEN,
  durationMinutes: 50,
  recordingConsent: false,
  expectedPriceCents: EARLY.finalCents,
  ...over,
});

interface Calls {
  pmList: unknown[];
  piCreate: Array<{ params: Record<string, unknown>; options: { idempotencyKey: string } }>;
  piCancel: string[];
  sessionCreate: Array<{ params: Record<string, any>; options: { idempotencyKey: string } }>;
  customerCreate: unknown[];
  customerSearch: unknown[];
}

function fakeStripe(
  opts: {
    cards?: string[];
    piStatus?: string;
    piThrows?: () => unknown;
    sessionThrows?: boolean;
    sessionUrl?: string | null;
    found?: string | null;
  } = {}
) {
  const calls: Calls = { pmList: [], piCreate: [], piCancel: [], sessionCreate: [], customerCreate: [], customerSearch: [] };
  const stripe = {
    customers: {
      search: async (p: unknown) => {
        calls.customerSearch.push(p);
        return { data: opts.found ? [{ id: opts.found }] : [] };
      },
      create: async (p: unknown) => {
        calls.customerCreate.push(p);
        return { id: 'cus_new' };
      },
    },
    paymentMethods: {
      list: async (p: unknown) => {
        calls.pmList.push(p);
        return { data: (opts.cards ?? ['pm_1']).map((id) => ({ id })) };
      },
    },
    paymentIntents: {
      create: async (params: Record<string, unknown>, options: { idempotencyKey: string }) => {
        calls.piCreate.push({ params, options });
        if (opts.piThrows) throw opts.piThrows();
        return { id: 'pi_1', status: opts.piStatus ?? 'succeeded' };
      },
      cancel: async (id: string) => {
        calls.piCancel.push(id);
        return { id };
      },
    },
    checkout: {
      sessions: {
        create: async (params: Record<string, unknown>, options: { idempotencyKey: string }) => {
          calls.sessionCreate.push({ params, options });
          if (opts.sessionThrows) throw new Error('Stripe caído');
          return { id: 'cs_1', url: opts.sessionUrl === undefined ? 'https://checkout.stripe.test/cs_1' : opts.sessionUrl };
        },
      },
    },
  };
  return { stripe: stripe as never, calls };
}

beforeEach(() => {
  h.marketplaceOpen = true;
  h.salesOpen = true;
  h.rateAllowed = true;
  h.premium = { expiresAt: new Date('2027-06-01T00:00:00Z'), stripeCustomerId: 'cus_1' };
  h.tutorConfirmed = true;
  h.tutorRecording = false;
  h.teacher = baseTeacher();
  h.created.length = 0;
  h.abandoned.length = 0;
  h.attachedPi.length = 0;
  h.attachedSession.length = 0;
  h.slotTaken = false;
  h.reports.length = 0;
});

async function rejects(p: Promise<unknown>, code: string) {
  const err = await p.then(
    () => null,
    (e) => e
  );
  expect(err).toBeInstanceOf(MarketplaceError);
  expect((err as InstanceType<typeof MarketplaceError>).code).toBe(code);
}

describe('bookClass — puertas previas (nada se retiene ni se cobra)', () => {
  it('con el marketplace cerrado no hace NADA', async () => {
    h.marketplaceOpen = false;
    const { stripe, calls } = fakeStripe();
    await rejects(bookClass(ADULT, request(), { stripe, now: NOW }), 'MARKETPLACE_CLOSED');
    expect(h.created).toEqual([]);
    expect(calls.piCreate).toEqual([]);
  });

  it('con la venta cerrada (interruptor de G98) tampoco: reservar cobra dinero', async () => {
    h.salesOpen = false;
    const { stripe, calls } = fakeStripe();
    await rejects(bookClass(ADULT, request(), { stripe, now: NOW }), 'SALES_CLOSED');
    expect(h.created).toEqual([]);
    expect(calls.piCreate).toEqual([]);
  });

  it('el límite de tasa se aplica ANTES de consultar nada', async () => {
    h.rateAllowed = false;
    const { stripe } = fakeStripe();
    await rejects(bookClass(ADULT, request(), { stripe, now: NOW }), 'RATE_LIMIT');
    expect(h.created).toEqual([]);
  });

  it('sin Premium vigente no reserva', async () => {
    h.premium = null;
    const { stripe } = fakeStripe();
    await rejects(bookClass(ADULT, request(), { stripe, now: NOW }), 'PAYWALL');
    expect(h.created).toEqual([]);
  });

  it('sin fecha de nacimiento no reserva', async () => {
    const { stripe } = fakeStripe();
    await rejects(bookClass({ ...ADULT, birthDate: null }, request(), { stripe, now: NOW }), 'BIRTHDATE_REQUIRED');
    expect(h.created).toEqual([]);
  });

  it('un menor sin confirmación de su tutor no reserva', async () => {
    h.tutorConfirmed = false;
    const { stripe, calls } = fakeStripe();
    await rejects(bookClass(MINOR, request(), { stripe, now: NOW }), 'TUTOR_CONSENT_REQUIRED');
    expect(h.created).toEqual([]);
    expect(calls.piCreate).toEqual([]);
  });

  it('un profesor que no existe o no está ACTIVO es «no encontrado»', async () => {
    h.teacher = null;
    const { stripe } = fakeStripe();
    await rejects(bookClass(ADULT, request(), { stripe, now: NOW }), 'NOT_FOUND');
  });

  it('un profesor no puede reservar sus propias clases (inflaría su nivel)', async () => {
    const { stripe } = fakeStripe();
    await rejects(
      bookClass({ ...ADULT, profileId: 'ckteacheruser' }, request(), { stripe, now: NOW }),
      'FORBIDDEN'
    );
    expect(h.created).toEqual([]);
  });

  it('una hora fuera de la disponibilidad del profesor se rechaza', async () => {
    h.teacher = { ...baseTeacher(), availability: [{ weekday: 1, startMinute: 8 * 60, endMinute: 12 * 60 }] };
    const { stripe } = fakeStripe();
    await rejects(bookClass(ADULT, request(), { stripe, now: NOW }), 'OUT_OF_AVAILABILITY');
    expect(h.created).toEqual([]);
  });

  it('una hora con menos de 2 h de anticipación se rechaza', async () => {
    const { stripe } = fakeStripe();
    // Son las 10:00 en México y la clase es a las 11:00: dentro de la ventana, pero a 1 h.
    await rejects(
      bookClass(ADULT, request({ scheduledAt: new Date('2026-10-05T17:00:00Z') }), {
        stripe,
        now: new Date('2026-10-05T16:00:00Z'),
      }),
      'TOO_SOON'
    );
  });

  it('una clase posterior a la vigencia del Premium se rechaza', async () => {
    h.premium = { expiresAt: new Date('2026-10-07T00:00:00Z'), stripeCustomerId: 'cus_1' };
    const { stripe } = fakeStripe();
    await rejects(bookClass(ADULT, request(), { stripe, now: NOW }), 'OUT_OF_AVAILABILITY');
  });
});

describe('bookClass — el precio que se cobra es el que el alumno VIO', () => {
  it('si el precio cambió desde que lo vio, NO retiene ni cobra y le dice el nuevo', async () => {
    const { stripe, calls } = fakeStripe();
    const err = await bookClass(ADULT, request({ expectedPriceCents: EARLY.finalCents - 100 }), {
      stripe,
      now: NOW,
    }).then(
      () => null,
      (e) => e
    );
    expect(err).toBeInstanceOf(MarketplaceError);
    expect(err.code).toBe('CONFLICT');
    expect(err.message).toContain('cambió');
    expect(h.created).toEqual([]);
    expect(calls.piCreate).toEqual([]);
  });

  it('el desglose interno del tabulador no llega al mensaje de error (§5.0)', async () => {
    const { stripe } = fakeStripe();
    const err = await bookClass(ADULT, request({ expectedPriceCents: 1 }), { stripe, now: NOW }).then(
      () => null,
      (e) => e
    );
    expect(err.message).not.toMatch(/multiplicador|tope|1\.5|nivel|demanda/i);
  });
});

describe('bookClass — un click con la tarjeta guardada', () => {
  it('cobra EXACTAMENTE el precio de la clase, en MXN, solo tarjeta, con el alumno presente', async () => {
    const { stripe, calls } = fakeStripe();
    const res = await bookClass(ADULT, request(), { stripe, now: NOW });

    expect(res).toEqual({ status: 'PROCESSING', classId: 'ckclass1', priceCents: EARLY.finalCents });
    expect(calls.piCreate).toHaveLength(1);
    const { params, options } = calls.piCreate[0]!;
    expect(params).toMatchObject({
      amount: EARLY.finalCents,
      currency: 'mxn',
      customer: 'cus_1',
      payment_method: 'pm_1',
      payment_method_types: ['card'],
      confirm: true,
      off_session: false,
      metadata: { type: 'class_booking', classSessionId: 'ckclass1', method: 'ONE_CLICK' },
    });
    // Reintentar la misma reserva repite la clave: Stripe no cobra dos veces.
    expect(options.idempotencyKey).toBe('class-book-pi:ckclass1');
  });

  it('NO marca la clase como reservada: eso solo lo hace el webhook', async () => {
    const { stripe } = fakeStripe();
    await bookClass(ADULT, request(), { stripe, now: NOW });
    // Lo único que se escribe es la clase PENDING (createPendingClass) y el id del cobro.
    expect(h.created).toHaveLength(1);
    expect(h.attachedPi).toEqual([{ classId: 'ckclass1', pi: 'pi_1' }]);
    expect(h.abandoned).toEqual([]);
  });

  it('retiene el horario con el desglose sellado y la comisión del 25%', async () => {
    const { stripe } = fakeStripe();
    await bookClass(ADULT, request(), { stripe, now: NOW });
    const c = h.created[0] as {
      teacherId: string;
      studentProfileId: string;
      split: { commissionCents: number; teacherPayCents: number };
      tariff: { finalCents: number };
    };
    expect(c.teacherId).toBe('ckteacher001');
    expect(c.studentProfileId).toBe('ckstudent0001');
    expect(c.split.commissionCents + c.split.teacherPayCents).toBe(c.tariff.finalCents);
  });

  it('un cobro «processing» también cuenta como en curso', async () => {
    const { stripe } = fakeStripe({ piStatus: 'processing' });
    expect((await bookClass(ADULT, request(), { stripe, now: NOW })).status).toBe('PROCESSING');
  });

  it('usa el cliente de su Premium; sin él busca uno etiquetado y, si no, crea UNO con clave idempotente', async () => {
    h.premium = { expiresAt: null, stripeCustomerId: null };
    const a = fakeStripe({ found: 'cus_found', cards: [] });
    await bookClass(ADULT, request(), { stripe: a.stripe, now: NOW });
    expect(a.calls.customerCreate).toEqual([]);
    expect(a.calls.sessionCreate[0]!.params.customer).toBe('cus_found');

    const b = fakeStripe({ found: null, cards: [] });
    await bookClass(ADULT, request(), { stripe: b.stripe, now: NOW });
    expect(b.calls.customerCreate).toHaveLength(1);
    expect(b.calls.sessionCreate[0]!.params.customer).toBe('cus_new');
  });
});

describe('bookClass — Checkout hospedado (sin click posible)', () => {
  it('sin tarjeta guardada va a Checkout, vigente 31 min, con metadata en sesión Y en el PaymentIntent', async () => {
    const { stripe, calls } = fakeStripe({ cards: [] });
    const res = await bookClass(ADULT, request(), { stripe, now: NOW });

    expect(res).toMatchObject({
      status: 'REQUIRES_CHECKOUT',
      reason: 'NO_SAVED_CARD',
      checkoutUrl: 'https://checkout.stripe.test/cs_1',
    });
    expect(calls.piCreate).toEqual([]);
    const { params, options } = calls.sessionCreate[0]!;
    expect(params.mode).toBe('payment');
    expect(params.payment_method_types).toEqual(['card']);
    expect(params.line_items[0].price_data).toMatchObject({ currency: 'mxn', unit_amount: EARLY.finalCents });
    expect(params.expires_at).toBe(Math.floor(NOW.getTime() / 1000) + 31 * 60);
    // `payment_intent.succeeded` lleva la metadata del PaymentIntent, no la de la sesión.
    expect(params.metadata).toMatchObject({ type: 'class_booking', classSessionId: 'ckclass1' });
    expect(params.payment_intent_data.metadata).toMatchObject({
      type: 'class_booking',
      classSessionId: 'ckclass1',
      method: 'CHECKOUT',
    });
    // Guarda la tarjeta solo en la opción `card` (OXXO/SPEI no admiten guardarla).
    expect(params.payment_method_options).toEqual({ card: { setup_future_usage: 'on_session' } });
    expect(options.idempotencyKey).toBe('class-book-cs:ckclass1');
    expect(h.attachedSession).toEqual([{ classId: 'ckclass1', session: 'cs_1' }]);
  });

  it('la sesión de Checkout no acepta pago DESPUÉS de que el horario se suelta', async () => {
    const { PAYMENT_SLOT_RELEASE_MINUTES } = await import('@/lib/classes/policy');
    const { stripe, calls } = fakeStripe({ cards: [] });
    await bookClass(ADULT, request(), { stripe, now: NOW });
    const expiresInMin = (calls.sessionCreate[0]!.params.expires_at - Math.floor(NOW.getTime() / 1000)) / 60;
    expect(expiresInMin).toBeLessThan(PAYMENT_SLOT_RELEASE_MINUTES);
  });

  it('una tarjeta RECHAZADA pasa a Checkout (otra tarjeta) sin soltar el horario', async () => {
    const { stripe } = fakeStripe({
      piThrows: () => Object.assign(new Error('declined'), { type: 'StripeCardError' }),
    });
    const res = await bookClass(ADULT, request(), { stripe, now: NOW });
    expect(res).toMatchObject({ status: 'REQUIRES_CHECKOUT', reason: 'CARD_DECLINED' });
    expect(h.abandoned).toEqual([]);
  });

  it('una tarjeta que pide autenticación (3-D Secure) CANCELA el intento y pasa a Checkout', async () => {
    const { stripe, calls } = fakeStripe({ piStatus: 'requires_action' });
    const res = await bookClass(ADULT, request(), { stripe, now: NOW });
    expect(res).toMatchObject({ status: 'REQUIRES_CHECKOUT', reason: 'CARD_NEEDS_AUTH' });
    expect(calls.piCancel).toEqual(['pi_1']);
    expect(calls.sessionCreate).toHaveLength(1);
  });

  it('si Checkout no se puede crear, se SUELTA el horario (no hubo cobro posible) y se reporta', async () => {
    const { stripe } = fakeStripe({ cards: [], sessionThrows: true });
    await rejects(bookClass(ADULT, request(), { stripe, now: NOW }), 'UPSTREAM');
    expect(h.abandoned).toEqual([{ classId: 'ckclass1', reason: 'PAYMENT_SETUP_FAILED' }]);
    expect(h.reports.some((r) => r.control === 'payment_consistency' && r.stage === 'class_checkout')).toBe(true);
  });

  it('una sesión sin URL también suelta el horario', async () => {
    const { stripe } = fakeStripe({ cards: [], sessionUrl: null });
    await rejects(bookClass(ADULT, request(), { stripe, now: NOW }), 'UPSTREAM');
    expect(h.abandoned).toHaveLength(1);
  });
});

describe('bookClass — cuando no se sabe si Stripe cobró', () => {
  it('un fallo de RED reintenta con la MISMA clave y, si persiste, NO suelta el horario ni manda a pagar de nuevo', async () => {
    const { stripe, calls } = fakeStripe({
      piThrows: () => Object.assign(new Error('timeout'), { type: 'StripeConnectionError' }),
    });
    await rejects(bookClass(ADULT, request(), { stripe, now: NOW }), 'UPSTREAM');

    expect(calls.piCreate).toHaveLength(2);
    expect(calls.piCreate[0]!.options.idempotencyKey).toBe(calls.piCreate[1]!.options.idempotencyKey);
    // Soltarlo podría dejar un cargo sin clase; el webhook resuelve el caso en un sentido o en el otro.
    expect(h.abandoned).toEqual([]);
    expect(calls.sessionCreate).toEqual([]);
    expect(h.reports.some((r) => r.stage === 'class_one_click')).toBe(true);
  });

  it('un error inesperado de Stripe tampoco suelta el horario', async () => {
    const { stripe } = fakeStripe({ piThrows: () => new Error('algo raro') });
    await rejects(bookClass(ADULT, request(), { stripe, now: NOW }), 'UPSTREAM');
    expect(h.abandoned).toEqual([]);
  });
});

describe('bookClass — carrera por el mismo horario', () => {
  it('si otro se adelantó, SLOT_TAKEN y no se cobra nada', async () => {
    h.slotTaken = true;
    const { stripe, calls } = fakeStripe();
    await rejects(bookClass(ADULT, request(), { stripe, now: NOW }), 'SLOT_TAKEN');
    expect(calls.piCreate).toEqual([]);
    expect(calls.sessionCreate).toEqual([]);
  });
});

describe('bookClass — grabación (consentimiento expreso)', () => {
  const consentOf = () => (h.created[0] as { recordingConsent: boolean }).recordingConsent;

  it('un ADULTO que la acepta la habilita', async () => {
    const { stripe } = fakeStripe();
    await bookClass(ADULT, request({ recordingConsent: true }), { stripe, now: NOW });
    expect(consentOf()).toBe(true);
  });

  it('un ADULTO que no la acepta, no', async () => {
    const { stripe } = fakeStripe();
    await bookClass(ADULT, request({ recordingConsent: false }), { stripe, now: NOW });
    expect(consentOf()).toBe(false);
  });

  it('en un MENOR lo que él marque no cuenta: decide su tutor', async () => {
    h.tutorRecording = false;
    const { stripe } = fakeStripe();
    await bookClass(MINOR, request({ recordingConsent: true }), { stripe, now: NOW });
    expect(consentOf()).toBe(false);

    h.created.length = 0;
    h.tutorRecording = true;
    await bookClass(MINOR, request({ recordingConsent: false }), { stripe: fakeStripe().stripe, now: NOW });
    expect(consentOf()).toBe(true);
  });

  it('sin la política de grabación firmada por el profesor no se graba, aunque el alumno acepte', async () => {
    h.teacher = { ...baseTeacher(), recordingPolicyAccepted: false };
    const { stripe } = fakeStripe();
    await bookClass(ADULT, request({ recordingConsent: true }), { stripe, now: NOW });
    expect(consentOf()).toBe(false);
  });
});
