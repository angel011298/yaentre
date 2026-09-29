import type Stripe from 'stripe';
import { getSiteUrl } from '@/lib/auth/site-url';
import { requiresTutorConsent } from '@/lib/legal/age';
import {
  abandonUnpaidClass,
  attachCheckoutSession,
  attachPaymentIntent,
  createPendingClass,
  getActivePremium,
  getTeacherForBooking,
} from '@/lib/db/classes';
import { hasConfirmedTutorConsent, hasTutorRecordingConsent } from '@/lib/db/tutor-consent';
import { marketplaceGate } from '@/lib/marketplace/marketplace-gate';
import { MARKETPLACE_CLOSED_MESSAGE } from '@/lib/marketplace/marketplace-switch';
import { reportControlFailure } from '@/lib/observability/report';
import { consumeRateLimit } from '@/lib/rate-limit/store';
import { salesGate } from '@/lib/stripe/sales-gate';
import { SALES_CLOSED_MESSAGE } from '@/lib/stripe/sales-switch';
import { CLASS_BOOKING_METADATA_TYPE } from '@/lib/stripe/class-payments';
import { parseStoredAvailability } from '@/lib/teachers/availability';
import { classEndsAt } from '@/lib/teachers/schedule';
import {
  SUBJECT_LABELS,
  calculateTariff,
  formatMxnFromCents,
  splitTariff,
} from '@/lib/teachers/tariff';
import { bookingRuleError, evaluateBookingRequest } from './booking-rules';
import { MarketplaceError } from './errors';
import { formatClassWhen } from './format';
import { CHECKOUT_EXPIRY_MINUTES, recordingConsentGranted } from './policy';
import { resolveStripeCustomer, type CustomerStripe } from './stripe-customer';

/**
 * RESERVA Y PAGO DE UNA CLASE — Bloque 2 (spec §6.1-6.2).
 *
 * Es el único camino que crea una clase y toca dinero, así que el ORDEN de las
 * comprobaciones es parte del contrato, y ninguna sale de la interfaz:
 *
 *   1. interruptor del marketplace y de ventas (default CERRADO, en el servidor);
 *   2. límite de tasa (contador compartido de Postgres);
 *   3. el alumno tiene Premium VIGENTE;
 *   4. fecha de nacimiento y, si es menor, confirmación de su tutor;
 *   5. el profesor existe, está ACTIVO y no es el propio alumno;
 *   6. reglas de la reserva (rejilla, ventana, anticipación, disponibilidad);
 *   7. el precio que el alumno VIO coincide con el que se va a cobrar;
 *   8. se retiene el horario (PENDING_PAYMENT) bajo los locks del profesor y del alumno;
 *   9. se cobra: un click con la tarjeta guardada, o Checkout hospedado.
 *
 * La clase NUNCA pasa a BOOKED aquí: solo el webhook verificado de Stripe la
 * reserva (guardrail de CLAUDE.md). Esta función devuelve «procesando» y la
 * pantalla espera a que el webhook confirme.
 *
 * El alumno (`student`) sale del guard del llamador — jamás de la petición.
 */

export interface BookingStudent {
  profileId: string;
  email: string | null;
  birthDate: Date | null;
}

export interface BookClassRequest {
  teacherId: string;
  subjectKey: string;
  scheduledAt: Date;
  durationMinutes: number;
  /** Solo cuenta si el alumno es ADULTO: en un menor decide su tutor. */
  recordingConsent: boolean;
  /** El precio final que el alumno VIO. Nunca se cobra uno distinto sin que lo vea. */
  expectedPriceCents: number;
}

export type CheckoutReason = 'NO_SAVED_CARD' | 'CARD_NEEDS_AUTH' | 'CARD_DECLINED';

export type BookClassResult =
  /** Cobro con la tarjeta guardada en curso; la clase queda BOOKED cuando llega el webhook. */
  | { status: 'PROCESSING'; classId: string; priceCents: number }
  /** Hay que pagar en el Checkout hospedado de Stripe. */
  | { status: 'REQUIRES_CHECKOUT'; classId: string; priceCents: number; checkoutUrl: string; reason: CheckoutReason };

/** El subconjunto de Stripe que la reserva usa: permite probarla sin red. */
export type BookingStripe = CustomerStripe & {
  paymentMethods: Pick<Stripe['paymentMethods'], 'list'>;
  paymentIntents: Pick<Stripe['paymentIntents'], 'create' | 'cancel'>;
  checkout: { sessions: Pick<Stripe['checkout']['sessions'], 'create'> };
};

export interface BookingDeps {
  stripe: BookingStripe;
  now: Date;
}

/** `payment_method_types` solo tarjeta: OXXO/SPEI no son un «click» y tardan días en confirmar. */
const CARD_ONLY: Stripe.PaymentIntentCreateParams['payment_method_types'] = ['card'];

function isStripeCardError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { type?: string }).type === 'StripeCardError';
}

function isStripeConnectionError(err: unknown): boolean {
  const type = typeof err === 'object' && err !== null ? (err as { type?: string }).type : undefined;
  return type === 'StripeConnectionError' || type === 'StripeAPIError';
}

export async function bookClass(
  student: BookingStudent,
  req: BookClassRequest,
  deps: BookingDeps
): Promise<BookClassResult> {
  const { stripe, now } = deps;

  // 1 ── Interruptores. La compra de una clase cobra dinero: exige AMBOS.
  if (!marketplaceGate().open) throw new MarketplaceError('MARKETPLACE_CLOSED', MARKETPLACE_CLOSED_MESSAGE);
  if (!salesGate().open) throw new MarketplaceError('SALES_CLOSED', SALES_CLOSED_MESSAGE);

  // 2 ── Límite de tasa.
  const limit = await consumeRateLimit('CLASS_BOOK', student.profileId);
  if (!limit.allowed) {
    throw new MarketplaceError('RATE_LIMIT', 'Estás reservando muy rápido. Espera un momento e intenta de nuevo.');
  }

  // 3 ── Premium vigente.
  const premium = await getActivePremium(student.profileId, now);
  if (!premium) {
    throw new MarketplaceError('PAYWALL', 'Las clases con profesor son parte del plan Premium.');
  }

  // 4 ── Menores.
  if (!student.birthDate) {
    throw new MarketplaceError(
      'BIRTHDATE_REQUIRED',
      'Necesitamos tu fecha de nacimiento antes de reservar. Complétala en tu perfil.'
    );
  }
  const studentIsMinor = requiresTutorConsent(student.birthDate, now);
  if (studentIsMinor && !(await hasConfirmedTutorConsent(student.profileId))) {
    throw new MarketplaceError(
      'TUTOR_CONSENT_REQUIRED',
      'Como eres menor de edad, tu madre, padre o tutor debe confirmar tu inscripción antes de reservar clases.'
    );
  }

  // 5 ── Profesor.
  const teacher = await getTeacherForBooking(req.teacherId);
  if (!teacher) throw new MarketplaceError('NOT_FOUND', 'Ese profesor ya no está disponible.');
  if (teacher.userProfileId === student.profileId) {
    // Un profesor que reserva sus propias clases infla sus métricas y su nivel.
    throw new MarketplaceError('FORBIDDEN', 'No puedes reservar una clase contigo mismo.');
  }

  // 6 ── Reglas de la reserva → categorías de tarifa.
  const rules = evaluateBookingRequest({
    subjectKey: req.subjectKey,
    durationMinutes: req.durationMinutes,
    scheduledAt: req.scheduledAt,
    now,
    offeredSubjects: teacher.subjects,
    availability: parseStoredAvailability(teacher.availability),
    teacherLevel: teacher.level,
    planExpiresAt: premium.expiresAt,
  });
  if (!rules.ok) throw bookingRuleError(rules.error);

  // 7 ── El precio que se cobra es el que el alumno vio.
  const tariff = calculateTariff(rules.tariffParams);
  if (tariff.finalCents !== req.expectedPriceCents) {
    throw new MarketplaceError(
      'CONFLICT',
      `El precio de esa hora cambió a ${formatMxnFromCents(tariff.finalCents)}. Revísalo y confirma de nuevo.`
    );
  }
  const split = splitTariff(tariff.finalCents);

  // Grabación: necesita el consentimiento del lado correcto Y la política del profesor.
  const recordingConsent = recordingConsentGranted({
    studentIsMinor,
    tutorRecordingConsent: studentIsMinor ? await hasTutorRecordingConsent(student.profileId) : false,
    adultRecordingConsent: req.recordingConsent,
    teacherAcceptedRecordingPolicy: teacher.recordingPolicyAccepted,
  });

  // 8 ── Retiene el horario. Falla con SLOT_TAKEN si otro se adelantó.
  const pending = await createPendingClass({
    studentProfileId: student.profileId,
    teacherId: teacher.id,
    subjectKey: rules.subjectKey,
    scheduledAt: req.scheduledAt,
    durationMinutes: rules.durationMinutes,
    tariff,
    split,
    recordingConsent,
    now,
  });

  const charge: ChargeContext = {
    classId: pending.id,
    priceCents: pending.finalTariffCents,
    subjectLabel: SUBJECT_LABELS[rules.subjectKey],
    teacherName: teacher.publicName,
    whenLabel: formatClassWhen(req.scheduledAt),
    endsAt: classEndsAt(req.scheduledAt, rules.durationMinutes),
  };

  // 9 ── Cobro. Solo se suelta el horario cuando se SABE que no hubo cargo.
  let customerId: string;
  try {
    customerId = await resolveStripeCustomer(stripe, {
      profileId: student.profileId,
      email: student.email,
      knownCustomerId: premium.stripeCustomerId,
    });
  } catch (err) {
    await abandonUnpaidClass(pending.id, 'PAYMENT_SETUP_FAILED', now);
    reportControlFailure('payment_consistency', 'fail-closed', err, { classId: pending.id, stage: 'class_customer' });
    throw new MarketplaceError('UPSTREAM', 'No pudimos iniciar el pago. Intenta de nuevo en un momento.');
  }

  const oneClick = await tryOneClickCharge(stripe, customerId, charge);
  if (oneClick.kind === 'PROCESSING') {
    return { status: 'PROCESSING', classId: charge.classId, priceCents: charge.priceCents };
  }

  const checkoutUrl = await createHostedCheckout(stripe, customerId, charge, now);
  return {
    status: 'REQUIRES_CHECKOUT',
    classId: charge.classId,
    priceCents: charge.priceCents,
    checkoutUrl,
    reason: oneClick.reason,
  };
}

// ─────────────────────────────── Cobro ───────────────────────────────

interface ChargeContext {
  classId: string;
  priceCents: number;
  subjectLabel: string;
  teacherName: string;
  whenLabel: string;
  endsAt: Date;
}

type OneClickOutcome = { kind: 'PROCESSING' } | { kind: 'FALLBACK'; reason: CheckoutReason };

/**
 * Cobra con la tarjeta guardada. Devuelve `PROCESSING` cuando Stripe aceptó el
 * cobro (la reserva se concreta por webhook) y `FALLBACK` cuando NO hubo cargo y
 * hay que pasar al Checkout hospedado: sin tarjeta guardada, tarjeta que pide
 * autenticación (3-D Secure, que un cobro en servidor no puede completar) o
 * tarjeta rechazada.
 *
 * Un error de RED es distinto: el cobro pudo haberse hecho. Se reintenta con la
 * MISMA clave de idempotencia (Stripe devuelve el mismo resultado, no cobra
 * dos veces) y, si sigue sin respuesta, NO se suelta el horario ni se manda al
 * alumno a pagar otra vez: se le pide esperar. Soltarlo podría dejar un cargo sin
 * clase; el webhook lo resuelve solo en un sentido o en el otro.
 */
async function tryOneClickCharge(
  stripe: BookingStripe,
  customerId: string,
  c: ChargeContext
): Promise<OneClickOutcome> {
  let methods: Stripe.ApiList<Stripe.PaymentMethod>;
  try {
    methods = await stripe.paymentMethods.list({ customer: customerId, type: 'card', limit: 1 });
  } catch (err) {
    // Sin poder LEER las tarjetas, lo seguro es el Checkout hospedado (que no
    // cobra nada sin que la persona lo confirme).
    reportControlFailure('payment_consistency', 'fail-closed', err, { classId: c.classId, stage: 'list_cards' });
    return { kind: 'FALLBACK', reason: 'NO_SAVED_CARD' };
  }
  const card = methods.data[0];
  if (!card) return { kind: 'FALLBACK', reason: 'NO_SAVED_CARD' };

  const params: Stripe.PaymentIntentCreateParams = {
    amount: c.priceCents,
    currency: 'mxn',
    customer: customerId,
    payment_method: card.id,
    payment_method_types: CARD_ONLY,
    confirm: true,
    // El alumno está presente (acaba de hacer el click): no es un cobro «fuera de sesión».
    off_session: false,
    description: `Clase de ${c.subjectLabel} — YaEntre`,
    metadata: { type: CLASS_BOOKING_METADATA_TYPE, classSessionId: c.classId, method: 'ONE_CLICK' },
  };
  const options = { idempotencyKey: `class-book-pi:${c.classId}` };

  let intent: Stripe.PaymentIntent | null = null;
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2 && !intent; attempt += 1) {
    try {
      intent = await stripe.paymentIntents.create(params, options);
    } catch (err) {
      lastErr = err;
      if (isStripeCardError(err)) return { kind: 'FALLBACK', reason: 'CARD_DECLINED' };
      if (!isStripeConnectionError(err)) break;
    }
  }
  if (!intent) {
    reportControlFailure('payment_consistency', 'degraded', lastErr, { classId: c.classId, stage: 'class_one_click' });
    throw new MarketplaceError(
      'UPSTREAM',
      'No pudimos confirmar el cobro. Revisa tus clases en unos minutos antes de volver a intentarlo, para no pagar dos veces.'
    );
  }

  // De aquí en adelante el cobro EXISTE: se guarda su id para poder reconciliarlo si el webhook se pierde.
  await attachPaymentIntent(c.classId, intent.id);

  if (intent.status === 'succeeded' || intent.status === 'processing') return { kind: 'PROCESSING' };

  // `requires_action` (3-D Secure) o cualquier otro estado sin cobro: se cancela el
  // intento para que no quede un cobro pendiente y se pasa al Checkout hospedado.
  try {
    await stripe.paymentIntents.cancel(intent.id, undefined, { idempotencyKey: `class-cancel-pi:${intent.id}` });
  } catch (err) {
    reportControlFailure('payment_consistency', 'degraded', err, {
      classId: c.classId,
      stage: 'cancel_unconfirmed_intent',
    });
  }
  return { kind: 'FALLBACK', reason: intent.status === 'requires_action' ? 'CARD_NEEDS_AUTH' : 'CARD_DECLINED' };
}

/**
 * Checkout hospedado por Stripe. Es la vía cuando no hay tarjeta guardada o no
 * se pudo cobrar con un click. Guarda la tarjeta (`on_session`, solo la opción
 * `card`: OXXO/SPEI no admiten guardar el método) para que la próxima reserva SÍ
 * sea de un click, y vence a los `CHECKOUT_EXPIRY_MINUTES` — antes de que el
 * horario retenido se suelte, para que nadie pueda pagar una hora ya ofrecida.
 *
 * Si la sesión no se puede crear, el horario se suelta: no hubo cobro posible.
 */
async function createHostedCheckout(
  stripe: BookingStripe,
  customerId: string,
  c: ChargeContext,
  now: Date
): Promise<string> {
  const site = getSiteUrl();
  const metadata = { type: CLASS_BOOKING_METADATA_TYPE, classSessionId: c.classId };

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        payment_method_types: ['card'],
        customer: customerId,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: 'mxn',
              unit_amount: c.priceCents,
              product_data: { name: `Clase de ${c.subjectLabel} con ${c.teacherName} — ${c.whenLabel}` },
            },
          },
        ],
        payment_method_options: { card: { setup_future_usage: 'on_session' } },
        // La metadata va en la sesión (para `checkout.session.expired`) Y en el
        // PaymentIntent (para `payment_intent.succeeded`): son dos eventos distintos.
        metadata,
        payment_intent_data: { metadata: { ...metadata, method: 'CHECKOUT' } },
        expires_at: Math.floor(now.getTime() / 1000) + CHECKOUT_EXPIRY_MINUTES * 60,
        // La página de resultado LEE el estado real de la clase: llegar a esta URL no reserva nada.
        success_url: `${site}/app/clases?reserva=${c.classId}`,
        cancel_url: `${site}/app/clases?reserva=${c.classId}&cancelada=1`,
      },
      { idempotencyKey: `class-book-cs:${c.classId}` }
    );
  } catch (err) {
    await abandonUnpaidClass(c.classId, 'PAYMENT_SETUP_FAILED', now);
    reportControlFailure('payment_consistency', 'fail-closed', err, { classId: c.classId, stage: 'class_checkout' });
    throw new MarketplaceError('UPSTREAM', 'No pudimos iniciar el pago. Intenta de nuevo en un momento.');
  }

  if (!session.url) {
    await abandonUnpaidClass(c.classId, 'PAYMENT_SETUP_FAILED', now);
    throw new MarketplaceError('UPSTREAM', 'No pudimos iniciar el pago. Intenta de nuevo en un momento.');
  }

  try {
    await attachCheckoutSession(c.classId, session.id);
  } catch (err) {
    // La sesión existe pero no quedó ligada: el webhook igual encuentra la clase
    // por su metadata, así que el pago no se pierde. Se avisa, no se tumba.
    reportControlFailure('payment_consistency', 'degraded', err, {
      classId: c.classId,
      checkoutSessionId: session.id,
      stage: 'attach_checkout_session',
    });
  }
  return session.url;
}
