import { describe, expect, it } from 'vitest';
import {
  ISR_SCENARIO_RATES_BPS,
  RESERVE_HOLD_DAYS,
  buildFiscalYear,
  buildMonthlyFiscal,
  dueDate17,
  dueStatus,
  mexicoMonthOf,
  monthKey,
  monthRangeUtc,
  parseMonthKey,
  retentionScenarios,
  splitIva,
  summarizeReserves,
  totalsOf,
  type ClassIncomeRow,
  type RefundRow,
  type SubscriptionPaymentRow,
} from '@/lib/admin/fiscal';

const OCT = { year: 2026, month: 10 };
const NOV = { year: 2026, month: 11 };

const pay = (amountCents: number, iso: string): SubscriptionPaymentRow => ({ amountCents, paidAt: new Date(iso) });
const refund = (amountCents: number, iso: string): RefundRow => ({ amountCents, occurredAt: new Date(iso) });
const cls = (over: Omit<Partial<ClassIncomeRow>, 'paidAt'> & { paidAt: string }): ClassIncomeRow => ({
  retainedCents: 30_000,
  commissionCents: 7_500,
  rail: 'ASIMILADOS',
  ...over,
  paidAt: new Date(over.paidAt),
});
const NONE = { payments: [], refunds: [], classes: [] };

describe('IVA incluido en el precio (16 %)', () => {
  it('Básico $999: base $861.21 e IVA $137.79 — las cifras de la spec de comisiones', () => {
    expect(splitIva(99_900)).toEqual({ baseCents: 86_121, ivaCents: 13_779 });
  });

  it('Premium $1,799: base + IVA = bruto', () => {
    const s = splitIva(179_900);
    expect(s.baseCents + s.ivaCents).toBe(179_900);
    expect(s.ivaCents).toBe(24_814);
  });

  it('base + IVA === bruto para CUALQUIER importe (recorrido de 5 000 valores)', () => {
    for (let g = 0; g < 5_000; g += 1) {
      const s = splitIva(g * 7 + 1);
      expect(s.baseCents + s.ivaCents).toBe(g * 7 + 1);
    }
  });

  it('cero → cero', () => {
    expect(splitIva(0)).toEqual({ baseCents: 0, ivaCents: 0 });
  });

  it('un importe negativo es SIMÉTRICO: un cobro y su devolución se cancelan al centavo', () => {
    const cobro = splitIva(99_900);
    const devolucion = splitIva(-99_900);
    expect(devolucion.baseCents).toBe(-cobro.baseCents);
    expect(devolucion.ivaCents).toBe(-cobro.ivaCents);
    expect(cobro.ivaCents + devolucion.ivaCents).toBe(0);
  });

  it('rechaza importes fraccionarios o NaN', () => {
    for (const bad of [0.5, Number.NaN, Infinity]) expect(() => splitIva(bad)).toThrow();
  });

  it('el IVA se calcula sobre el TOTAL del mes, no cobro por cobro: puede diferir en centavos del CFDI unitario', () => {
    const total = splitIva(299_700); // 3 × $999, como lo diría el CFDI global mensual
    const porCobro = splitIva(99_900).ivaCents * 3;
    expect(total.ivaCents).toBe(41_338);
    expect(porCobro).toBe(41_337);
    expect(total.ivaCents - porCobro).toBe(1); // por eso el tablero calcula sobre el total
  });
});

describe('los meses se miden en hora de México (UTC−6)', () => {
  it('el 1 de nov a las 05:59:59Z todavía es OCTUBRE; a las 06:00:00Z ya es noviembre', () => {
    expect(mexicoMonthOf(new Date('2026-11-01T05:59:59Z'))).toEqual(OCT);
    expect(mexicoMonthOf(new Date('2026-11-01T06:00:00Z'))).toEqual(NOV);
  });

  it('un cobro de las 23:30 del 31 de oct en México cuenta en octubre', () => {
    const m = buildMonthlyFiscal(OCT, { ...NONE, payments: [pay(99_900, '2026-11-01T05:30:00Z')] });
    expect(m.subscriptionsGrossCents).toBe(99_900);
    const n = buildMonthlyFiscal(NOV, { ...NONE, payments: [pay(99_900, '2026-11-01T05:30:00Z')] });
    expect(n.subscriptionsGrossCents).toBe(0);
  });

  it('el rango de un mes es [inicio, fin) en UTC y encadena con el siguiente sin huecos ni traslapes', () => {
    const oct = monthRangeUtc(OCT);
    const nov = monthRangeUtc(NOV);
    expect(oct.startUtc.toISOString()).toBe('2026-10-01T06:00:00.000Z');
    expect(oct.endUtc.getTime()).toBe(nov.startUtc.getTime());
    const dec = monthRangeUtc({ year: 2026, month: 12 });
    expect(dec.endUtc.toISOString()).toBe('2027-01-01T06:00:00.000Z');
  });

  it('las claves de mes se escriben y se leen sin ambigüedad', () => {
    expect(monthKey({ year: 2026, month: 3 })).toBe('2026-03');
    expect(parseMonthKey('2026-03')).toEqual({ year: 2026, month: 3 });
    for (const bad of ['2026-13', '2026-00', '26-03', '2026-3', '', '2026-03-01', 'x']) {
      expect(parseMonthKey(bad)).toBeNull();
    }
  });
});

describe('ingreso propio del mes, por fuente', () => {
  it('suscripciones al 100 %, Carril A solo comisión, Carril B valor completo', () => {
    const m = buildMonthlyFiscal(OCT, {
      payments: [pay(99_900, '2026-10-05T18:00:00Z')],
      refunds: [],
      classes: [
        cls({ paidAt: '2026-10-06T18:00:00Z', rail: 'COMISION_MERCANTIL', retainedCents: 30_000, commissionCents: 7_500 }),
        cls({ paidAt: '2026-10-07T18:00:00Z', rail: 'ASIMILADOS', retainedCents: 30_000, commissionCents: 7_500 }),
      ],
    });
    expect(m.subscriptionsGrossCents).toBe(99_900);
    expect(m.classCarrilACommissionCents).toBe(7_500); // NO los 30 000: el resto es del profesor
    expect(m.classCarrilBGrossCents).toBe(30_000); // el valor COMPLETO
    expect(m.ownIncomeGrossCents).toBe(99_900 + 7_500 + 30_000);
    expect(m.baseCents + m.ivaCents).toBe(m.ownIncomeGrossCents);
  });

  it('una clase totalmente reembolsada no cuenta; una parcial cuenta lo retenido', () => {
    const m = buildMonthlyFiscal(OCT, {
      ...NONE,
      classes: [
        cls({ paidAt: '2026-10-06T18:00:00Z', retainedCents: 0, commissionCents: 0 }),
        cls({ paidAt: '2026-10-06T19:00:00Z', retainedCents: 15_000, commissionCents: 3_750 }),
      ],
    });
    expect(m.classCarrilBGrossCents).toBe(15_000);
    expect(m.movements).toBe(1);
  });

  it('la comisión se acota a lo retenido: un dato malo no infla el IVA', () => {
    const m = buildMonthlyFiscal(OCT, {
      ...NONE,
      classes: [cls({ paidAt: '2026-10-06T18:00:00Z', rail: 'COMISION_MERCANTIL', retainedCents: 1_000, commissionCents: 9_999 })],
    });
    expect(m.classCarrilACommissionCents).toBe(1_000);
  });

  it('un mes sin movimiento queda en cero y con 0 partidas', () => {
    const m = buildMonthlyFiscal(OCT, NONE);
    expect(m.ownIncomeGrossCents).toBe(0);
    expect(m.movements).toBe(0);
    expect(m.ivaCents).toBe(0);
  });

  it('rechaza importes negativos o fraccionarios en las filas', () => {
    expect(() => buildMonthlyFiscal(OCT, { ...NONE, payments: [pay(-1, '2026-10-05T18:00:00Z')] })).toThrow();
    expect(() => buildMonthlyFiscal(OCT, { ...NONE, payments: [pay(1.5, '2026-10-05T18:00:00Z')] })).toThrow();
    expect(() => buildMonthlyFiscal(OCT, { ...NONE, refunds: [refund(-5, '2026-10-05T18:00:00Z')] })).toThrow();
  });
});

describe('las devoluciones restan en el mes en que se HACEN', () => {
  const data = {
    payments: [pay(99_900, '2026-10-05T18:00:00Z')],
    refunds: [refund(99_900, '2026-11-03T18:00:00Z')],
    classes: [],
  };

  it('el cobro de octubre devuelto en noviembre NO reduce octubre', () => {
    expect(buildMonthlyFiscal(OCT, data).ownIncomeGrossCents).toBe(99_900);
  });

  it('en noviembre resta, y como no hubo cobros el mes sale NEGATIVO: saldo a favor, no un cero que lo esconda', () => {
    const nov = buildMonthlyFiscal(NOV, data);
    expect(nov.subscriptionRefundsCents).toBe(99_900);
    expect(nov.ownIncomeGrossCents).toBe(-99_900);
    expect(nov.ivaCents).toBe(-13_779);
    expect(nov.movements).toBe(1);
  });

  it('el año completo cuadra: cobro y devolución se cancelan en el total', () => {
    const months = buildFiscalYear(2026, data);
    const t = totalsOf(months);
    expect(t.ownIncomeGrossCents).toBe(0);
    expect(t.ivaCents).toBe(0);
    expect(t.subscriptionRefundsCents).toBe(99_900);
  });

  it('una devolución del mismo mes que el cobro lo netea en ese mes', () => {
    const m = buildMonthlyFiscal(OCT, {
      payments: [pay(99_900, '2026-10-05T18:00:00Z')],
      refunds: [refund(99_900, '2026-10-06T18:00:00Z')],
      classes: [],
    });
    expect(m.ownIncomeGrossCents).toBe(0);
  });
});

describe('fecha límite: el día 17 del mes siguiente', () => {
  const iso = (d: Date) => d.toISOString();

  it('el fin del día 17 en México (23:59:59.999 UTC−6) del mes siguiente', () => {
    // 17 de nov de 2026 es MARTES.
    expect(iso(dueDate17(OCT))).toBe('2026-11-18T05:59:59.999Z');
  });

  it('si el 17 cae en SÁBADO se recorre al lunes 19 (art. 12 CFF)', () => {
    // 17 de octubre de 2026 es SÁBADO → el mes de septiembre vence el lunes 19.
    expect(iso(dueDate17({ year: 2026, month: 9 }))).toBe('2026-10-20T05:59:59.999Z');
  });

  it('si el 17 cae en DOMINGO se recorre al lunes 18', () => {
    // 17 de mayo de 2026 es DOMINGO → abril vence el lunes 18.
    expect(iso(dueDate17({ year: 2026, month: 4 }))).toBe('2026-05-19T05:59:59.999Z');
  });

  it('diciembre vence el 17 de ENERO del año siguiente', () => {
    // 17 de enero de 2027 es DOMINGO → lunes 18.
    expect(iso(dueDate17({ year: 2026, month: 12 }))).toBe('2027-01-19T05:59:59.999Z');
  });

  it('el año de un mes sigue su curso al cambiar de año (nov→dic no lo toca)', () => {
    expect(iso(dueDate17({ year: 2026, month: 11 }))).toBe('2026-12-18T05:59:59.999Z');
  });
});

describe('estado del vencimiento respecto de hoy', () => {
  const oct = buildMonthlyFiscal(OCT, { ...NONE, payments: [pay(99_900, '2026-10-05T18:00:00Z')] });
  const at = (iso: string) => new Date(iso);

  it('un mes que aún no termina no se puede enterar todavía (UPCOMING)', () => {
    expect(dueStatus(oct, at('2026-10-20T12:00:00Z'))).toBe('UPCOMING');
  });

  it('ya terminó y faltan más de 5 días → UPCOMING; dentro de 5 días → DUE_SOON', () => {
    expect(dueStatus(oct, at('2026-11-05T12:00:00Z'))).toBe('UPCOMING');
    expect(dueStatus(oct, at('2026-11-14T12:00:00Z'))).toBe('DUE_SOON');
  });

  it('pasado el 17 → OVERDUE', () => {
    expect(dueStatus(oct, at('2026-11-18T12:00:00Z'))).toBe('OVERDUE');
  });

  it('un mes sin movimiento no vence en nada', () => {
    expect(dueStatus(buildMonthlyFiscal(OCT, NONE), at('2027-06-01T12:00:00Z'))).toBe('NO_ACTIVITY');
  });
});

describe('retenciones: SOLO escenarios, nunca una cifra a pagar', () => {
  it('las tasas en discusión son exactamente 1 % y 2.5 % (handoff §6.6)', () => {
    expect([...ISR_SCENARIO_RATES_BPS]).toEqual([100, 250]);
  });

  it('cada escenario aplica su tasa a la base SIN IVA', () => {
    const [uno, dosYMedio] = retentionScenarios(116_000); // $1,160 con IVA → $1,000 de base
    expect(uno).toEqual({ ratePercent: 1, baseCents: 100_000, isrCents: 1_000 });
    expect(dosYMedio).toEqual({ ratePercent: 2.5, baseCents: 100_000, isrCents: 2_500 });
  });

  it('sin pagos a profesores no hay base ni retención', () => {
    for (const s of retentionScenarios(0)) {
      expect(s.baseCents).toBe(0);
      expect(s.isrCents).toBe(0);
    }
  });

  it('el módulo NO expone una tasa de IVA retenido: esa decisión sigue abierta (§6.7)', async () => {
    const mod = await import('@/lib/admin/fiscal');
    expect(Object.keys(mod).filter((k) => /iva.*ret|ret.*iva/i.test(k))).toEqual([]);
  });
});

describe('reserva de desempeño (15 % / 30 días)', () => {
  const now = new Date('2026-11-20T12:00:00Z');
  const row = (over: Partial<Parameters<typeof summarizeReserves>[0][number]> = {}) => ({
    retentionCents: 27_000,
    status: 'HELD' as const,
    transferredAt: new Date('2026-11-10T12:00:00Z'),
    ...over,
  });

  it('30 días naturales', () => {
    expect(RESERVE_HOLD_DAYS).toBe(30);
  });

  it('separa retenido, liberado y confiscado, y calcula la próxima liberación', () => {
    const s = summarizeReserves(
      [
        row(),
        row({ retentionCents: 10_000, transferredAt: new Date('2026-11-15T12:00:00Z') }),
        row({ status: 'RELEASED', retentionCents: 5_000 }),
        row({ status: 'FORFEITED', retentionCents: 3_000 }),
      ],
      now
    );
    expect(s.heldCents).toBe(37_000);
    expect(s.heldCount).toBe(2);
    expect(s.releasedCents).toBe(5_000);
    expect(s.forfeitedCents).toBe(3_000);
    // La más próxima: transferida el 10 de nov + 30 días = 10 de dic.
    expect(s.nextReleaseAt?.toISOString()).toBe('2026-12-10T12:00:00.000Z');
    expect(s.overdueCount).toBe(0);
  });

  it('una reserva retenida más de 30 días es una ANOMALÍA (el job de liberación no corre), no una liberación silenciosa', () => {
    const s = summarizeReserves([row({ transferredAt: new Date('2026-10-01T12:00:00Z') })], now);
    expect(s.overdueCount).toBe(1);
    expect(s.heldCents).toBe(27_000); // sigue retenida: no se libera sola aquí
    expect(s.nextReleaseAt).toBeNull();
  });

  it('sin liquidaciones (el motor está bloqueado) todo es cero y sin próxima liberación', () => {
    expect(summarizeReserves([], now)).toEqual({
      heldCents: 0,
      releasedCents: 0,
      forfeitedCents: 0,
      heldCount: 0,
      nextReleaseAt: null,
      overdueCount: 0,
    });
  });
});

describe('año fiscal completo', () => {
  it('devuelve los 12 meses en orden, o hasta el mes pedido', () => {
    expect(buildFiscalYear(2026, NONE).map((m) => m.key)).toEqual([
      '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06',
      '2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12',
    ]);
    expect(buildFiscalYear(2026, NONE, 3).map((m) => m.key)).toEqual(['2026-01', '2026-02', '2026-03']);
  });

  it('cada cobro cae en UN solo mes: la suma de los meses es el total cobrado', () => {
    const payments = [
      pay(99_900, '2026-01-31T05:59:59Z'), // 30 de enero en México
      pay(99_900, '2026-01-31T06:00:00Z'), // 31 de enero
      pay(99_900, '2026-02-01T05:59:59Z'), // 31 de enero
      pay(99_900, '2026-02-01T06:00:00Z'), // 1 de febrero
    ];
    const months = buildFiscalYear(2026, { ...NONE, payments });
    expect(months[0]!.subscriptionsGrossCents).toBe(3 * 99_900);
    expect(months[1]!.subscriptionsGrossCents).toBe(99_900);
    expect(totalsOf(months).subscriptionsGrossCents).toBe(4 * 99_900);
  });
});
