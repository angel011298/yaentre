/**
 * COMISIÓN DE REFERIDO Y TOPE DURO DE $500 NETOS — Bloque 3
 * (ESPECIFICACION_QR_COMISIONES §6; handoff §3.3 y §5 regla 4).
 *
 * Módulo PURO, aritmética ENTERA en centavos. Es la única fuente de verdad de
 * «cuánto se paga de comisión», «qué compras la generan» y «cuánto crédito se
 * puede aplicar sin romper el piso», y se prueba contra una implementación
 * independiente con BigInt (`tests/referrals/commission.test.ts`).
 *
 * ── La regla, en una línea ─────────────────────────────────────────────────
 *
 *   NUNCA una venta puede dejar menos de $500 netos — ni por la comisión de
 *   referido, ni por un crédito aplicado, ni por la combinación de ambos.
 *
 * ── La fórmula del neto ────────────────────────────────────────────────────
 *
 *   neto = 0.8117 × precio − $33.48 − comisión
 *
 * La del CFO (handoff §3.3, «Neto = 0.8117 × Precio − 33.48»; spec §6, que trae
 * la misma en su código). Ya absorbe IVA incluido, comisión de Stripe, ISR RESICO
 * e infraestructura. NO es la del cuadro ilustrativo de la spec §6 (que da
 * $662.26 para Básico $999): ese cuadro no lleva el fijo de $33.48 ni el IVA de
 * la comisión de Stripe y contradice el código de la propia sección — con la
 * fórmula real, Básico $999 con comisión deja ≈ $627.40. Se sigue el CÓDIGO de
 * la spec y la fórmula del contexto maestro, que coinciden entre sí. Ver
 * RETORNO_BLOQUE3.md, pregunta abierta.
 *
 * El redondeo es SIEMPRE hacia abajo (`floor`): ante un empate de un centavo, el
 * error nunca cae del lado de pagar de más.
 */

/** Comisión de referido: $150 MXN (spec §2, Nivel 1). El tope de handoff §5 regla 4. */
export const REFERRAL_COMMISSION_MXN_CENTS = 15_000;

/** Piso de ganancia neta por venta: $500 MXN (handoff §3.3). */
export const NET_FLOOR_MXN_CENTS = 50_000;

/** 0.8117 en puntos base de 1/10 000. */
export const NET_COEFFICIENT = 8_117;
const NET_COEFFICIENT_DENOMINATOR = 10_000;

/** $33.48, en centavos. */
export const NET_FIXED_COST_MXN_CENTS = 3_348;

/** Periodo antifraude: la comisión no se acredita antes de 7 días (spec §3.2 y §8). */
export const ANTIFRAUD_HOLD_DAYS = 7;

/** El crédito vence 12 meses después de acreditarse (spec §2). */
export const CREDIT_VALIDITY_MONTHS = 12;

/**
 * Planes que generan comisión y admiten crédito: los de pago ÚNICO (Básico y
 * Premium). El Mensual queda fuera por CONSTRUCCIÓN, no por una lista: a $99-$199
 * su neto ya está muy por debajo de $500 sin ninguna comisión, así que la regla
 * del piso lo excluye sola. La lista solo lo dice en voz alta.
 */
export const REFERRAL_ELIGIBLE_PLANS = ['SEASON_PASS', 'PREMIUM'] as const;

export function isReferralEligiblePlan(plan: string): boolean {
  return (REFERRAL_ELIGIBLE_PLANS as readonly string[]).includes(plan);
}

function assertCents(value: number, name: string): void {
  if (!Number.isInteger(value)) throw new RangeError(`${name} debe ser un entero de centavos, llegó ${value}.`);
}

/** Neto (centavos) de una venta de `paidCents`, ANTES de comisiones de referido. Puede ser negativo. */
export function netAfterCostsCents(paidCents: number): number {
  assertCents(paidCents, 'paidCents');
  return Math.floor((paidCents * NET_COEFFICIENT) / NET_COEFFICIENT_DENOMINATOR) - NET_FIXED_COST_MXN_CENTS;
}

/** Neto (centavos) después de pagar `commissionCents`. */
export function netAfterCommissionCents(
  paidCents: number,
  commissionCents: number = REFERRAL_COMMISSION_MXN_CENTS
): number {
  assertCents(commissionCents, 'commissionCents');
  return netAfterCostsCents(paidCents) - commissionCents;
}

/**
 * Lo que pide la spec §6: `validateNetAfterCommission(priceCents)`. Devuelve
 * `true` si, tras pagar la comisión, el neto sigue en $500 o más. Un monto no
 * entero o no positivo es siempre `false`: nunca se valida lo que no se puede
 * calcular.
 */
export function validateNetAfterCommission(
  priceCents: number,
  commissionCents: number = REFERRAL_COMMISSION_MXN_CENTS
): boolean {
  if (!Number.isInteger(priceCents) || priceCents <= 0) return false;
  return netAfterCommissionCents(priceCents, commissionCents) >= NET_FLOOR_MXN_CENTS;
}

/**
 * El menor monto PAGADO (centavos) con el que una venta cumple el piso después
 * de una comisión de `commissionCents`.
 *
 *   floor(pagado × 8117 / 10000) − 3348 − comisión ≥ 50000
 *   ⇔ pagado × 8117 ≥ (50000 + 3348 + comisión) × 10000        (t entero)
 *   ⇔ pagado ≥ ⌈(50000 + 3348 + comisión) × 10000 / 8117⌉
 *
 * Forma cerrada y exacta: no hay bucle de ajuste que pudiera desviarse.
 */
export function minPaidCents(commissionCents: number): number {
  assertCents(commissionCents, 'commissionCents');
  const target = NET_FLOOR_MXN_CENTS + NET_FIXED_COST_MXN_CENTS + commissionCents;
  return Math.floor((target * NET_COEFFICIENT_DENOMINATOR + NET_COEFFICIENT - 1) / NET_COEFFICIENT);
}

export type CommissionDecision =
  | { eligible: true; commissionCents: number }
  | { eligible: false; reason: 'plan_not_eligible' | 'complimentary' | 'invalid_amount' | 'below_floor' };

/**
 * ¿Esta compra genera comisión de referido y de cuánto? Se decide con lo que el
 * comprador PAGÓ (no con el precio de lista): un comprador que aplicó crédito
 * paga menos, y la comisión tiene que seguir cabiendo bajo el piso.
 */
export function decideCommission(input: {
  plan: string;
  paidCents: number;
  isComp: boolean;
}): CommissionDecision {
  if (input.isComp) return { eligible: false, reason: 'complimentary' };
  if (!isReferralEligiblePlan(input.plan)) return { eligible: false, reason: 'plan_not_eligible' };
  if (!Number.isInteger(input.paidCents) || input.paidCents <= 0) {
    return { eligible: false, reason: 'invalid_amount' };
  }
  if (!validateNetAfterCommission(input.paidCents)) return { eligible: false, reason: 'below_floor' };
  return { eligible: true, commissionCents: REFERRAL_COMMISSION_MXN_CENTS };
}

/**
 * El MÁXIMO de crédito (centavos) que se puede aplicar a una compra sin romper
 * el piso de $500 netos.
 *
 *  · `sellsWithCommission`: la compra viene atribuida a un referidor, así que
 *    además generará su comisión de $150. El crédito que se aplique tiene que
 *    dejar espacio para AMBAS cosas — es el «ningún descuento, crédito o
 *    combinación de promociones» de la spec §6.
 *  · Es conservador a propósito: la comisión de esta venta y el crédito que ella
 *    misma consuma se restan los dos del mismo neto, aunque el crédito sea, en
 *    origen, la comisión de otra venta. Prefiere regalar menos a arriesgar el piso.
 */
export function maxCreditApplicableCents(input: {
  plan: string;
  /** Precio de lista de la compra, en centavos. */
  priceCents: number;
  /** Crédito vigente de la persona, en centavos. */
  availableCents: number;
  sellsWithCommission: boolean;
}): number {
  if (!isReferralEligiblePlan(input.plan)) return 0;
  if (!Number.isInteger(input.priceCents) || !Number.isInteger(input.availableCents)) return 0;
  if (input.availableCents <= 0 || input.priceCents <= 0) return 0;

  const commission = input.sellsWithCommission ? REFERRAL_COMMISSION_MXN_CENTS : 0;
  const headroom = input.priceCents - minPaidCents(commission);
  return Math.max(0, Math.min(input.availableCents, headroom));
}

// ─────────────────────────────── Fechas ───────────────────────────────

const DAY_MS = 24 * 60 * 60 * 1000;

/** Fin del periodo antifraude: el cobro más 7 días. */
export function accrueAfterDate(paidAt: Date): Date {
  return new Date(paidAt.getTime() + ANTIFRAUD_HOLD_DAYS * DAY_MS);
}

/**
 * Suma `months` meses en UTC recortando al último día del mes destino: el
 * 31 de enero más un mes es el 28/29 de febrero, no el 3 de marzo.
 */
export function addMonthsClamped(date: Date, months: number): Date {
  const monthIndex = date.getUTCMonth() + months;
  const year = date.getUTCFullYear() + Math.floor(monthIndex / 12);
  const month = ((monthIndex % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(
    Date.UTC(
      year,
      month,
      Math.min(date.getUTCDate(), lastDay),
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds()
    )
  );
}

/** Vencimiento del crédito: 12 meses desde la fecha de ACREDITACIÓN. */
export function creditExpiry(accruedAt: Date): Date {
  return addMonthsClamped(accruedAt, CREDIT_VALIDITY_MONTHS);
}
