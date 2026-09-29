import { describe, expect, it } from 'vitest';
import {
  ANTIFRAUD_HOLD_DAYS,
  CREDIT_VALIDITY_MONTHS,
  NET_FLOOR_MXN_CENTS,
  REFERRAL_COMMISSION_MXN_CENTS,
  REFERRAL_ELIGIBLE_PLANS,
  accrueAfterDate,
  addMonthsClamped,
  creditExpiry,
  decideCommission,
  isReferralEligiblePlan,
  maxCreditApplicableCents,
  minPaidCents,
  netAfterCommissionCents,
  netAfterCostsCents,
  validateNetAfterCommission,
} from '@/lib/referrals/commission';
import { getPlanPricing } from '@/lib/stripe/pricing';

/**
 * TOPE DURO DE $500 NETOS (ESPECIFICACION_QR_COMISIONES §6).
 *
 * Las expectativas están escritas A MANO y se cruzan con la fórmula de la spec
 * en PUNTO FLOTANTE (`0.8117 × pesos − 33.48 − 150 ≥ 500`), que es un cálculo
 * independiente de la aritmética entera de `commission.ts`.
 */

/** La fórmula LITERAL de la spec §6, en pesos y en flotante. */
function specNetPesos(priceCents: number, commissionCents: number): number {
  return 0.8117 * (priceCents / 100) - 33.48 - commissionCents / 100;
}

describe('constantes del programa', () => {
  it('la comisión es $150 y el piso $500 (spec §6, handoff §5 regla 4)', () => {
    expect(REFERRAL_COMMISSION_MXN_CENTS).toBe(15_000);
    expect(NET_FLOOR_MXN_CENTS).toBe(50_000);
  });

  it('periodo antifraude 7 días; vigencia del crédito 12 meses (spec §2 y §3.2)', () => {
    expect(ANTIFRAUD_HOLD_DAYS).toBe(7);
    expect(CREDIT_VALIDITY_MONTHS).toBe(12);
  });

  it('solo los planes de pago ÚNICO generan comisión: el Mensual queda fuera', () => {
    expect([...REFERRAL_ELIGIBLE_PLANS]).toEqual(['SEASON_PASS', 'PREMIUM']);
    expect(isReferralEligiblePlan('SEASON_PASS')).toBe(true);
    expect(isReferralEligiblePlan('PREMIUM')).toBe(true);
    expect(isReferralEligiblePlan('MONTHLY')).toBe(false);
    expect(isReferralEligiblePlan('')).toBe(false);
    expect(isReferralEligiblePlan('season_pass')).toBe(false);
  });
});

describe('el neto de la fórmula del CFO (0.8117 × precio − $33.48)', () => {
  it('Básico Early Bird $999 → $777.40 antes de comisión (redondeo hacia abajo)', () => {
    // 0.8117 × 999 = 810.8883 → 810.88; − 33.48 = 777.40
    expect(netAfterCostsCents(99_900)).toBe(77_740);
  });

  it('con la comisión de $150 → $627.40', () => {
    expect(netAfterCommissionCents(99_900)).toBe(62_740);
  });

  it('Premium Early Bird $1,799 con comisión → $1,276.76 (no $1,158.83 del cuadro ilustrativo de la spec)', () => {
    // 0.8117 × 1799 = 1460.2483 → 1460.24; − 33.48 − 150 = 1276.76
    expect(netAfterCommissionCents(179_900)).toBe(127_676);
  });

  it('un monto no entero es un error de programación, no un redondeo silencioso', () => {
    expect(() => netAfterCostsCents(99_900.5)).toThrow(RangeError);
    expect(() => netAfterCommissionCents(99_900, 150.5)).toThrow(RangeError);
  });
});

describe('minPaidCents — el menor monto pagado que cumple el piso (calculado a mano)', () => {
  it('sin comisión: $657.24', () => {
    // pagado × 8117 ≥ (50000 + 3348) × 10000 = 533 480 000 → pagado ≥ 65 723.5… → 65 724
    expect(minPaidCents(0)).toBe(65_724);
  });

  it('con la comisión de $150: $842.04', () => {
    // pagado × 8117 ≥ (50000 + 3348 + 15000) × 10000 = 683 480 000 → 84 203.5… → 84 204
    expect(minPaidCents(15_000)).toBe(84_204);
  });

  it('cuando la división es EXACTA no sube un centavo de más (c = $34.71 → exactamente $700.00)', () => {
    // (50000 + 3348 + 3471) = 56819 = 7 × 8117 → pagado = 7 × 10000 = 70 000, sin residuo.
    expect(minPaidCents(3_471)).toBe(70_000);
    expect(netAfterCommissionCents(70_000, 3_471)).toBe(NET_FLOOR_MXN_CENTS);
    expect(netAfterCommissionCents(69_999, 3_471)).toBeLessThan(NET_FLOOR_MXN_CENTS);
  });

  it('es EXACTO: en el mínimo el neto es ≥ $500 y un centavo menos ya NO', () => {
    for (const commission of [0, 15_000, 7_500, 22_500]) {
      const min = minPaidCents(commission);
      expect(netAfterCommissionCents(min, commission)).toBeGreaterThanOrEqual(NET_FLOOR_MXN_CENTS);
      expect(netAfterCommissionCents(min - 1, commission)).toBeLessThan(NET_FLOOR_MXN_CENTS);
    }
  });
});

describe('validateNetAfterCommission — la validación de la spec §6', () => {
  it('coincide con la fórmula flotante de la spec en TODO el rango de precios reales, salvo a ±1 centavo del límite', () => {
    const min = minPaidCents(REFERRAL_COMMISSION_MXN_CENTS);
    // Un solo `expect` al final: 400 000 aserciones dentro del bucle cuestan segundos y
    // en una corrida en paralelo revientan el presupuesto de tiempo de la prueba
    // (el rojo intermitente que CLAUDE.md prohíbe). Se acumulan las discrepancias.
    const discrepancias: number[] = [];
    let comparados = 0;
    for (let cents = 1; cents <= 400_000; cents++) {
      if (Math.abs(cents - min) <= 1) continue; // el redondeo del flotante puede diferir en el propio umbral
      if (validateNetAfterCommission(cents) !== specNetPesos(cents, REFERRAL_COMMISSION_MXN_CENTS) >= 500) discrepancias.push(cents);
      comparados++;
    }
    expect(discrepancias).toEqual([]);
    expect(comparados).toBeGreaterThan(399_000);
  });

  it('en el borde: $842.04 pasa y $842.03 no', () => {
    expect(validateNetAfterCommission(84_204)).toBe(true);
    expect(validateNetAfterCommission(84_203)).toBe(false);
  });

  it('todos los precios de Básico y Premium de la matriz soportan la comisión de $150', () => {
    for (const plan of ['SEASON_PASS', 'PREMIUM'] as const) {
      for (const season of ['EARLY_BIRD', 'HIGH_SEASON', 'LAST_MINUTE'] as const) {
        const price = getPlanPricing(plan, season).amountMxn;
        expect(validateNetAfterCommission(price), `${plan} ${season} $${price / 100}`).toBe(true);
      }
    }
  });

  it('NINGÚN precio del plan Mensual soporta la comisión (por eso queda fuera, sin lista)', () => {
    for (const season of ['EARLY_BIRD', 'HIGH_SEASON', 'LAST_MINUTE'] as const) {
      const price = getPlanPricing('MONTHLY', season).amountMxn;
      expect(validateNetAfterCommission(price), `MONTHLY ${season}`).toBe(false);
      // …y ni siquiera sin comisión llega a $500 netos:
      expect(validateNetAfterCommission(price, 0), `MONTHLY ${season} sin comisión`).toBe(false);
    }
  });

  it('nunca valida lo que no se puede calcular', () => {
    expect(validateNetAfterCommission(0)).toBe(false);
    expect(validateNetAfterCommission(-99_900)).toBe(false);
    expect(validateNetAfterCommission(99_900.5)).toBe(false);
    expect(validateNetAfterCommission(Number.NaN)).toBe(false);
    expect(validateNetAfterCommission(Number.POSITIVE_INFINITY)).toBe(false);
  });
});

describe('decideCommission — qué compras generan comisión', () => {
  const base = { plan: 'SEASON_PASS', paidCents: 99_900, isComp: false };

  it('Básico Early Bird pagado completo: $150', () => {
    expect(decideCommission(base)).toEqual({ eligible: true, commissionCents: 15_000 });
  });

  it('Premium: $150', () => {
    expect(decideCommission({ ...base, plan: 'PREMIUM', paidCents: 179_900 })).toEqual({
      eligible: true,
      commissionCents: 15_000,
    });
  });

  it('Mensual: nunca', () => {
    expect(decideCommission({ ...base, plan: 'MONTHLY', paidCents: 9_900 })).toEqual({
      eligible: false,
      reason: 'plan_not_eligible',
    });
  });

  it('una cortesía del admin no es una venta', () => {
    expect(decideCommission({ ...base, isComp: true })).toEqual({ eligible: false, reason: 'complimentary' });
  });

  it('un Básico que se pagó con tanto crédito que ya no soporta la comisión: no la genera', () => {
    expect(decideCommission({ ...base, paidCents: 84_203 })).toEqual({ eligible: false, reason: 'below_floor' });
    expect(decideCommission({ ...base, paidCents: 84_204 })).toEqual({ eligible: true, commissionCents: 15_000 });
  });

  it('monto inválido', () => {
    expect(decideCommission({ ...base, paidCents: 0 })).toEqual({ eligible: false, reason: 'invalid_amount' });
    expect(decideCommission({ ...base, paidCents: -1 })).toEqual({ eligible: false, reason: 'invalid_amount' });
    expect(decideCommission({ ...base, paidCents: 1.5 })).toEqual({ eligible: false, reason: 'invalid_amount' });
  });
});

describe('maxCreditApplicableCents — ningún crédito rompe el piso de $500', () => {
  const basico = { plan: 'SEASON_PASS', priceCents: 99_900 };

  it('Básico $999, comprador SIN referidor: caben $341.76 de crédito (999 − 657.24)', () => {
    expect(maxCreditApplicableCents({ ...basico, availableCents: 1_000_000, sellsWithCommission: false })).toBe(34_176);
  });

  it('Básico $999, comprador CON referidor (la venta genera $150 de comisión): caben $156.96 (999 − 842.04)', () => {
    expect(maxCreditApplicableCents({ ...basico, availableCents: 1_000_000, sellsWithCommission: true })).toBe(15_696);
  });

  it('nunca da más de lo que la persona tiene', () => {
    expect(maxCreditApplicableCents({ ...basico, availableCents: 15_000, sellsWithCommission: false })).toBe(15_000);
    expect(maxCreditApplicableCents({ ...basico, availableCents: 1, sellsWithCommission: false })).toBe(1);
  });

  it('dos lotes de $150 caben en un Básico sin referidor ($300 ≤ $341.76)…', () => {
    expect(maxCreditApplicableCents({ ...basico, availableCents: 30_000, sellsWithCommission: false })).toBe(30_000);
  });

  it('…y NO caben si la venta además genera comisión ($300 > $156.96)', () => {
    expect(maxCreditApplicableCents({ ...basico, availableCents: 30_000, sellsWithCommission: true })).toBe(15_696);
  });

  it('el Mensual no admite crédito, tenga el saldo que tenga', () => {
    expect(
      maxCreditApplicableCents({ plan: 'MONTHLY', priceCents: 9_900, availableCents: 1_000_000, sellsWithCommission: false })
    ).toBe(0);
  });

  it('un precio ya en el piso no admite nada', () => {
    expect(
      maxCreditApplicableCents({ plan: 'SEASON_PASS', priceCents: 65_724, availableCents: 50_000, sellsWithCommission: false })
    ).toBe(0);
    expect(
      maxCreditApplicableCents({ plan: 'SEASON_PASS', priceCents: 60_000, availableCents: 50_000, sellsWithCommission: false })
    ).toBe(0);
  });

  it('entradas inválidas: cero, nunca un número negativo o fraccionario', () => {
    expect(maxCreditApplicableCents({ ...basico, availableCents: 0, sellsWithCommission: false })).toBe(0);
    expect(maxCreditApplicableCents({ ...basico, availableCents: -5, sellsWithCommission: false })).toBe(0);
    expect(maxCreditApplicableCents({ ...basico, availableCents: 100.5, sellsWithCommission: false })).toBe(0);
    expect(maxCreditApplicableCents({ plan: 'SEASON_PASS', priceCents: 0, availableCents: 100, sellsWithCommission: false })).toBe(0);
  });

  it('PROPIEDAD: para cualquier precio, saldo y modo, lo pagado tras el crédito CUMPLE el piso, y no se puede aplicar ni un centavo más', () => {
    let casos = 0;
    for (const priceCents of [65_724, 70_000, 84_204, 89_900, 99_900, 119_900, 149_900, 179_900, 259_900]) {
      for (const availableCents of [1, 149, 15_000, 15_001, 30_000, 45_000, 100_000, 10_000_000]) {
        for (const sellsWithCommission of [false, true]) {
          const commission = sellsWithCommission ? REFERRAL_COMMISSION_MXN_CENTS : 0;
          const credit = maxCreditApplicableCents({ plan: 'SEASON_PASS', priceCents, availableCents, sellsWithCommission });
          casos++;

          expect(credit).toBeGreaterThanOrEqual(0);
          expect(credit).toBeLessThanOrEqual(availableCents);
          if (credit > 0) {
            // Cumple el piso, medido con la fórmula FLOTANTE de la spec (±0.01) y con la entera.
            expect(specNetPesos(priceCents - credit, commission) + 0.01).toBeGreaterThanOrEqual(500);
            expect(netAfterCommissionCents(priceCents - credit, commission)).toBeGreaterThanOrEqual(NET_FLOOR_MXN_CENTS);
          }
          // Maximal: un centavo más ya rompe el piso o rebasa el saldo.
          if (credit < availableCents) {
            const extra = priceCents - (credit + 1);
            expect(extra > 0 ? netAfterCommissionCents(extra, commission) < NET_FLOOR_MXN_CENTS : true).toBe(true);
          }
        }
      }
    }
    expect(casos).toBe(9 * 8 * 2);
  });
});

describe('fechas', () => {
  it('el periodo antifraude son EXACTAMENTE 7 días después del cobro', () => {
    expect(accrueAfterDate(new Date('2026-10-15T18:30:00.000Z')).toISOString()).toBe('2026-10-22T18:30:00.000Z');
  });

  it('el crédito vence 12 meses después de acreditarse', () => {
    expect(creditExpiry(new Date('2026-10-22T13:00:00.000Z')).toISOString()).toBe('2027-10-22T13:00:00.000Z');
  });

  it('el 29 de febrero de un año bisiesto vence el 28 de febrero, no el 1 de marzo', () => {
    expect(creditExpiry(new Date('2028-02-29T10:00:00.000Z')).toISOString()).toBe('2029-02-28T10:00:00.000Z');
  });

  it('el 31 de enero + 1 mes es el último día de febrero', () => {
    expect(addMonthsClamped(new Date('2027-01-31T00:00:00.000Z'), 1).toISOString()).toBe('2027-02-28T00:00:00.000Z');
    expect(addMonthsClamped(new Date('2028-01-31T00:00:00.000Z'), 1).toISOString()).toBe('2028-02-29T00:00:00.000Z');
  });

  it('cruza el fin de año', () => {
    expect(addMonthsClamped(new Date('2026-11-15T00:00:00.000Z'), 3).toISOString()).toBe('2027-02-15T00:00:00.000Z');
    expect(addMonthsClamped(new Date('2026-12-31T23:59:59.999Z'), 2).toISOString()).toBe('2027-02-28T23:59:59.999Z');
  });

  it('meses negativos y cero no se rompen', () => {
    expect(addMonthsClamped(new Date('2026-03-31T00:00:00.000Z'), 0).toISOString()).toBe('2026-03-31T00:00:00.000Z');
    expect(addMonthsClamped(new Date('2026-03-31T00:00:00.000Z'), -1).toISOString()).toBe('2026-02-28T00:00:00.000Z');
    expect(addMonthsClamped(new Date('2026-01-15T00:00:00.000Z'), -2).toISOString()).toBe('2025-11-15T00:00:00.000Z');
  });
});
