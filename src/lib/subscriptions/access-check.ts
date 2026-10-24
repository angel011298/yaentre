import type { SubscriptionPlan, SubscriptionStatus } from '@prisma/client';
import { formatInTimeZone } from 'date-fns-tz';
import { MEXICO_TIME_ZONE } from '@/lib/paywall/mexico-time';
import { ACCESS_DURATION, calculateGraceEndsAt, isFixedTermPlan } from './access-duration';

/**
 * G103 — ESTADO DE ACCESO DERIVADO (spec §3.3). Módulo PURO.
 *
 *   ACTIVE  — vigente (`now < expiresAt`), o plan sin vigencia propia (MONTHLY).
 *   GRACE   — vencido pero dentro de los 7 días de gracia: SIGUE con acceso.
 *   EXPIRED — terminó la gracia (o el plan se canceló/expiró en la base).
 *   NONE    — no hay plan (o solo un checkout PENDING/FAILED, que nunca dio acceso).
 *
 * «Nunca bloquear sin dar la gracia» (spec §7.3) se cumple aunque una fila
 * vieja no traiga `graceEndsAt`: la gracia se deriva de `expiresAt`.
 *
 * Al expirar NO se borra nada: progreso, estadísticas y `LearningProfile`
 * siguen ahí; solo se cierra el contenido de pago (lo decide el muro suave de
 * `src/lib/paywall/gates.ts` con este mismo criterio).
 */

export type AccessStatus = 'ACTIVE' | 'GRACE' | 'EXPIRED' | 'NONE';

export interface AccessSubscription {
  status: SubscriptionStatus;
  plan: SubscriptionPlan;
  expiresAt: Date | null;
  graceEndsAt: Date | null;
}

/** Fin efectivo de la gracia (la guardada, o la derivada para filas viejas). */
export function effectiveGraceEndsAt(sub: Pick<AccessSubscription, 'expiresAt' | 'graceEndsAt'>): Date | null {
  if (!sub.expiresAt) return null;
  return sub.graceEndsAt ?? calculateGraceEndsAt(sub.expiresAt);
}

export function checkAccessStatus(sub: AccessSubscription | null, now: Date): AccessStatus {
  if (!sub) return 'NONE';
  if (sub.status === 'PENDING' || sub.status === 'FAILED') return 'NONE';
  if (sub.status !== 'ACTIVE') return 'EXPIRED';
  if (!sub.expiresAt) return 'ACTIVE';

  const t = now.getTime();
  if (t < sub.expiresAt.getTime()) return 'ACTIVE';

  const grace = effectiveGraceEndsAt(sub);
  if (grace && t < grace.getTime()) return 'GRACE';
  return 'EXPIRED';
}

/** ¿Da acceso al contenido de pago? Sí en ACTIVE y en GRACE. */
export function hasPaidAccess(status: AccessStatus): boolean {
  return status === 'ACTIVE' || status === 'GRACE';
}

/**
 * El MISMO criterio, como filtro de Prisma, para `getActiveSubscription`.
 * Se mantiene junto a `checkAccessStatus` y `tests/subscriptions/access.test.ts`
 * evalúa ambos sobre la misma matriz para que no puedan separarse.
 */
export function accessibleSubscriptionWhere(now: Date) {
  const legacyGraceCutoff = new Date(
    now.getTime() - ACCESS_DURATION.GRACE_PERIOD_DAYS * 24 * 3600 * 1000
  );
  return {
    status: 'ACTIVE' as const,
    OR: [
      { expiresAt: null },
      { expiresAt: { gt: now } },
      { graceEndsAt: { gt: now } },
      // Fila sin `graceEndsAt` (anterior a 0019): gracia derivada de expiresAt.
      { graceEndsAt: null, expiresAt: { gt: legacyGraceCutoff } },
    ],
  };
}

// ──────────────────────────── Días en hora de México ────────────────────────────

/** `YYYY-MM-DD` del instante en la Ciudad de México. */
export function mexicoDayKey(instant: Date): string {
  return formatInTimeZone(instant, MEXICO_TIME_ZONE, 'yyyy-MM-dd');
}

/** Días de calendario (en México) de `from` a `to`; negativo si `to` ya pasó. */
export function mexicoCalendarDaysBetween(from: Date, to: Date): number {
  const a = Date.parse(`${mexicoDayKey(from)}T00:00:00Z`);
  const b = Date.parse(`${mexicoDayKey(to)}T00:00:00Z`);
  return Math.round((b - a) / (24 * 3600 * 1000));
}

// ──────────────────────────── Avisos de vigencia ────────────────────────────

/**
 * Los cinco correos de la spec §3.5. Cada uno se manda UNA vez por cada valor
 * de `expiresAt` (la llave incluye la fecha): si el alumno extiende, la nueva
 * vigencia vuelve a tener sus cinco avisos.
 */
export type ExpiryNoticeKind = 'T30' | 'T7' | 'T1' | 'T0' | 'GRACE_END';

/**
 * Qué aviso toca HOY, o `null`. Por ventanas y no por día exacto: si el cron
 * no corrió el día 30, el aviso de 30 días sale el 29 (y no se duplica, por la
 * llave de `expiryNoticeKey`). Solo se manda el de la ventana actual — un
 * aviso viejo que ya no aplica no se manda tarde.
 *
 *   faltan 8..30 días → T30 · 2..7 → T7 · 1 o vence hoy más tarde → T1
 *   ya venció y sigue la gracia → T0
 *   terminó la gracia hace menos de 7 días → GRACE_END
 */
export function dueExpiryNotice(
  sub: Pick<AccessSubscription, 'status' | 'plan' | 'expiresAt' | 'graceEndsAt'>,
  now: Date
): ExpiryNoticeKind | null {
  if (sub.status !== 'ACTIVE' || !sub.expiresAt || !isFixedTermPlan(sub.plan)) return null;

  const t = now.getTime();
  const grace = effectiveGraceEndsAt(sub)!;

  if (t < sub.expiresAt.getTime()) {
    const daysLeft = mexicoCalendarDaysBetween(now, sub.expiresAt);
    if (daysLeft > 30) return null;
    if (daysLeft >= 8) return 'T30';
    if (daysLeft >= 2 && daysLeft <= 7) return 'T7';
    // Falta 1 día, o vence HOY más tarde: es el «último día». Decir «tu
    // acceso ha expirado» antes de la hora real de vencimiento sería falso.
    return 'T1';
  }

  if (t < grace.getTime()) return 'T0';

  const sinceGraceEnd = t - grace.getTime();
  if (sinceGraceEnd < ACCESS_DURATION.GRACE_PERIOD_DAYS * 24 * 3600 * 1000) return 'GRACE_END';
  return null;
}

/** Llave de idempotencia guardada en `Subscription.expiryNoticesSent`. */
export function expiryNoticeKey(kind: ExpiryNoticeKind, expiresAt: Date): string {
  return `${kind}:${mexicoDayKey(expiresAt)}`;
}
