import type { PricingSeason, SubscriptionPlan } from '@prisma/client';

/**
 * Matriz de precios de Acierta (PRD §9). Módulo PURO y determinista: sin
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
  /** PREMIUM incluye garantía de reembolso si el alumno no ingresa. */
  hasGuarantee: boolean;
  /** Nombre visible del producto en el Checkout hospedado de Stripe. */
  productName: string;
}

/** Precios en CENTAVOS de MXN. PRD §9 «Planes y precios». */
const AMOUNTS_MXN_CENTS: Record<SubscriptionPlan, Record<PricingSeason, number>> = {
  MONTHLY: {
    EARLY_BIRD: 9_900, //   $99
    HIGH_SEASON: 14_900, // $149
    LAST_MINUTE: 19_900, // $199
  },
  SEASON_PASS: {
    EARLY_BIRD: 49_900, //  $499
    HIGH_SEASON: 79_900, //  $799
    LAST_MINUTE: 99_900, //  $999
  },
  PREMIUM: {
    EARLY_BIRD: 89_900, //   $899
    HIGH_SEASON: 129_900, // $1,299
    LAST_MINUTE: 149_900, // $1,499
  },
};

const PLAN_LABELS: Record<SubscriptionPlan, string> = {
  MONTHLY: 'Plan Mensual',
  SEASON_PASS: 'Pase de Temporada',
  PREMIUM: 'Premium Garantía',
};

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
    hasGuarantee: plan === 'PREMIUM',
    productName: `Acierta — ${PLAN_LABELS[plan]} (${SEASON_LABELS[season]})`,
  };
}

/**
 * Temporada de precios vigente para una fecha dada. Ventanas del PRD:
 * Early Bird (sep–nov 2026) · Temporada Alta (ene–mar 2027) · Último Minuto
 * (abr–may 2027). Se define de forma MONOTÓNICA por fecha de corte para cubrir
 * TODAS las fechas sin huecos (p. ej. dic 2026 pre-launch cae en Early Bird;
 * cualquier fecha ≥ abr 2027 cae en Último Minuto):
 *   now < 2027-01-01           → EARLY_BIRD
 *   2027-01-01 ≤ now < 2027-04-01 → HIGH_SEASON
 *   now ≥ 2027-04-01           → LAST_MINUTE
 * El límite de licencias Early Bird (max_redemptions 500) es una capa aparte
 * que se resuelve en F9; aquí solo mapea fecha → temporada.
 */
export function currentSeason(now: Date): PricingSeason {
  const highSeasonStart = Date.UTC(2027, 0, 1); // 1 ene 2027
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
