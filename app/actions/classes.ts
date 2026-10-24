'use server';

import type Stripe from 'stripe';
import { revalidatePath } from 'next/cache';
import { AuthError } from '@/lib/auth/errors';
import { requireVerifiedForPurchase, requireUser } from '@/lib/auth/guards';
import { getSiteUrl } from '@/lib/auth/site-url';
import {
  attachPaymentRefs,
  createClassHold,
  findStudentStripeCustomerId,
  getBookableTeacher,
  getClassForStudent,
  getClassForTeacher,
  HOLD_MINUTES,
  loadSlotInputs,
  markClassCancelled,
  markClassCompleted,
  releaseHold,
} from '@/lib/db/classes';
import { hasPremiumAccess } from '@/lib/db/premium-access';
import { readMarketplaceFlags } from '@/lib/marketplace/flags';
import { splitMarketplaceRevenue } from '@/lib/marketplace/commission';
import { evaluateLegalGate, LEGAL_PENDING_MESSAGE } from '@/lib/marketplace/legal-gate';
import { reportControlFailure } from '@/lib/observability/report';
import { consumeRateLimit } from '@/lib/rate-limit/store';
import type { ActionResult } from '@/lib/sessions/schemas';
import { getStripe } from '@/lib/stripe/client';
import { salesGate } from '@/lib/stripe/sales-gate';
import { SALES_CLOSED_CODE, SALES_CLOSED_MESSAGE } from '@/lib/stripe/sales-switch';
import { requireTeacher } from '@/lib/teachers/guard';
import { bookClassSchema, classIdSchema, type BookClassInput } from '@/lib/teachers/schemas';
import { calculateAvailableSlots, findSlot } from '@/lib/teachers/slot-calculator';
import { subjectLabel } from '@/lib/teachers/subject-catalog';
import { calculateTariff, DEFAULT_DEMAND_CATEGORY } from '@/lib/teachers/tariff';
import { ADULT_DECLARATION, canBookTrack, TRACK_DENIAL_MESSAGES } from '@/lib/teachers/track-access';

/**
 * G103 — reserva de clases en vivo «en un clic» (spec §1.6, marketplace §6).
 *
 * El acceso a la clase SOLO lo confirma el webhook (`payment_intent.succeeded`
 * o `checkout.session.completed`); esta acción aparta el horario y lanza el
 * cobro. Reglas, en este orden:
 *   1. interruptor de ventas (G98) — antes de la identidad y de Stripe;
 *   2. bandera del marketplace;
 *   3. correo verificado (`requireVerifiedForPurchase`);
 *   4. validación estricta (sin montos ni ids de usuario del cliente);
 *   5. límite de tasa compartido;
 *   6. textos legales (en producción, un `TODO-CLO` cierra la reserva);
 *   7. PISTA: ADMISION exige Premium vigente; REGULARIZACION es abierta;
 *      ambas exigen la declaración de mayoría de edad;
 *   8. el horario tiene que ser EXACTAMENTE uno de los que el servidor
 *      ofrece hoy (disponibilidad, bloqueos, 4 h, 30 días, choques);
 *   9. la tarifa la calcula el servidor con el tabulador;
 *  10. apartado con candado por profesor + restricción de exclusión.
 * Cobro: tarjeta guardada → PaymentIntent confirmado aquí (3DS por
 * redirección); sin tarjeta → Checkout que la guarda para la próxima.
 */

type BookingStatus = 'booked' | 'processing' | 'requires_action' | 'checkout';
export type BookingResult = ActionResult<{ status: BookingStatus; classSessionId: string; url?: string }>;

function fail(code: string, message: string): ActionResult<never> {
  return { ok: false, code, message };
}

function piOutcome(pi: Stripe.PaymentIntent, classSessionId: string): BookingResult {
  if (pi.status === 'succeeded' || pi.status === 'processing') {
    return { ok: true, data: { status: 'processing', classSessionId } };
  }
  if (pi.status === 'requires_action' && pi.next_action?.redirect_to_url?.url) {
    return { ok: true, data: { status: 'requires_action', classSessionId, url: pi.next_action.redirect_to_url.url } };
  }
  return fail('CARD_DECLINED', 'Tu banco no autorizó el cargo. Prueba con otra tarjeta.');
}

export async function bookClassAction(
  raw: BookClassInput & { useNewCard?: boolean }
): Promise<BookingResult> {
  const gate = salesGate();
  if (!gate.open) return fail(SALES_CLOSED_CODE, SALES_CLOSED_MESSAGE);

  const flags = readMarketplaceFlags();
  if (!flags.liveClasses) return fail('NOT_FOUND', 'Esta sección no está disponible.');

  let profileId: string;
  let email: string | undefined;
  try {
    const { authUser, profile } = await requireVerifiedForPurchase();
    profileId = profile.id;
    email = authUser.email ?? undefined;
  } catch (err) {
    if (err instanceof AuthError) return fail(err.code, err.message);
    throw err;
  }

  const { useNewCard, ...rest } = raw ?? ({} as BookClassInput & { useNewCard?: boolean });
  const parsed = bookClassSchema.safeParse(rest);
  if (!parsed.success) return fail('VALIDATION', parsed.error.issues[0]?.message ?? 'Revisa los datos de la reserva.');
  const input = parsed.data;

  const limit = await consumeRateLimit('CLASS_BOOKING', profileId);
  if (!limit.allowed) return fail('RATE_LIMIT', 'Hiciste varios intentos seguidos. Espera unos minutos.');

  const legal = evaluateLegalGate([ADULT_DECLARATION.version], process.env.VERCEL_ENV);
  if (!legal.ok) {
    reportControlFailure('legal_text_pending', 'fail-closed', new Error('Reserva de clase con textos TODO-CLO'), {
      pending: legal.pending,
    });
    return fail('LEGAL_PENDING', LEGAL_PENDING_MESSAGE);
  }

  const now = new Date();
  const access = canBookTrack({
    track: input.track,
    flags,
    hasPremiumAccess: input.track === 'ADMISION' ? await hasPremiumAccess(profileId, now) : false,
    adultDeclared: input.adultDeclared,
  });
  if (!access.allowed) return fail(access.reason, TRACK_DENIAL_MESSAGES[access.reason]);

  const teacher = await getBookableTeacher(input.teacherId, input.track);
  if (!teacher || !teacher.subjects.some((s) => s.subjectKey === input.subjectKey)) {
    return fail('NOT_FOUND', 'Este profesor no da esa materia.');
  }
  if (teacher.userProfileId === profileId) return fail('VALIDATION', 'No puedes reservar una clase contigo.');

  const startsAt = new Date(input.startsAt);
  const slotInputs = await loadSlotInputs(teacher.id, now);
  const slot = findSlot(
    calculateAvailableSlots({
      availability: slotInputs.availability,
      blockedDates: slotInputs.blockedDates,
      existingBookings: slotInputs.bookings,
      durationMinutes: input.durationMinutes,
      now,
    }),
    startsAt
  );
  if (!slot) return fail('SLOT_TAKEN', 'Ese horario ya no está disponible. Elige otro.');

  const tariff = calculateTariff({
    track: input.track,
    subjectKey: input.subjectKey,
    teacherLevel: teacher.level,
    durationMinutes: input.durationMinutes,
    advanceCategory: slot.advanceCategory,
    scheduleCategory: slot.scheduleCategory,
    demandCategory: DEFAULT_DEMAND_CATEGORY,
  });
  const split = splitMarketplaceRevenue(tariff.finalCents);

  const hold = await createClassHold({
    teacherId: teacher.id,
    studentProfileId: profileId,
    track: input.track,
    subjectKey: input.subjectKey,
    scheduledAt: startsAt,
    durationMinutes: input.durationMinutes,
    idempotencyKey: input.idempotencyKey,
    tariff,
    split,
    adultDeclarationVersion: ADULT_DECLARATION.version,
    now,
  });
  if (!hold.ok) {
    return hold.reason === 'SLOT_TAKEN'
      ? fail('SLOT_TAKEN', 'Ese horario se acaba de ocupar. Elige otro.')
      : fail('VALIDATION', 'Vuelve a intentarlo desde el calendario.');
  }
  const cls = hold.classSession;

  // Doble clic / reintento del mismo intento: se informa el estado que ya hay.
  if (hold.replay) {
    if (cls.paidAt) return { ok: true, data: { status: 'booked', classSessionId: cls.id } };
    if (cls.status !== 'PENDING_PAYMENT') return fail('EXPIRED', 'Esta reserva ya no está activa. Elige otro horario.');
    if (cls.stripePaymentId) {
      try {
        return piOutcome(await getStripe().paymentIntents.retrieve(cls.stripePaymentId), cls.id);
      } catch {
        return { ok: true, data: { status: 'processing', classSessionId: cls.id } };
      }
    }
    if (cls.stripeCheckoutSessionId) {
      try {
        const s = await getStripe().checkout.sessions.retrieve(cls.stripeCheckoutSessionId);
        if (s.status === 'open' && s.url) return { ok: true, data: { status: 'checkout', classSessionId: cls.id, url: s.url } };
      } catch {
        /* se cae al mensaje genérico */
      }
    }
    return { ok: true, data: { status: 'processing', classSessionId: cls.id } };
  }

  const stripe = getStripe();
  const site = getSiteUrl();
  const label = `Clase de ${subjectLabel(input.subjectKey)} — ${input.durationMinutes} min`;
  const metadata: Stripe.MetadataParam = {
    kind: 'class_booking',
    classSessionId: cls.id,
    studentProfileId: profileId,
    teacherId: teacher.id,
  };

  let customerId: string;
  try {
    customerId =
      (await findStudentStripeCustomerId(profileId)) ??
      (await stripe.customers.create({ ...(email ? { email } : {}), metadata: { userProfileId: profileId } })).id;
    await attachPaymentRefs(cls.id, { stripeCustomerId: customerId });
  } catch (err) {
    await releaseHold(cls.id, 'stripe_customer_failed', now);
    console.error('[classes] No se pudo preparar el Customer de Stripe', err instanceof Error ? err.message : err);
    return fail('STRIPE', 'No pudimos iniciar el pago. Intenta de nuevo.');
  }

  // ── Un clic con la tarjeta guardada ──────────────────────────────────────
  if (!useNewCard) {
    let card: Stripe.PaymentMethod | undefined;
    try {
      card = (await stripe.paymentMethods.list({ customer: customerId, type: 'card', limit: 1 })).data[0];
    } catch {
      card = undefined;
    }
    if (card) {
      try {
        const pi = await stripe.paymentIntents.create(
          {
            amount: tariff.finalCents,
            currency: 'mxn',
            customer: customerId,
            payment_method: card.id,
            payment_method_types: ['card'],
            confirm: true,
            return_url: `${site}/clases/reserva/${cls.id}`,
            description: label,
            metadata: { ...metadata, flow: 'one_click' },
          },
          { idempotencyKey: `class-pi-${cls.id}` }
        );
        await attachPaymentRefs(cls.id, { stripePaymentId: pi.id });
        const out = piOutcome(pi, cls.id);
        if (!out.ok) await releaseHold(cls.id, 'payment_failed', now);
        return out;
      } catch (err) {
        await releaseHold(cls.id, 'payment_failed', now);
        const declined = (err as { type?: string })?.type === 'StripeCardError';
        return declined
          ? fail('CARD_DECLINED', 'Tu banco no autorizó el cargo. Prueba con otra tarjeta.')
          : fail('STRIPE', 'No pudimos procesar el pago. Intenta de nuevo.');
      }
    }
  }

  // ── Sin tarjeta guardada (o «usar otra tarjeta»): Checkout que la guarda ──
  try {
    const session = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            quantity: 1,
            price_data: { currency: 'mxn', unit_amount: tariff.finalCents, product_data: { name: label } },
          },
        ],
        allow_promotion_codes: false,
        payment_intent_data: { setup_future_usage: 'on_session', metadata: { ...metadata, flow: 'checkout' } },
        metadata,
        expires_at: Math.floor(now.getTime() / 1000) + (HOLD_MINUTES - 1) * 60,
        success_url: `${site}/clases/reserva/${cls.id}`,
        cancel_url: `${site}/clases/reserva/${cls.id}?cancelado=1`,
      },
      { idempotencyKey: `class-cs-${cls.id}` }
    );
    await attachPaymentRefs(cls.id, { stripeCheckoutSessionId: session.id });
    if (!session.url) throw new Error('Checkout sin URL');
    return { ok: true, data: { status: 'checkout', classSessionId: cls.id, url: session.url } };
  } catch (err) {
    await releaseHold(cls.id, 'checkout_failed', now);
    console.error('[classes] No se pudo crear el Checkout', err instanceof Error ? err.message : err);
    return fail('STRIPE', 'No pudimos iniciar el pago. Intenta de nuevo.');
  }
}

/** Reembolso total por Stripe, idempotente por clase. */
async function refundClass(paymentIntentId: string, classSessionId: string, cause: string) {
  return getStripe().refunds.create(
    { payment_intent: paymentIntentId, metadata: { classSessionId, cause } },
    { idempotencyKey: `refund-class-${cause}-${classSessionId}` }
  );
}

// Un archivo 'use server' solo puede EXPORTAR funciones async: la constante
// es local (la interfaz repite el «24 h» en su texto).
const STUDENT_FREE_CANCEL_HOURS = 24;

/** Cancelación del alumno: sin costo hasta 24 h antes (reembolso total). */
export async function cancelClassByStudentAction(raw: unknown): Promise<ActionResult<{ cancelled: true }>> {
  if (!readMarketplaceFlags().liveClasses) return fail('NOT_FOUND', 'Esta sección no está disponible.');
  let profileId: string;
  try {
    profileId = (await requireUser()).profile.id;
  } catch (err) {
    if (err instanceof AuthError) return fail(err.code, err.message);
    throw err;
  }
  const parsed = classIdSchema.safeParse(raw);
  if (!parsed.success) return fail('VALIDATION', 'Clase inválida.');

  const limit = await consumeRateLimit('CLASS_CANCEL', profileId);
  if (!limit.allowed) return fail('RATE_LIMIT', 'Espera un momento antes de volver a intentarlo.');

  const cls = await getClassForStudent(parsed.data.classSessionId, profileId);
  if (!cls) return fail('NOT_FOUND', 'No encontramos esa clase.');
  if (!['BOOKED', 'CONFIRMED'].includes(cls.status) || !cls.paidAt || !cls.stripePaymentId) {
    return fail('NOT_CANCELLABLE', 'Esta clase ya no se puede cancelar.');
  }
  const now = new Date();
  const hoursLeft = (cls.scheduledAt.getTime() - now.getTime()) / 3_600_000;
  if (hoursLeft < STUDENT_FREE_CANCEL_HOURS) {
    return fail(
      'TOO_LATE',
      'Faltan menos de 24 horas para la clase, así que ya no se puede cancelar desde la app. Escríbenos si tuviste un imprevisto.'
    );
  }

  try {
    const refund = await refundClass(cls.stripePaymentId, cls.id, 'student_cancel');
    await markClassCancelled(cls.id, {
      by: 'STUDENT',
      reason: 'student_cancel',
      refundId: refund.id,
      refundedCents: cls.finalTariffCents,
      now,
    });
  } catch (err) {
    reportControlFailure('class_booking', 'fail-closed', err, { classSessionId: cls.id, stage: 'student_cancel' });
    return fail('STRIPE', 'No pudimos procesar el reembolso. Tu clase sigue reservada; intenta de nuevo.');
  }
  revalidatePath('/clases/mis-clases');
  return { ok: true, data: { cancelled: true } };
}

/** Cancelación del profesor (antes de la clase): reembolso total al alumno. */
export async function cancelClassByTeacherAction(raw: unknown): Promise<ActionResult<{ cancelled: true }>> {
  if (!readMarketplaceFlags().liveClasses) return fail('NOT_FOUND', 'Esta sección no está disponible.');
  let teacherId: string;
  let profileId: string;
  try {
    const ctx = await requireTeacher({ active: false });
    teacherId = ctx.teacher.id;
    profileId = ctx.profile.id;
  } catch (err) {
    if (err instanceof AuthError) return fail(err.code, err.message);
    throw err;
  }
  const parsed = classIdSchema.safeParse(raw);
  if (!parsed.success) return fail('VALIDATION', 'Clase inválida.');
  const limit = await consumeRateLimit('CLASS_CANCEL', profileId);
  if (!limit.allowed) return fail('RATE_LIMIT', 'Espera un momento antes de volver a intentarlo.');

  const cls = await getClassForTeacher(parsed.data.classSessionId, teacherId);
  if (!cls) return fail('NOT_FOUND', 'No encontramos esa clase.');
  const now = new Date();
  if (!['BOOKED', 'CONFIRMED'].includes(cls.status) || !cls.stripePaymentId || cls.scheduledAt <= now) {
    return fail('NOT_CANCELLABLE', 'Esta clase ya no se puede cancelar.');
  }
  try {
    const refund = await refundClass(cls.stripePaymentId, cls.id, 'teacher_cancel');
    await markClassCancelled(cls.id, {
      by: 'TEACHER',
      reason: 'teacher_cancel',
      refundId: refund.id,
      refundedCents: cls.finalTariffCents,
      now,
    });
  } catch (err) {
    reportControlFailure('class_booking', 'fail-closed', err, { classSessionId: cls.id, stage: 'teacher_cancel' });
    return fail('STRIPE', 'No pudimos procesar el reembolso. La clase sigue reservada; intenta de nuevo.');
  }
  revalidatePath('/profesor/clases');
  return { ok: true, data: { cancelled: true } };
}

/** El profesor marca la clase como impartida, una vez terminada. Entra a la liquidación. */
export async function completeClassAction(raw: unknown): Promise<ActionResult<{ completed: true }>> {
  if (!readMarketplaceFlags().liveClasses) return fail('NOT_FOUND', 'Esta sección no está disponible.');
  let teacherId: string;
  try {
    teacherId = (await requireTeacher({ active: true })).teacher.id;
  } catch (err) {
    if (err instanceof AuthError) return fail(err.code, err.message);
    throw err;
  }
  const parsed = classIdSchema.safeParse(raw);
  if (!parsed.success) return fail('VALIDATION', 'Clase inválida.');
  const cls = await getClassForTeacher(parsed.data.classSessionId, teacherId);
  if (!cls) return fail('NOT_FOUND', 'No encontramos esa clase.');
  const now = new Date();
  const end = cls.scheduledAt.getTime() + cls.durationMinutes * 60_000;
  if (now.getTime() < end) return fail('TOO_EARLY', 'Podrás marcarla como impartida cuando termine.');
  const ok = await markClassCompleted(cls.id, now);
  if (!ok) return fail('NOT_COMPLETABLE', 'Esta clase no se puede marcar como impartida.');
  revalidatePath('/profesor/clases');
  return { ok: true, data: { completed: true } };
}
