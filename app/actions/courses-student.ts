'use server';

import type Stripe from 'stripe';
import { revalidatePath } from 'next/cache';
import { AuthError } from '@/lib/auth/errors';
import { requireUser, requireVerifiedForPurchase } from '@/lib/auth/guards';
import { getSiteUrl } from '@/lib/auth/site-url';
import { prisma } from '@/lib/db/prisma';
import {
  CourseError,
  enrollFree,
  getEnrollment,
  lessonMediaAccess,
  rateCourse,
  saveLessonProgress,
} from '@/lib/db/courses';
import { findKnownStripeCustomerId } from '@/lib/db/access-extension';
import { COURSE_IMMEDIATE_ACCESS_CONSENT } from '@/lib/courses/rules';
import { COURSE_LIMITS } from '@/lib/courses/media';
import {
  coursePurchaseSchema,
  freeEnrollSchema,
  lessonProgressSchema,
  mediaUrlSchema,
  rateCourseSchema,
} from '@/lib/courses/schemas';
import { signedReadUrl } from '@/lib/courses/storage';
import { evaluateLegalGate, LEGAL_PENDING_MESSAGE } from '@/lib/marketplace/legal-gate';
import { readMarketplaceFlags } from '@/lib/marketplace/flags';
import { reportControlFailure } from '@/lib/observability/report';
import { consumeRateLimit } from '@/lib/rate-limit/store';
import type { ActionResult } from '@/lib/sessions/schemas';
import { getStripe } from '@/lib/stripe/client';
import { salesGate } from '@/lib/stripe/sales-gate';
import { SALES_CLOSED_CODE, SALES_CLOSED_MESSAGE } from '@/lib/stripe/sales-switch';

/**
 * G103 — acciones del ALUMNO sobre cursos (spec §2.7-2.8): comprar, inscribirse
 * gratis, reproducir, avanzar y calificar.
 *
 * Compra: igual que los planes — interruptor de ventas en la PRIMERA línea,
 * correo verificado, casilla del art. 56, precio del servidor (el de la base,
 * nunca el del cliente), sin códigos de promoción ni de referido, y la
 * inscripción SOLO la crea el webhook al confirmarse el pago.
 *
 * Reproducción: la URL firmada (vida de 1 h) se emite DESPUÉS de verificar la
 * inscripción vigente (o la lección de muestra de un curso publicado); además,
 * Storage vuelve a verificar con sus propias políticas.
 */

function fail(code: string, message: string): ActionResult<never> {
  return { ok: false, code, message };
}

export async function startCoursePurchaseAction(raw: unknown): Promise<ActionResult<{ url: string }>> {
  const gate = salesGate();
  if (!gate.open) return fail(SALES_CLOSED_CODE, SALES_CLOSED_MESSAGE);
  if (!readMarketplaceFlags().courses) return fail('NOT_FOUND', 'Esta sección no está disponible.');

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

  const parsed = coursePurchaseSchema.safeParse(raw);
  if (!parsed.success) return fail('VALIDATION', 'Para continuar acepta que tu acceso se active de inmediato.');

  const limit = await consumeRateLimit('COURSE_CHECKOUT', profileId);
  if (!limit.allowed) return fail('RATE_LIMIT', 'Espera unos minutos antes de volver a intentarlo.');

  const legal = evaluateLegalGate([COURSE_IMMEDIATE_ACCESS_CONSENT.version], process.env.VERCEL_ENV);
  if (!legal.ok) {
    reportControlFailure('legal_text_pending', 'fail-closed', new Error('Compra de curso con textos TODO-CLO'), { pending: legal.pending });
    return fail('LEGAL_PENDING', LEGAL_PENDING_MESSAGE);
  }

  const course = await prisma.course.findFirst({
    where: { slug: parsed.data.slug, status: 'PUBLISHED' },
    select: { id: true, slug: true, title: true, priceCents: true, isFree: true, teacher: { select: { userProfileId: true } } },
  });
  if (!course) return fail('NOT_FOUND', 'Este curso no está disponible.');
  if (course.isFree) return fail('FREE', 'Este curso es gratuito: inscríbete sin pagar.');
  if (course.teacher.userProfileId === profileId) return fail('OWN_COURSE', 'Es tu propio curso.');

  const existing = await getEnrollment(profileId, course.id);
  if (existing && existing.status !== 'REFUNDED') return fail('ALREADY_ENROLLED', 'Ya tienes este curso.');

  const now = new Date();
  const metadata: Stripe.MetadataParam = {
    kind: 'course_purchase',
    courseId: course.id,
    userProfileId: profileId,
    expectedAmountCents: String(course.priceCents),
    consentAt: now.toISOString(),
    consentVersion: COURSE_IMMEDIATE_ACCESS_CONSENT.version,
  };
  const stripe = getStripe();
  const site = getSiteUrl();
  try {
    const customer =
      (await findKnownStripeCustomerId(profileId)) ??
      (await stripe.customers.create({ ...(email ? { email } : {}), metadata: { userProfileId: profileId } })).id;
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer,
      payment_method_types: ['card', 'oxxo', 'customer_balance'],
      line_items: [
        { quantity: 1, price_data: { currency: 'mxn', unit_amount: course.priceCents, product_data: { name: `Curso: ${course.title}` } } },
      ],
      allow_promotion_codes: false,
      metadata,
      payment_intent_data: { metadata },
      payment_method_options: {
        oxxo: { expires_after_days: 3 },
        customer_balance: { funding_type: 'bank_transfer', bank_transfer: { type: 'mx_bank_transfer' } },
      },
      success_url: `${site}/mis-cursos/compra?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${site}/cursos/${course.slug}?cancelado=1`,
    });
    if (!session.url) throw new Error('Checkout sin URL');
    return { ok: true, data: { url: session.url } };
  } catch (err) {
    console.error('[courses] No se pudo crear el Checkout', err instanceof Error ? err.message : err);
    return fail('STRIPE', 'No pudimos iniciar el pago. Intenta de nuevo.');
  }
}

/** Curso GRATUITO: no hay dinero, así que no pasa por el interruptor de ventas. */
export async function enrollFreeCourseAction(raw: unknown): Promise<ActionResult<{ slug: string }>> {
  if (!readMarketplaceFlags().courses) return fail('NOT_FOUND', 'Esta sección no está disponible.');
  let profileId: string;
  try {
    profileId = (await requireUser()).profile.id;
  } catch (err) {
    if (err instanceof AuthError) return fail(err.code, err.message);
    throw err;
  }
  const parsed = freeEnrollSchema.safeParse(raw);
  if (!parsed.success) return fail('VALIDATION', 'Curso inválido.');
  const limit = await consumeRateLimit('COURSE_CHECKOUT', profileId);
  if (!limit.allowed) return fail('RATE_LIMIT', 'Espera unos minutos antes de volver a intentarlo.');
  const course = await prisma.course.findFirst({
    where: { slug: parsed.data.slug, status: 'PUBLISHED', isFree: true },
    select: { id: true, slug: true, totalLessons: true },
  });
  if (!course) return fail('NOT_FOUND', 'Este curso no está disponible.');
  await enrollFree(profileId, course.id, course.totalLessons, new Date());
  revalidatePath('/mis-cursos');
  return { ok: true, data: { slug: course.slug } };
}

/** URL firmada de vida corta para el video o el PDF de una lección. */
export async function getLessonMediaUrlAction(raw: unknown): Promise<ActionResult<{ url: string; expiresInSecs: number }>> {
  if (!readMarketplaceFlags().courses) return fail('NOT_FOUND', 'Esta sección no está disponible.');
  let profileId: string;
  let isAdmin: boolean;
  try {
    const { profile } = await requireUser();
    profileId = profile.id;
    isAdmin = profile.role === 'ADMIN';
  } catch (err) {
    if (err instanceof AuthError) return fail(err.code, err.message);
    throw err;
  }
  const parsed = mediaUrlSchema.safeParse(raw);
  if (!parsed.success) return fail('VALIDATION', 'Lección inválida.');
  const limit = await consumeRateLimit('COURSE_MEDIA_URL', profileId);
  if (!limit.allowed) return fail('RATE_LIMIT', 'Demasiadas solicitudes. Espera un momento.');

  const lesson = await lessonMediaAccess(parsed.data.lessonId, profileId, isAdmin);
  if (!lesson) return fail('FORBIDDEN', 'Esta lección es para alumnos inscritos.');
  const path = parsed.data.kind === 'video' ? lesson.videoPath : lesson.resourcePath;
  if (!path) return fail('NOT_FOUND', 'Esta lección todavía no tiene archivo.');
  const url = await signedReadUrl(path, COURSE_LIMITS.PLAYBACK_URL_TTL_SECONDS);
  if (!url) return fail('FORBIDDEN', 'No pudimos abrir esta lección. Intenta de nuevo.');
  return { ok: true, data: { url, expiresInSecs: COURSE_LIMITS.PLAYBACK_URL_TTL_SECONDS } };
}

export async function saveLessonProgressAction(raw: unknown): Promise<ActionResult<{ completed: boolean; progressPercent: number }>> {
  if (!readMarketplaceFlags().courses) return fail('NOT_FOUND', 'Esta sección no está disponible.');
  let profileId: string;
  try {
    profileId = (await requireUser()).profile.id;
  } catch (err) {
    if (err instanceof AuthError) return fail(err.code, err.message);
    throw err;
  }
  const parsed = lessonProgressSchema.safeParse(raw);
  if (!parsed.success) return fail('VALIDATION', 'Progreso inválido.');
  const limit = await consumeRateLimit('COURSE_PROGRESS', profileId);
  if (!limit.allowed) return fail('RATE_LIMIT', 'Demasiadas solicitudes.');
  try {
    const r = await saveLessonProgress({ userProfileId: profileId, ...parsed.data, now: new Date() });
    return { ok: true, data: r };
  } catch (err) {
    if (err instanceof CourseError) return fail(err.code, err.message);
    throw err;
  }
}

export async function rateCourseAction(raw: unknown): Promise<ActionResult<{ saved: true }>> {
  if (!readMarketplaceFlags().courses) return fail('NOT_FOUND', 'Esta sección no está disponible.');
  let profileId: string;
  try {
    profileId = (await requireUser()).profile.id;
  } catch (err) {
    if (err instanceof AuthError) return fail(err.code, err.message);
    throw err;
  }
  const parsed = rateCourseSchema.safeParse(raw);
  if (!parsed.success) return fail('VALIDATION', parsed.error.issues[0]?.message ?? 'Calificación inválida.');
  const limit = await consumeRateLimit('COURSE_REVIEW', profileId);
  if (!limit.allowed) return fail('RATE_LIMIT', 'Espera un momento antes de volver a calificar.');
  try {
    await rateCourse({ userProfileId: profileId, ...parsed.data, now: new Date() });
    return { ok: true, data: { saved: true } };
  } catch (err) {
    if (err instanceof CourseError) return fail(err.code, err.message);
    throw err;
  }
}
