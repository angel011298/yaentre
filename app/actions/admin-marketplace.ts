'use server';

import { revalidatePath } from 'next/cache';
import type { z } from 'zod';
import { AuthError } from '@/lib/auth/errors';
import { requireRole } from '@/lib/auth/guards';
import { logAdminAction, type AdminAuditAction, type AdminAuditTargetKind } from '@/lib/admin/audit-log';
import { MASTER_ADMIN_DENIED_MESSAGE, masterCandidateEmail, requireMasterAdmin } from '@/lib/admin/master';
import {
  computePayoutsSchema,
  courseReviewSchema,
  payoutActionSchema,
  reviewModerationSchema,
  teacherReviewSchema,
  type ActionResult,
} from '@/lib/admin/schemas';
import { setCourseStatusByAdmin, setReviewHidden } from '@/lib/db/courses';
import { applyPayoutDecision, computeWeekPayouts } from '@/lib/db/payouts';
import { payoutWeek } from '@/lib/teachers/payout-calculator';
import { getTeacherForAdmin, setTeacherStatus } from '@/lib/db/teachers';
import { consumeRateLimit } from '@/lib/rate-limit/store';

/**
 * G103 — moderación del marketplace desde /admin: alta de profesores, revisión
 * de cursos y reseñas, y liquidaciones a profesores.
 *
 * EXCEPCIÓN G99 al guardrail «no aceptar un id como entrada»: aquí el id es el
 * del RECURSO moderado. Las cuatro condiciones, en este orden, en TODAS:
 *   1. `requireRole('ADMIN')` dentro de la acción (un layout no protege una
 *      Server Action);
 *   2. el id entra validado como cuid (`src/lib/admin/schemas.ts`);
 *   3. fila en `admin_audit_log` ANTES de responder, también al RECHAZAR;
 *   4. `consumeRateLimit` (contador compartido de Postgres).
 * Lo que mueve dinero o decide quién cobra (aprobar/suspender profesores,
 * liquidaciones) exige ADEMÁS admin maestro (`MASTER_ADMIN_EMAILS`).
 */

interface Actor {
  userProfileId: string;
  email: string | null | undefined;
}

async function beginMarketplaceAdmin<T extends { reason: string }>(
  action: AdminAuditAction,
  targetKind: AdminAuditTargetKind,
  schema: z.ZodType<T>,
  input: unknown,
  opts: { requireMaster: boolean }
): Promise<{ ok: true; actor: Actor; data: T } | { ok: false; result: ActionResult<never> }> {
  let actor: Actor;
  let authEmail: string | null | undefined;
  try {
    const { profile, authUser } = await requireRole('ADMIN');
    actor = { userProfileId: profile.id, email: authUser.email };
    authEmail = masterCandidateEmail(authUser);
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, result: { ok: false, code: err.code, message: err.message } };
    throw err;
  }

  const rejected = async (metadata: Record<string, unknown>, reason: string | null = null) =>
    logAdminAction(action, actor, { targetKind, reason, metadata, outcome: 'rejected' });

  if (opts.requireMaster) {
    const verdict = requireMasterAdmin(authEmail);
    if (!verdict.ok) {
      await rejected({ denied: verdict.reason });
      return { ok: false, result: { ok: false, code: 'FORBIDDEN', message: MASTER_ADMIN_DENIED_MESSAGE } };
    }
  }

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Datos inválidos.';
    await rejected({ denied: 'VALIDATION', message });
    return { ok: false, result: { ok: false, code: 'VALIDATION', message } };
  }

  const limit = await consumeRateLimit('ADMIN_MARKETPLACE_ACTION', actor.userProfileId);
  if (!limit.allowed) {
    await rejected({ denied: 'RATE_LIMIT' }, parsed.data.reason);
    return { ok: false, result: { ok: false, code: 'RATE_LIMIT', message: 'Demasiadas acciones seguidas. Espera unos minutos.' } };
  }
  return { ok: true, actor, data: parsed.data };
}

const TEACHER_TRANSITIONS = {
  APPROVE: { from: ['PENDING_REVIEW'], to: 'ACTIVE' },
  REJECT: { from: ['PENDING_REVIEW'], to: 'REJECTED' },
  SUSPEND: { from: ['ACTIVE', 'INACTIVE'], to: 'SUSPENDED' },
  REACTIVATE: { from: ['SUSPENDED', 'INACTIVE'], to: 'ACTIVE' },
} as const;

/** Alta, rechazo, suspensión o reactivación de un profesor. Exige admin maestro: decide quién cobra. */
export async function reviewTeacherAction(input: unknown): Promise<ActionResult<{ status: string }>> {
  const b = await beginMarketplaceAdmin('teacher.reviewed', 'teacher', teacherReviewSchema, input, { requireMaster: true });
  if (!b.ok) return b.result;
  const { teacherId, decision, reason } = b.data;

  const teacher = await getTeacherForAdmin(teacherId);
  const t = TEACHER_TRANSITIONS[decision];
  if (!teacher || !(t.from as readonly string[]).includes(teacher.status)) {
    await logAdminAction('teacher.reviewed', b.actor, {
      targetKind: 'teacher',
      targetUserProfileId: teacher?.userProfileId ?? null,
      reason,
      metadata: { teacherId, decision, denied: teacher ? 'INVALID_TRANSITION' : 'NOT_FOUND', from: teacher?.status ?? null },
      outcome: 'rejected',
    });
    return { ok: false, code: 'INVALID', message: 'Ese cambio no aplica al estado actual del profesor.' };
  }

  const updated = await setTeacherStatus(teacherId, t.to, reason, new Date());
  await logAdminAction('teacher.reviewed', b.actor, {
    targetKind: 'teacher',
    targetUserProfileId: teacher.userProfileId,
    reason,
    metadata: { teacherId, decision, from: teacher.status, to: updated.status },
  });
  revalidatePath('/admin/profesores');
  return { ok: true, data: { status: updated.status } };
}

/** Aprobar, rechazar (con motivo, que ve el profesor) o archivar un curso. */
export async function reviewCourseAction(input: unknown): Promise<ActionResult<{ status: string }>> {
  const b = await beginMarketplaceAdmin('course.reviewed', 'course', courseReviewSchema, input, { requireMaster: false });
  if (!b.ok) return b.result;
  const { courseId, decision, reason } = b.data;
  const to = decision === 'APPROVE' ? 'PUBLISHED' : decision === 'REJECT' ? 'REJECTED' : 'ARCHIVED';
  const applied = await setCourseStatusByAdmin(courseId, to, reason, new Date());
  await logAdminAction('course.reviewed', b.actor, {
    targetKind: 'course',
    reason,
    metadata: { courseId, decision, to },
    outcome: applied ? 'applied' : 'rejected',
  });
  if (!applied) return { ok: false, code: 'INVALID', message: 'Ese cambio no aplica al estado actual del curso.' };
  revalidatePath('/admin/cursos');
  revalidatePath('/cursos');
  return { ok: true, data: { status: to } };
}

/** Ocultar o mostrar una reseña (moderación de contenido). */
export async function moderateCourseReviewAction(input: unknown): Promise<ActionResult<{ hidden: boolean }>> {
  const b = await beginMarketplaceAdmin('course_review.moderated', 'course_review', reviewModerationSchema, input, {
    requireMaster: false,
  });
  if (!b.ok) return b.result;
  const { enrollmentId, hidden, reason } = b.data;
  const applied = await setReviewHidden(enrollmentId, hidden);
  await logAdminAction('course_review.moderated', b.actor, {
    targetKind: 'course_review',
    reason,
    metadata: { enrollmentId, hidden },
    outcome: applied ? 'applied' : 'rejected',
  });
  if (!applied) return { ok: false, code: 'NOT_FOUND', message: 'No encontramos esa reseña.' };
  return { ok: true, data: { hidden } };
}

/**
 * Calcula las liquidaciones de una semana YA CERRADA para todos los profesores
 * (quedan PENDIENTES de aprobar). Idempotente: recalcular una semana no
 * duplica a quien ya tiene la suya. Exige admin maestro: crea deudas de dinero.
 */
export async function computePayoutsAction(
  input: unknown
): Promise<ActionResult<{ created: number; belowMinimum: number; existing: number }>> {
  const b = await beginMarketplaceAdmin('payout.computed', 'payout', computePayoutsSchema, input, { requireMaster: true });
  if (!b.ok) return b.result;
  const { weekStart, reason } = b.data;
  const now = new Date();
  const week = payoutWeek(weekStart);
  if (!week || week.periodEnd > now) {
    await logAdminAction('payout.computed', b.actor, {
      targetKind: 'payout',
      reason,
      metadata: { weekStart, denied: week ? 'WEEK_NOT_CLOSED' : 'NOT_A_MONDAY' },
      outcome: 'rejected',
    });
    return {
      ok: false,
      code: 'INVALID',
      message: week ? 'Esa semana todavía no termina.' : 'La semana se indica con su lunes (AAAA-MM-DD).',
    };
  }

  const results = await computeWeekPayouts(week, now);
  const created = results.filter((r) => r.outcome === 'created').length;
  const belowMinimum = results.filter((r) => r.outcome === 'below_minimum').length;
  const existing = results.filter((r) => r.outcome === 'exists').length;
  await logAdminAction('payout.computed', b.actor, {
    targetKind: 'payout',
    reason,
    metadata: {
      weekStart,
      created,
      belowMinimum,
      existing,
      payoutIds: results.flatMap((r) => (r.outcome === 'created' ? [r.payoutId] : [])),
    },
  });
  revalidatePath('/admin/liquidaciones');
  return { ok: true, data: { created, belowMinimum, existing } };
}

/** Aprobar, marcar transferida (con clave de rastreo), fallida, cancelar o retener la reserva. */
export async function payoutDecisionAction(input: unknown): Promise<ActionResult<{ status: string }>> {
  const b = await beginMarketplaceAdmin('payout.updated', 'payout', payoutActionSchema, input, { requireMaster: true });
  if (!b.ok) return b.result;
  const { payoutId, decision, reason, speiReference } = b.data;

  const r = await applyPayoutDecision(payoutId, decision, {
    actorProfileId: b.actor.userProfileId,
    reason,
    speiReference,
    now: new Date(),
  });
  if (!r.ok) {
    await logAdminAction('payout.updated', b.actor, {
      targetKind: 'payout',
      reason,
      metadata: { payoutId, decision, denied: r.reason },
      outcome: 'rejected',
    });
    return {
      ok: false,
      code: r.reason === 'NOT_FOUND' ? 'NOT_FOUND' : 'INVALID',
      message: r.reason === 'NOT_FOUND' ? 'No encontramos esa liquidación.' : 'Ese cambio no aplica al estado actual de la liquidación.',
    };
  }
  await logAdminAction('payout.updated', b.actor, {
    targetKind: 'payout',
    targetUserProfileId: r.teacherUserProfileId,
    reason,
    metadata: { payoutId, decision, from: r.from, to: r.to, ...(speiReference ? { speiReference } : {}) },
  });
  revalidatePath('/admin/liquidaciones');
  return { ok: true, data: { status: r.to } };
}
