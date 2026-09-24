import type { PricingSeason, SubscriptionPlan } from '@prisma/client';

/**
 * Matriz de precios de YaEntre (PRD §9). Módulo PURO y determinista: sin
 * Stripe, sin DB, sin fechas ambiguas — es la única fuente de verdad de
 * CUÁNTO se cobra por (plan × temporada), y por eso vive aparte y se testea.
 *
 * Los montos están en CENTAVOS de MXN (la unidad de `amount` de Stripe y de
 * `Payment.amountMxn` en el schema). Nunca se manejan pesos flotantes.
 *
 * Modelo de producto (Task 1):
 * - MONTHLY: suscripción recurrente de Stripe (mode 'subscription').
 * - SEASON_PASS / PREMIUM: pago único (mode 'payment'); su vigencia se calcula
 *   en la app como la fecha del examen objetivo (ver expiry.ts), NUNCA como una
 *   suscripción recurrente en Stripe.
 */

export type StripeCheckoutMode = 'subscription' | 'payment';

export interface PlanPricing {
  plan: SubscriptionPlan;
  season: PricingSeason;
  /** Monto a cobrar, en centavos de MXN. */
  amountMxn: number;
  /** Modo del Checkout de Stripe: recurrente vs. pago único. */
  mode: StripeCheckoutMode;
  isRecurring: boolean;
  /** Nombre visible del producto en el Checkout hospedado de Stripe. */
  productName: string;
}

/**
 * Precios en CENTAVOS de MXN.
 *
 * ── Cierre legal para abrir venta (Bloque 1, handoff CLO/CFO §3.3) ──
 * El titular no tiene RVOE, así que TODOS los planes causan IVA 16% incluido en
 * el precio exhibido (no aplica la exención del art. 15-IV LIVA). Estos montos
 * ya son con IVA incluido.
 *
 * · Early Bird (SEASON_PASS «Básico» $999, PREMIUM «Premium» $1,799):
 *   CONFIRMADOS por instrucción explícita de Ángel (24-sep-2026), que resuelve
 *   la decisión abierta §6.1 del handoff con un ajuste sobre la propuesta previa
 *   ($899/$1,699 → $999/$1,799). La regla de neto mínimo ($500 en Básico) se
 *   cumple con holgura: 0.8117 × 999 − 33.48 ≈ $777.
 * · Temporada Alta y Último Minuto de Básico/Premium: tomados de la PROPUESTA
 *   del handoff §3.3. ⚠️ PENDIENTE de confirmación de Ángel — la instrucción de
 *   esta fase solo fijó los precios Early Bird. Ver el .md de retorno §Preguntas.
 * · MONTHLY «Mensual»: SIN CAMBIO respecto al código previo. La instrucción de
 *   esta fase no tocó el plan mensual y el handoff §3.2 lista solo tres niveles
 *   (Free · Básico · Premium), así que la existencia y el precio del mensual son
 *   una decisión abierta que NO se adivina aquí. Ver el .md de retorno.
 */
const AMOUNTS_MXN_CENTS: Record<SubscriptionPlan, Record<PricingSeason, number>> = {
  MONTHLY: {
    EARLY_BIRD: 9_900, //   $99  — sin cambio (pendiente de decisión, ver retorno)
    HIGH_SEASON: 14_900, // $149 — sin cambio
    LAST_MINUTE: 19_900, // $199 — sin cambio
  },
  SEASON_PASS: {
    EARLY_BIRD: 99_900, //   $999   — Básico Early Bird (CONFIRMADO por Ángel)
    HIGH_SEASON: 119_900, // $1,199 — propuesta §3.3 (⚠️ pendiente)
    LAST_MINUTE: 149_900, // $1,499 — propuesta §3.3 (⚠️ pendiente)
  },
  PREMIUM: {
    EARLY_BIRD: 179_900, //  $1,799 — Premium Early Bird (CONFIRMADO por Ángel)
    HIGH_SEASON: 219_900, // $2,199 — propuesta §3.3 (⚠️ pendiente)
    LAST_MINUTE: 259_900, // $2,599 — propuesta §3.3 (⚠️ pendiente)
  },
};

/**
 * Nombre visible de cada plan. El handoff §3.2 retira «Pase de Temporada» y
 * «Premium Garantía»: el nivel intermedio es «Básico» y el superior «Premium»
 * (SIN garantía — la palabra «garantía» se elimina de todo el producto).
 *
 * Los VALORES del enum `SubscriptionPlan` (MONTHLY/SEASON_PASS/PREMIUM) NO se
 * renombran: son códigos internos ya persistidos en `subscriptions.plan` de
 * cientos de filas y en price ids/env vars de Stripe; renombrarlos exigiría una
 * migración de datos y un cambio de `prisma/schema.prisma` que la instrucción no
 * pidió. El renombrado de cara al usuario vive aquí, en las etiquetas.
 */
const PLAN_LABELS: Record<SubscriptionPlan, string> = {
  MONTHLY: 'Plan Mensual',
  SEASON_PASS: 'Básico',
  PREMIUM: 'Premium',
};

/** Nombre visible de un plan — única fuente (F17): antes duplicado como un
 *  `PLAN_LABELS` local en `email/templates.ts`, F16). */
export function planLabel(plan: SubscriptionPlan): string {
  return PLAN_LABELS[plan];
}

const SEASON_LABELS: Record<PricingSeason, string> = {
  EARLY_BIRD: 'Early Bird',
  HIGH_SEASON: 'Temporada Alta',
  LAST_MINUTE: 'Último Minuto',
};

export function getPlanPricing(plan: SubscriptionPlan, season: PricingSeason): PlanPricing {
  const amountMxn = AMOUNTS_MXN_CENTS[plan][season];
  const isRecurring = plan === 'MONTHLY';
  return {
    plan,
    season,
    amountMxn,
    mode: isRecurring ? 'subscription' : 'payment',
    isRecurring,
    productName: `YaEntre — ${PLAN_LABELS[plan]} (${SEASON_LABELS[season]})`,
  };
}

/**
 * Temporada de precios vigente para una fecha dada. Se define de forma
 * MONOTÓNICA por fecha de corte para cubrir TODAS las fechas sin huecos:
 *   now < 2026-12-01 (MX)         → EARLY_BIRD
 *   2026-12-01 ≤ now < 2027-04-01 → HIGH_SEASON
 *   now ≥ 2027-04-01              → LAST_MINUTE
 *
 * ── Cierre de Early Bird al 30-nov-2026 (Bloque 1, handoff §3.3) ──
 * Antes el corte era 2027-01-01 (el código «decía» 31-dic). El PRD y el handoff
 * fijan el cierre de la preventa al 30 de NOVIEMBRE, así que Early Bird vale
 * hasta el final de ese día en hora de México (UTC−6, sin horario de verano
 * desde 2023) y a partir del 1 de diciembre rige Temporada Alta. Se usa el
 * offset explícito Date.UTC(2026, 11, 1, 6) = 2026-12-01 00:00 CST para que el
 * corte caiga a la medianoche mexicana y no seis horas antes.
 *
 * El límite de licencias Early Bird (max_redemptions 500) es una capa aparte
 * (`resolveEffectiveSeason`); aquí solo mapea fecha → temporada.
 */
export function currentSeason(now: Date): PricingSeason {
  const highSeasonStart = Date.UTC(2026, 11, 1, 6); // 1 dic 2026 00:00 CST (fin de EB 30-nov MX)
  const lastMinuteStart = Date.UTC(2027, 3, 1); // 1 abr 2027
  const t = now.getTime();

  if (t < highSeasonStart) return 'EARLY_BIRD';
  if (t < lastMinuteStart) return 'HIGH_SEASON';
  return 'LAST_MINUTE';
}

/** Cupo de licencias Early Bird (F9 Task 4 / PRD §9: `max_redemptions: 500`). */
export const EARLY_BIRD_LICENSE_LIMIT = 500;

const PLAN_CODE: Record<SubscriptionPlan, string> = {
  MONTHLY: 'MENSUAL',
  SEASON_PASS: 'PASE',
  PREMIUM: 'PREMIUM',
};

const SEASON_CODE: Record<PricingSeason, string> = {
  EARLY_BIRD: 'EB',
  HIGH_SEASON: 'REG',
  LAST_MINUTE: 'LM',
};

/**
 * Nombre de la variable de entorno que debe contener el Price ID real de
 * Stripe para (plan × temporada) — mismos códigos que el PRD §9
 * (`price_mensual_eb`, `price_pase_reg`, `price_premium_lm`, ...), en
 * mayúsculas con el prefijo `STRIPE_PRICE_`. La escribe `scripts/setup-
 * stripe-prices.ts`; la lee `app/actions/checkout.ts` (con fallback a
 * `price_data` inline si aún no está configurada).
 */
export function stripePriceEnvVar(plan: SubscriptionPlan, season: PricingSeason): string {
  return `STRIPE_PRICE_${PLAN_CODE[plan]}_${SEASON_CODE[season]}`;
}

/**
 * Núcleo PURO del fallback de Early Bird (F9 Task 4): si la temporada
 * calculada por fecha es Early Bird pero ya no quedan licencias, degrada a
 * Temporada Alta. Separada de `resolveEffectiveSeason` (src/lib/db/billing.ts,
 * que sí toca la DB para contar licencias) para poder testear la lógica de
 * decisión sin Prisma.
 */
export function degradeIfEarlyBirdExhausted(
  season: PricingSeason,
  earlyBirdRemaining: number
): PricingSeason {
  if (season !== 'EARLY_BIRD') return season;
  return earlyBirdRemaining > 0 ? 'EARLY_BIRD' : 'HIGH_SEASON';
}
