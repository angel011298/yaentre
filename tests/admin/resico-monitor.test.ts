import { describe, expect, it } from 'vitest';
import {
  calculateResicoStatusV2,
  dayOfYearFromKey,
  emptyMarketplaceRevenue,
  RESICO_CEILING_CENTS,
  type MarketplaceRevenue,
} from '@/lib/admin/resico-monitor';

function revenue(a: { total: number; commission: number }, b: { total: number; commission: number }): MarketplaceRevenue {
  const r = emptyMarketplaceRevenue();
  r.carrils.A = { count: 1, totalCents: a.total, commissionCents: a.commission };
  r.carrils.B = { count: 1, totalCents: b.total, commissionCents: b.commission };
  r.totalCents = a.total + b.total;
  r.commissionCents = a.commission + b.commission;
  return r;
}

describe('calculateResicoStatusV2 — peor caso (todo como Carril B)', () => {
  it('suma suscripciones + el TOTAL de clases + el TOTAL de cursos, sin importar el carril', () => {
    const classes = revenue({ total: 5_000_000, commission: 1_250_000 }, { total: 34_400_000, commission: 8_600_000 });
    const courses = revenue({ total: 2_000_000, commission: 500_000 }, { total: 1_000_000, commission: 250_000 });
    const s = calculateResicoStatusV2(49_950_000, classes, courses, 120);
    expect(s.yearToDateIncomeCents).toBe(49_950_000 + 39_400_000 + 3_000_000);
    expect(s.classIncomeCents).toBe(39_400_000);
    expect(s.courseIncomeCents).toBe(3_000_000);
    // Realista: Carril A solo comisión, Carril B el total.
    expect(s.realisticIncomeCents).toBe(49_950_000 + 1_250_000 + 34_400_000 + 500_000 + 1_000_000);
    expect(s.realisticIncomeCents).toBeLessThan(s.yearToDateIncomeCents);
  });

  it('semáforo: < 60 % verde, < 80 % amarillo, ≥ 80 % rojo (fronteras exactas)', () => {
    const none = emptyMarketplaceRevenue();
    const at = (pct: number) => calculateResicoStatusV2((RESICO_CEILING_CENTS * pct) / 100, none, none, 200).signal;
    expect(at(59.9)).toBe('GREEN');
    expect(at(60)).toBe('YELLOW');
    expect(at(79.9)).toBe('YELLOW');
    expect(at(80)).toBe('RED');
    expect(at(120)).toBe('RED');
  });

  it('los cursos SÍ mueven el semáforo (spec §5.3): sin ellos estaría verde', () => {
    const none = emptyMarketplaceRevenue();
    const courses = revenue({ total: 0, commission: 0 }, { total: 100_000_000, commission: 25_000_000 });
    expect(calculateResicoStatusV2(150_000_000, none, none, 200).signal).toBe('GREEN');
    expect(calculateResicoStatusV2(150_000_000, none, courses, 200).signal).toBe('YELLOW');
  });

  it('proyección lineal al cierre del año y aviso si rebasaría el techo', () => {
    const none = emptyMarketplaceRevenue();
    const s = calculateResicoStatusV2(100_000_000, none, none, 73);
    expect(s.projectedAnnualCents).toBe(500_000_000);
    expect(s.projectedOverCeiling).toBe(true);
    expect(s.signal).toBe('GREEN');
    expect(calculateResicoStatusV2(100_000_000, none, none, 0).projectedAnnualCents).toBe(36_500_000_000);
  });

  it('el porcentaje se redondea a un decimal', () => {
    expect(calculateResicoStatusV2(85_600_000, emptyMarketplaceRevenue(), emptyMarketplaceRevenue(), 300).percentUsed).toBe(24.5);
  });
});

describe('dayOfYearFromKey', () => {
  it('cuenta desde el 1 de enero y conoce los bisiestos', () => {
    expect(dayOfYearFromKey('2026-01-01')).toEqual({ year: 2026, dayOfYear: 1, daysInYear: 365 });
    expect(dayOfYearFromKey('2026-12-31')).toEqual({ year: 2026, dayOfYear: 365, daysInYear: 365 });
    expect(dayOfYearFromKey('2028-12-31')).toEqual({ year: 2028, dayOfYear: 366, daysInYear: 366 });
  });
});
