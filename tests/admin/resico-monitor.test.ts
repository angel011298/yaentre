import { describe, expect, it } from 'vitest';
import {
  RESICO_CEILING_CENTS,
  calculateResicoStatus,
  fiscalYearOf,
  signalFor,
} from '@/lib/admin/resico-monitor';

const NO_CLASSES = { totalCents: 0, commissionCents: 0, carrils: { A: 0, B: 0 } };
const at = (cents: number, day = 200) => calculateResicoStatus(cents, NO_CLASSES, day);

describe('semáforo — fronteras EXACTAS', () => {
  it('el techo es $3,500,000 en centavos', () => {
    expect(RESICO_CEILING_CENTS).toBe(350_000_000);
  });

  it('59.9% es VERDE y 60.0% es AMARILLO (sin errores de coma flotante en la frontera)', () => {
    expect(at(209_999_999).signal).toBe('GREEN');
    expect(at(210_000_000).signal).toBe('YELLOW');
    expect(at(210_000_000).percentUsed).toBe(60);
  });

  it('79.9% es AMARILLO y 80.0% es ROJO', () => {
    expect(at(279_999_999).signal).toBe('YELLOW');
    expect(at(280_000_000).signal).toBe('RED');
  });

  it('el porcentaje se redondea HACIA ABAJO: nunca aparenta más holgura de la que hay', () => {
    // 59.99999…% muestra 59.9, no 60.0.
    expect(at(209_999_999).percentUsed).toBe(59.9);
  });

  it('rebasado el techo sigue en ROJO y el porcentaje pasa de 100', () => {
    const s = at(400_000_000);
    expect(s.signal).toBe('RED');
    expect(s.percentUsed).toBeGreaterThan(100);
  });

  it('cada señal trae SU recomendación', () => {
    expect(at(0).recommendation).toMatch(/Holgado/);
    expect(at(210_000_000).recommendation).toMatch(/migrar profesores de Carril B a Carril A/);
    expect(at(280_000_000).recommendation).toMatch(/URGENTE/);
  });

  it('signalFor enumera las tres zonas', () => {
    expect([0, 599, 600, 799, 800, 1000].map(signalFor)).toEqual(['GREEN', 'GREEN', 'YELLOW', 'YELLOW', 'RED', 'RED']);
  });
});

describe('peor caso de clases (todo como Carril B)', () => {
  it('suma el 100% de lo retenido de las clases, no solo la comisión', () => {
    const s = calculateResicoStatus(
      100_000_000,
      { totalCents: 40_000_000, commissionCents: 10_000_000, carrils: { A: 0, B: 10 } },
      200
    );
    expect(s.classIncomeCents).toBe(40_000_000);
    expect(s.yearToDateIncomeCents).toBe(140_000_000);
    expect(s.subscriptionIncomeCents).toBe(100_000_000);
  });

  it('el ingreso «mixto» cuenta solo la comisión del Carril A, sin gobernar el semáforo', () => {
    const s = calculateResicoStatus(
      0,
      {
        totalCents: 100_000_000,
        commissionCents: 25_000_000,
        carrils: { A: 4, B: 6 },
        carrilA: { totalCents: 60_000_000, commissionCents: 15_000_000 },
      },
      200
    );
    // B completo (40M) + comisión de A (15M) = 55M; el peor caso sigue siendo 100M.
    expect(s.classIncomeMixedCents).toBe(55_000_000);
    expect(s.classIncomeCents).toBe(100_000_000);
    expect(s.signal).toBe('GREEN'); // 100M / 3500M = 2.8 %
    expect(s.carrils).toEqual({ A: 4, B: 6 });
  });
});

describe('proyección al 31 de diciembre', () => {
  it('es lineal: lo acumulado × 365 / día del año', () => {
    expect(calculateResicoStatus(100_000_000, NO_CLASSES, 73).projectedAnnualCents).toBe(500_000_000);
  });

  it('no gobierna el semáforo (una venta en enero no la pone en rojo) pero SÍ se expone', () => {
    const s = calculateResicoStatus(5_000_000, NO_CLASSES, 5);
    expect(s.signal).toBe('GREEN');
    expect(s.projectedPercentUsed).toBeGreaterThan(100);
  });

  it('un año bisiesto usa 366 días', () => {
    expect(calculateResicoStatus(366_000, NO_CLASSES, 366, 366).projectedAnnualCents).toBe(366_000);
  });
});

describe('entradas inválidas (nunca un semáforo engañoso)', () => {
  it('rechaza centavos negativos, fraccionarios o NaN', () => {
    for (const bad of [-1, 1.5, Number.NaN]) {
      expect(() => calculateResicoStatus(bad, NO_CLASSES, 10)).toThrow();
      expect(() => calculateResicoStatus(0, { ...NO_CLASSES, totalCents: bad }, 10)).toThrow();
    }
  });

  it('rechaza un día del año fuera de rango (evita dividir entre cero)', () => {
    for (const d of [0, -3, 366, 1.5]) expect(() => calculateResicoStatus(0, NO_CLASSES, d)).toThrow();
  });
});

describe('año fiscal en hora de México', () => {
  it('el 1 de enero a las 05:59Z todavía es el año ANTERIOR en México; a las 06:00Z ya es el nuevo', () => {
    expect(fiscalYearOf(new Date('2027-01-01T05:59:59Z')).year).toBe(2026);
    const fy = fiscalYearOf(new Date('2027-01-01T06:00:00Z'));
    expect(fy.year).toBe(2027);
    expect(fy.dayOfYear).toBe(1);
    expect(fy.startUtc.toISOString()).toBe('2027-01-01T06:00:00.000Z');
    expect(fy.endUtc.toISOString()).toBe('2028-01-01T06:00:00.000Z');
  });

  it('el 31 de diciembre es el día 365 (366 en bisiesto)', () => {
    expect(fiscalYearOf(new Date('2026-12-31T20:00:00Z'))).toMatchObject({ dayOfYear: 365, daysInYear: 365 });
    expect(fiscalYearOf(new Date('2028-12-31T20:00:00Z'))).toMatchObject({ dayOfYear: 366, daysInYear: 366 });
  });

  it('los años múltiplos de 100 no son bisiestos salvo que lo sean de 400', () => {
    expect(fiscalYearOf(new Date('2100-06-01T12:00:00Z')).daysInYear).toBe(365);
    expect(fiscalYearOf(new Date('2400-06-01T12:00:00Z')).daysInYear).toBe(366);
  });
});
