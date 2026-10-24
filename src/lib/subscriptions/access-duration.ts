import type { SubscriptionPlan } from '@prisma/client';
import { addDays, addMonths } from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import { MEXICO_TIME_ZONE } from '@/lib/paywall/mexico-time';

/**
 * G103 — TEMPORALIDAD DE ACCESO (spec horarios/cursos/temporalidad §3).
 * Módulo PURO: sin Prisma, sin `process.env`, sin la hora del sistema — todo
 * instante entra como parámetro.
 *
 * Decisión de Ángel (23-oct-2026): los planes de pago único (Básico =
 * `SEASON_PASS`, Premium) dan **12 meses desde la compra**, con una extensión
 * opcional de **6 meses** a precio fijo y **7 días de gracia** al vencer.
 * Hasta G102 la vigencia era «hasta la fecha del examen objetivo» (respaldo de
 * 150 días): eso desaparece para las activaciones NUEVAS. Las existentes
 * conservan su `expiresAt` (ver la migración 0019).
 *
 * ── Por qué meses de calendario y no 365 días ───────────────────────────────
 *
 * La spec escribe `BASICO_DAYS: 365`, pero lo que se promete es «12 meses de
 * acceso». En un año con 29 de febrero, 365 días entregan un día MENOS que 12
 * meses (comprar el 1-mar-2027 vencería el 29-feb-2028, no el 1-mar-2028). El
 * cálculo se hace sumando meses de calendario a la fecha y hora LOCALES de la
 * Ciudad de México y convirtiendo de vuelta a UTC: así «12 meses» es lo mismo
 * en el servidor (UTC) que en el calendario del alumno. Un 29 de febrero + 12
 * meses cae en el 28 de febrero (date-fns recorta al último día del mes).
 *
 * El plan Mensual NO entra aquí: su ciclo lo controla Stripe (suscripción
 * recurrente) y no tiene extensión.
 */

export const ACCESS_DURATION = {
  /** Básico (`SEASON_PASS`) y Premium: 12 meses desde la activación. */
  PAID_PLAN_MONTHS: 12,
  /** Extensión opcional: 6 meses sobre la vigencia vigente. */
  EXTENSION_MONTHS: 6,
  /** Días de gracia tras vencer, con acceso, antes de perderlo. */
  GRACE_PERIOD_DAYS: 7,
  /**
   * Precio FIJO de la extensión, en centavos de MXN e IVA incluido —
   * independiente de la temporada (no aplica Early Bird/Alta/Último Minuto).
   * ⚠️ DECISIÓN ABIERTA de Ángel (spec §8.5 «pendiente de validar (c)»):
   * $499 Básico / $899 Premium, el 50 % del Early Bird que propuso el CFO.
   * Es la ÚNICA constante que hay que cambiar si se ajustan.
   */
  EXTENSION_PRICE_CENTS: {
    SEASON_PASS: 49_900,
    PREMIUM: 89_900,
  },
} as const;

/** Planes con vigencia propia (pago único) — los que se pueden extender. */
export type FixedTermPlan = keyof typeof ACCESS_DURATION.EXTENSION_PRICE_CENTS;

export function isFixedTermPlan(plan: SubscriptionPlan): plan is FixedTermPlan {
  return plan === 'SEASON_PASS' || plan === 'PREMIUM';
}

/** Suma meses de calendario en hora de la Ciudad de México. */
export function addMonthsInMexico(instant: Date, months: number): Date {
  const local = toZonedTime(instant, MEXICO_TIME_ZONE);
  return fromZonedTime(addMonths(local, months), MEXICO_TIME_ZONE);
}

/** Suma días de calendario en hora de la Ciudad de México. */
export function addDaysInMexico(instant: Date, days: number): Date {
  const local = toZonedTime(instant, MEXICO_TIME_ZONE);
  return fromZonedTime(addDays(local, days), MEXICO_TIME_ZONE);
}

/**
 * Vigencia al ACTIVAR un plan. `null` para MONTHLY: Stripe controla su
 * renovación y el acceso vive mientras la suscripción siga ACTIVE.
 */
export function calculateExpirationDate(plan: SubscriptionPlan, activatedAt: Date): Date | null {
  if (!isFixedTermPlan(plan)) return null;
  return addMonthsInMexico(activatedAt, ACCESS_DURATION.PAID_PLAN_MONTHS);
}

/** Fin de la gracia: `expiresAt` + 7 días. */
export function calculateGraceEndsAt(expiresAt: Date): Date {
  return addDaysInMexico(expiresAt, ACCESS_DURATION.GRACE_PERIOD_DAYS);
}

/**
 * Nueva vigencia tras comprar la extensión: 6 meses SOBRE la vigencia actual
 * (no sobre la fecha de compra), como dice la spec §3.3. Si se compra en la
 * gracia, los días de gracia ya usados no se reponen: la extensión empieza a
 * contar en la fecha en que el plan venció.
 */
export function calculateExtensionDate(currentExpiresAt: Date): Date {
  return addMonthsInMexico(currentExpiresAt, ACCESS_DURATION.EXTENSION_MONTHS);
}

/** Precio fijo de la extensión, o `null` si el plan no se extiende. */
export function extensionPriceCents(plan: SubscriptionPlan): number | null {
  return isFixedTermPlan(plan) ? ACCESS_DURATION.EXTENSION_PRICE_CENTS[plan] : null;
}
