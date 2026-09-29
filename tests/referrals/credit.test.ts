import { describe, expect, it } from 'vitest';
import {
  availableCreditCents,
  isLotUsable,
  nextExpiry,
  parseAllocations,
  planAllocation,
  usableLots,
  type CreditLotView,
} from '@/lib/referrals/credit';

const NOW = new Date('2026-11-01T12:00:00.000Z');
const d = (iso: string) => new Date(iso);

function lot(id: string, remaining: number, expires: string, revoked: string | null = null): CreditLotView {
  return { id, remainingCents: remaining, expiresAt: d(expires), revokedAt: revoked ? d(revoked) : null };
}

describe('qué lote sirve', () => {
  it('con saldo, sin revocar y sin vencer', () => {
    expect(isLotUsable(lot('a', 15_000, '2027-05-01T00:00:00Z'), NOW)).toBe(true);
  });

  it('sin saldo NO', () => {
    expect(isLotUsable(lot('a', 0, '2027-05-01T00:00:00Z'), NOW)).toBe(false);
  });

  it('revocado NO, aunque tenga saldo (la venta se revirtió)', () => {
    expect(isLotUsable(lot('a', 15_000, '2027-05-01T00:00:00Z', '2026-10-30T00:00:00Z'), NOW)).toBe(false);
  });

  it('vencido NO, y vence EN el instante (no un milisegundo después)', () => {
    expect(isLotUsable(lot('a', 15_000, '2026-10-31T23:59:59.999Z'), NOW)).toBe(false);
    expect(isLotUsable(lot('a', 15_000, '2026-11-01T12:00:00.000Z'), NOW)).toBe(false);
    expect(isLotUsable(lot('a', 15_000, '2026-11-01T12:00:00.001Z'), NOW)).toBe(true);
  });
});

describe('crédito disponible y próximo vencimiento', () => {
  const lots = [
    lot('nuevo', 15_000, '2027-10-01T00:00:00Z'),
    lot('viejo', 5_000, '2027-02-01T00:00:00Z'),
    lot('vencido', 15_000, '2026-10-01T00:00:00Z'),
    lot('revocado', 15_000, '2027-06-01T00:00:00Z', '2026-10-15T00:00:00Z'),
    lot('gastado', 0, '2027-03-01T00:00:00Z'),
  ];

  it('suma SOLO lo utilizable: $150 + $50 = $200', () => {
    expect(availableCreditCents(lots, NOW)).toBe(20_000);
  });

  it('el próximo vencimiento es el del lote utilizable que vence primero', () => {
    expect(nextExpiry(lots, NOW)).toEqual(d('2027-02-01T00:00:00Z'));
  });

  it('sin crédito: 0 y sin vencimiento', () => {
    expect(availableCreditCents([], NOW)).toBe(0);
    expect(nextExpiry([], NOW)).toBeNull();
    expect(nextExpiry([lot('x', 0, '2027-01-01T00:00:00Z')], NOW)).toBeNull();
  });

  it('usableLots sale ordenado: el que vence antes primero', () => {
    expect(usableLots(lots, NOW).map((l) => l.id)).toEqual(['viejo', 'nuevo']);
  });
});

describe('planAllocation — de qué lote sale cada centavo', () => {
  const lots = [
    lot('b', 15_000, '2027-06-01T00:00:00Z'),
    lot('a', 5_000, '2027-02-01T00:00:00Z'),
    lot('c', 15_000, '2027-10-01T00:00:00Z'),
  ];

  it('consume primero el que vence antes', () => {
    expect(planAllocation(lots, NOW, 3_000)).toEqual({
      allocations: [{ lotId: 'a', cents: 3_000 }],
      allocatedCents: 3_000,
    });
  });

  it('cruza de un lote al siguiente', () => {
    expect(planAllocation(lots, NOW, 12_000)).toEqual({
      allocations: [
        { lotId: 'a', cents: 5_000 },
        { lotId: 'b', cents: 7_000 },
      ],
      allocatedCents: 12_000,
    });
  });

  it('todo el saldo exacto', () => {
    const plan = planAllocation(lots, NOW, 35_000);
    expect(plan.allocatedCents).toBe(35_000);
    expect(plan.allocations.map((a) => a.lotId)).toEqual(['a', 'b', 'c']);
  });

  it('si el saldo no alcanza, da lo que hay y lo dice (allocatedCents < pedido)', () => {
    const plan = planAllocation(lots, NOW, 40_000);
    expect(plan.allocatedCents).toBe(35_000);
  });

  it('a igualdad de vencimiento el orden es determinista (por id)', () => {
    const same = [lot('z', 1_000, '2027-01-01T00:00:00Z'), lot('m', 1_000, '2027-01-01T00:00:00Z')];
    expect(planAllocation(same, NOW, 1_500).allocations).toEqual([
      { lotId: 'm', cents: 1_000 },
      { lotId: 'z', cents: 500 },
    ]);
  });

  it('nunca toca un lote vencido, revocado o sin saldo', () => {
    const plan = planAllocation(
      [lot('vencido', 15_000, '2026-01-01T00:00:00Z'), lot('revocado', 15_000, '2027-01-01T00:00:00Z', '2026-10-01T00:00:00Z')],
      NOW,
      10_000
    );
    expect(plan).toEqual({ allocations: [], allocatedCents: 0 });
  });

  it('pedir 0, negativo o fraccionario no asigna nada', () => {
    for (const amount of [0, -5, 10.5, Number.NaN]) {
      expect(planAllocation(lots, NOW, amount)).toEqual({ allocations: [], allocatedCents: 0 });
    }
  });

  it('PROPIEDAD: la suma de lo asignado es la de lo devuelto y ninguna asignación pasa del saldo del lote', () => {
    for (let amount = 1; amount <= 40_000; amount += 137) {
      const plan = planAllocation(lots, NOW, amount);
      const total = plan.allocations.reduce((s, a) => s + a.cents, 0);
      expect(total).toBe(plan.allocatedCents);
      expect(plan.allocatedCents).toBe(Math.min(amount, 35_000));
      for (const a of plan.allocations) {
        expect(a.cents).toBeGreaterThan(0);
        expect(a.cents).toBeLessThanOrEqual(lots.find((l) => l.id === a.lotId)!.remainingCents);
      }
    }
  });
});

describe('parseAllocations (lo que viene de la base se valida)', () => {
  it('lee una lista válida', () => {
    expect(parseAllocations([{ lotId: 'a', cents: 100 }])).toEqual([{ lotId: 'a', cents: 100 }]);
  });

  it('descarta lo mal formado en vez de fallar', () => {
    expect(
      parseAllocations([
        { lotId: 'a', cents: 100 },
        { lotId: 5, cents: 100 },
        { lotId: 'b', cents: 0 },
        { lotId: 'c', cents: -3 },
        { lotId: 'd', cents: 1.5 },
        null,
        'x',
      ])
    ).toEqual([{ lotId: 'a', cents: 100 }]);
  });

  it('lo que no es lista es lista vacía', () => {
    expect(parseAllocations(null)).toEqual([]);
    expect(parseAllocations({ lotId: 'a', cents: 1 })).toEqual([]);
    expect(parseAllocations('[]')).toEqual([]);
  });
});
