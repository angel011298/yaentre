import { describe, expect, it } from 'vitest';
import {
  calculateWeeklyPayout,
  classPayableCents,
  enrollmentPayableCents,
  isValidSpeiTrackingKey,
  lastClosedWeekStart,
  nextPayoutStatus,
  PAYOUT_RULES,
  payoutWeek,
  refundAdjustmentDelta,
  retentionFor,
  retentionReleaseAt,
  teacherShareAfterRefund,
  type PayoutDecision,
  type PayoutStatusName,
} from '@/lib/teachers/payout-calculator';
import { buildPayoutSheetRow, generatePayoutSheet, payoutPeriodLabel, payoutReference, type PayoutForSheet } from '@/lib/teachers/payout-sheet';
import { COURSE_COMMISSION } from '@/lib/courses/commission';

describe('semanas de liquidación (lunes a domingo, hora de la Ciudad de México)', () => {
  it('el lunes 19-oct-2026 abre a las 06:00 UTC y cierra el lunes siguiente', () => {
    const w = payoutWeek('2026-10-19');
    expect(w?.periodStart.toISOString()).toBe('2026-10-19T06:00:00.000Z');
    expect(w?.periodEnd.toISOString()).toBe('2026-10-26T06:00:00.000Z');
  });

  it('una fecha que no es lunes, o que no existe, no es una semana', () => {
    expect(payoutWeek('2026-10-20')).toBeNull();
    expect(payoutWeek('2026-02-30')).toBeNull();
    expect(payoutWeek('19-10-2026')).toBeNull();
  });

  it('la última semana CERRADA: el sábado 24 de octubre liquida la del 12; un lunes a las 00:30 de México, la anterior', () => {
    expect(lastClosedWeekStart(new Date('2026-10-24T18:00:00Z'))).toBe('2026-10-12');
    // Lunes 26-oct 00:30 en México = 06:30 UTC → la semana del 19 ya cerró.
    expect(lastClosedWeekStart(new Date('2026-10-26T06:30:00Z'))).toBe('2026-10-19');
    // Domingo 25-oct 23:30 en México = lunes 05:30 UTC: todavía es la semana del 19.
    expect(lastClosedWeekStart(new Date('2026-10-26T05:30:00Z'))).toBe('2026-10-12');
  });

  it('la reserva se libera 30 días naturales después del cierre', () => {
    const w = payoutWeek('2026-10-19')!;
    expect(retentionReleaseAt(w.periodEnd).toISOString()).toBe('2026-11-25T06:00:00.000Z');
  });
});

describe('partidas que se pueden liquidar', () => {
  const paidAt = new Date('2026-10-20T18:00:00Z');

  it('solo clases COMPLETADAS y cobradas: nunca se paga una clase que no se impartió', () => {
    const base = { paidAt, teacherPayCents: 30_000, finalTariffCents: 40_000, refundedCents: 0 };
    expect(classPayableCents({ ...base, status: 'COMPLETED' })).toBe(30_000);
    for (const status of ['BOOKED', 'CONFIRMED', 'IN_PROGRESS', 'CANCELLED', 'NO_SHOW_TEACHER', 'NO_SHOW_STUDENT', 'DISPUTED', 'PENDING_PAYMENT']) {
      expect(classPayableCents({ ...base, status }), status).toBe(0);
    }
    expect(classPayableCents({ ...base, status: 'COMPLETED', paidAt: null })).toBe(0);
  });

  it('un reembolso se reparte en la misma proporción que la venta', () => {
    expect(teacherShareAfterRefund(30_000, 40_000, 20_000)).toBe(15_000);
    expect(teacherShareAfterRefund(30_000, 40_000, 40_000)).toBe(0);
    expect(teacherShareAfterRefund(30_000, 40_000, 99_999)).toBe(0);
    expect(teacherShareAfterRefund(30_000, 40_000, 0)).toBe(30_000);
    // Redondeo al centavo, en enteros.
    expect(Number.isInteger(teacherShareAfterRefund(37_425, 49_900, 10_000))).toBe(true);
  });

  it('cursos: pagados, con precio y no reembolsados; los gratuitos no generan liquidación', () => {
    const e = { paidAt, pricePaidCents: 49_900, teacherPayCents: 37_425 };
    expect(enrollmentPayableCents({ ...e, status: 'ACTIVE' })).toBe(37_425);
    expect(enrollmentPayableCents({ ...e, status: 'COMPLETED' })).toBe(37_425);
    expect(enrollmentPayableCents({ ...e, status: 'REFUNDED' })).toBe(0);
    expect(enrollmentPayableCents({ status: 'ACTIVE', paidAt, pricePaidCents: 0, teacherPayCents: 0 })).toBe(0);
    expect(enrollmentPayableCents({ ...e, status: 'ACTIVE', paidAt: null })).toBe(0);
  });
});

describe('calculateWeeklyPayout', () => {
  it('el ejemplo de la spec §5.2: $1,200 + $4,485 = $5,685; reserva $852.75; neto $4,832.25', () => {
    const r = calculateWeeklyPayout({
      classes: [30_000, 30_000, 30_000, 30_000].map((c, i) => ({ id: `c${i}`, payableCents: c })),
      enrollments: Array.from({ length: 12 }, (_, i) => ({ id: `e${i}`, payableCents: 37_375 })),
      adjustments: [],
      releasableRetentions: [],
    });
    expect(r).toMatchObject({
      classRevenueCents: 120_000,
      courseRevenueCents: 448_500,
      grossCents: 568_500,
      retentionCents: 85_275,
      netCents: 483_225,
      classCount: 4,
      enrollmentCount: 12,
      meetsMinimum: true,
    });
  });

  it('suma exacta: bruto − reserva + liberadas + ajustes = neto, en centavos enteros', () => {
    const r = calculateWeeklyPayout({
      classes: [{ id: 'c1', payableCents: 33_333 }],
      enrollments: [{ id: 'e1', payableCents: 7_425 }],
      adjustments: [{ id: 'a1', amountCents: -7_425 }],
      releasableRetentions: [{ payoutId: 'p0', retentionCents: 4_500 }],
    });
    expect(r.retentionCents).toBe(retentionFor(40_758));
    expect(r.netCents).toBe(40_758 - r.retentionCents + 4_500 - 7_425);
    expect(Number.isInteger(r.netCents)).toBe(true);
    expect(r.adjustmentIds).toEqual(['a1']);
    expect(r.releasedFromPayoutIds).toEqual(['p0']);
  });

  it('la reserva NO se calcula sobre reservas liberadas ni ajustes, solo sobre lo nuevo', () => {
    const r = calculateWeeklyPayout({ classes: [], enrollments: [], adjustments: [], releasableRetentions: [{ payoutId: 'p0', retentionCents: 45_000 }] });
    expect(r).toMatchObject({ grossCents: 0, retentionCents: 0, netCents: 45_000, meetsMinimum: true });
  });

  it('neto bajo $300 → no se liquida (se acumula); exactamente $300 sí', () => {
    const under = calculateWeeklyPayout({ classes: [], enrollments: [{ id: 'e', payableCents: 35_000 }], adjustments: [], releasableRetentions: [] });
    expect(under.netCents).toBe(29_750);
    expect(under.meetsMinimum).toBe(false);
    const exact = calculateWeeklyPayout({ classes: [], enrollments: [], adjustments: [], releasableRetentions: [{ payoutId: 'p', retentionCents: 30_000 }] });
    expect(exact.meetsMinimum).toBe(true);
    expect(PAYOUT_RULES.MIN_PAYOUT_CENTS).toBe(COURSE_COMMISSION.MIN_PAYOUT_CENTS);
  });

  it('un ajuste negativo mayor que la semana deja el neto negativo: no se liquida, la deuda sigue', () => {
    const r = calculateWeeklyPayout({ classes: [{ id: 'c', payableCents: 10_000 }], enrollments: [], adjustments: [{ id: 'a', amountCents: -37_425 }], releasableRetentions: [] });
    expect(r.netCents).toBeLessThan(0);
    expect(r.meetsMinimum).toBe(false);
  });

  it('partidas en cero (reembolsadas por completo) no cuentan ni se asignan', () => {
    const r = calculateWeeklyPayout({ classes: [{ id: 'c0', payableCents: 0 }, { id: 'c1', payableCents: 40_000 }], enrollments: [], adjustments: [], releasableRetentions: [] });
    expect(r.classIds).toEqual(['c1']);
    expect(r.classCount).toBe(1);
  });

  it('un monto con fracción de centavo es un error, no un redondeo silencioso', () => {
    expect(() => calculateWeeklyPayout({ classes: [{ id: 'c', payableCents: 100.5 }], enrollments: [], adjustments: [], releasableRetentions: [] })).toThrow();
  });
});

describe('refundAdjustmentDelta — reembolso DESPUÉS de liquidar', () => {
  it('reembolso total de una partida ya liquidada → descuento por todo lo acreditado', () => {
    expect(refundAdjustmentDelta({ creditedCents: 37_425, currentShareCents: 0, existingCents: 0 })).toBe(-37_425);
  });
  it('idempotente: el mismo reembolso visto dos veces no descuenta dos veces', () => {
    expect(refundAdjustmentDelta({ creditedCents: 37_425, currentShareCents: 0, existingCents: -37_425 })).toBe(0);
  });
  it('dos reembolsos parciales: el segundo descuenta solo la diferencia', () => {
    const first = refundAdjustmentDelta({ creditedCents: 30_000, currentShareCents: 15_000, existingCents: 0 });
    expect(first).toBe(-15_000);
    expect(refundAdjustmentDelta({ creditedCents: 30_000, currentShareCents: 0, existingCents: first })).toBe(-15_000);
  });
  it('nunca devuelve un ajuste positivo', () => {
    expect(refundAdjustmentDelta({ creditedCents: 10_000, currentShareCents: 30_000, existingCents: 0 })).toBe(0);
  });
});

describe('estados de una liquidación', () => {
  const ALL: PayoutStatusName[] = ['PENDING', 'APPROVED', 'TRANSFERRED', 'FAILED', 'CANCELLED'];
  const DECISIONS: PayoutDecision[] = ['APPROVE', 'MARK_TRANSFERRED', 'MARK_FAILED', 'CANCEL'];
  const EXPECTED: Record<string, PayoutStatusName | null> = {
    'PENDING:APPROVE': 'APPROVED',
    'PENDING:CANCEL': 'CANCELLED',
    'APPROVED:MARK_TRANSFERRED': 'TRANSFERRED',
    'APPROVED:MARK_FAILED': 'FAILED',
    'APPROVED:CANCEL': 'CANCELLED',
    'FAILED:MARK_TRANSFERRED': 'TRANSFERRED',
    'FAILED:CANCEL': 'CANCELLED',
  };

  it('matriz completa: lo que no está en la tabla se rechaza (una transferida no se cancela)', () => {
    for (const s of ALL) {
      for (const d of DECISIONS) {
        expect(nextPayoutStatus(s, d), `${s}:${d}`).toBe(EXPECTED[`${s}:${d}`] ?? null);
      }
    }
  });

  it('retener la reserva: solo transferida, retenida, sin pagar y con monto', () => {
    const held = { status: 'HELD', paidInPayoutId: null, cents: 5_000 };
    expect(nextPayoutStatus('TRANSFERRED', 'FORFEIT_RETENTION', held)).toBe('TRANSFERRED');
    expect(nextPayoutStatus('APPROVED', 'FORFEIT_RETENTION', held)).toBeNull();
    expect(nextPayoutStatus('TRANSFERRED', 'FORFEIT_RETENTION', { ...held, status: 'RELEASED' })).toBeNull();
    expect(nextPayoutStatus('TRANSFERRED', 'FORFEIT_RETENTION', { ...held, paidInPayoutId: 'x' })).toBeNull();
    expect(nextPayoutStatus('TRANSFERRED', 'FORFEIT_RETENTION', { ...held, cents: 0 })).toBeNull();
  });

  it('clave de rastreo SPEI: alfanumérica de 6 a 30', () => {
    expect(isValidSpeiTrackingKey('MBAN01002610260001')).toBe(true);
    expect(isValidSpeiTrackingKey('12345')).toBe(false);
    expect(isValidSpeiTrackingKey('A'.repeat(31))).toBe(false);
    expect(isValidSpeiTrackingKey('ABC 123')).toBe(false);
    expect(isValidSpeiTrackingKey("1' OR '1")).toBe(false);
  });
});

describe('hoja de pago', () => {
  const payout: PayoutForSheet = {
    id: 'ckpayout000000000000a3f81b2c',
    status: 'APPROVED',
    periodStart: new Date('2026-10-19T06:00:00Z'),
    periodEnd: new Date('2026-10-26T06:00:00Z'),
    classRevenueCents: 120_000,
    courseRevenueCents: 448_500,
    grossCents: 568_500,
    retentionCents: 85_275,
    adjustmentCents: 0,
    releasedRetentionCents: 0,
    netCents: 483_225,
    classCount: 4,
    enrollmentCount: 12,
    speiReference: null,
    teacher: { fullName: 'Juan Pérez García', displayName: 'Prof. Juan', clabe: '012180015812345678', bankName: 'BBVA', paymentRail: 'ASIMILADOS' },
  };

  it('referencia YAENTRE-PO-<últimos 8> y periodo «19–25 oct 2026»', () => {
    expect(payoutReference(payout.id)).toBe('YAENTRE-PO-A3F81B2C');
    expect(payoutPeriodLabel(payout.periodStart, payout.periodEnd)).toBe('19–25 oct 2026');
    expect(payoutPeriodLabel(new Date('2026-10-26T06:00:00Z'), new Date('2026-11-02T06:00:00Z'))).toBe('26 oct–1 nov 2026');
  });

  it('CLABE y nombre legal completos SOLO para el maestro', () => {
    const master = buildPayoutSheetRow(payout, { revealBankData: true });
    expect(master).toMatchObject({ clabe: '012180015812345678', teacherName: 'Juan Pérez García', net: '$4,832.25', retention: '−$852.75' });
    const reader = buildPayoutSheetRow(payout, { revealBankData: false });
    expect(reader.clabe).toBe('****5678');
    expect(reader.teacherName).toBe('Prof. Juan');
    expect(JSON.stringify(reader)).not.toContain('012180015812345678');
  });

  it('la hoja del día lista solo las aprobadas', () => {
    expect(generatePayoutSheet([payout, { ...payout, id: 'ckpending', status: 'PENDING' }], { revealBankData: true })).toHaveLength(1);
  });

  it('el pago nunca se llama salario, sueldo, honorarios ni nómina', () => {
    const text = JSON.stringify(buildPayoutSheetRow(payout, { revealBankData: true }));
    expect(text).not.toMatch(/salario|sueldo|honorarios|n[oó]mina/i);
  });
});
