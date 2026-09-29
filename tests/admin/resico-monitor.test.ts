import { describe, expect, it } from 'vitest';
import {
  RESICO_CEILING_CENTS,
  aggregateClassRevenue,
  calculateResicoStatus,
  fiscalYearOf,
  signalFor,
  type ClassRevenueRow,
  type ResicoClassRevenue,
} from '@/lib/admin/resico-monitor';

const NO_CLASSES: ResicoClassRevenue = {
  carrilA: { classes: 0, totalCents: 0, commissionCents: 0 },
  carrilB: { classes: 0, totalCents: 0, commissionCents: 0 },
};
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
    expect([0, 599, 600, 799, 800, 1000].map(signalFor)).toEqual([
      'GREEN', 'GREEN', 'YELLOW', 'YELLOW', 'RED', 'RED',
    ]);
  });
});

describe('desglose por carril — A = solo comisión, B = valor completo', () => {
  // Ejemplo de la spec §10: Carril A $12,500 de comisión + Carril B $344,000 = $356,500.
  const spec: ResicoClassRevenue = {
    carrilA: { classes: 40, totalCents: 5_000_000, commissionCents: 1_250_000 },
    carrilB: { classes: 1_100, totalCents: 34_400_000, commissionCents: 8_600_000 },
  };

  it('el Carril A aporta SOLO su comisión y el Carril B su valor completo', () => {
    const s = calculateResicoStatus(49_950_000, spec, 250);
    expect(s.carrilA.incomeCents).toBe(1_250_000);
    expect(s.carrilB.incomeCents).toBe(34_400_000);
    expect(s.classIncomeCents).toBe(35_650_000);
    expect(s.subscriptionIncomeCents).toBe(49_950_000);
    // $499,500 + $356,500 = $856,000, el acumulado de la pantalla de la spec.
    expect(s.yearToDateIncomeCents).toBe(85_600_000);
    expect(s.percentUsed).toBe(24.4);
  });

  it('el valor cobrado del Carril A NO entra al ingreso (es del profesor), pero se conserva para referencia', () => {
    const s = calculateResicoStatus(0, spec, 250);
    expect(s.carrilA.totalCents).toBe(5_000_000);
    expect(s.yearToDateIncomeCents).toBe(s.carrilA.commissionCents + s.carrilB.totalCents);
    expect(s.yearToDateIncomeCents).not.toBe(s.carrilA.totalCents + s.carrilB.totalCents);
  });

  it('el «techo teórico» del código original (todo Carril B) se conserva aparte y NO manda sobre el color', () => {
    // Todo como B serían 39.4M; con A a comisión son 35.65M. Con el techo de 3.5M en 350M no cambia el color aquí,
    // pero sí en la frontera: se construye un caso que cruza el 60% solo con el peor caso.
    const borderline: ResicoClassRevenue = {
      carrilA: { classes: 10, totalCents: 100_000_000, commissionCents: 25_000_000 },
      carrilB: { classes: 0, totalCents: 0, commissionCents: 0 },
    };
    const s = calculateResicoStatus(150_000_000, borderline, 200);
    expect(s.classIncomeAllCarrilBCents).toBe(100_000_000);
    expect(s.yearToDateIncomeCents).toBe(175_000_000); // 150M + 25M de comisión
    expect(s.signal).toBe('GREEN'); // 50%: con todo como B serían 250M = 71% (amarillo)
    expect(s.subscriptionIncomeCents + s.classIncomeAllCarrilBCents).toBe(250_000_000);
  });

  it('el ahorro de migrar B→A es el valor del Carril B menos su comisión', () => {
    const s = calculateResicoStatus(0, spec, 250);
    expect(s.migrationSavingsCents).toBe(34_400_000 - 8_600_000);
  });

  it('sin clases todo queda en cero y sin ahorro', () => {
    const s = at(0);
    expect(s.classIncomeCents).toBe(0);
    expect(s.migrationSavingsCents).toBe(0);
    expect(s.carrilA.classes + s.carrilB.classes).toBe(0);
  });
});

describe('aggregateClassRevenue — la regla de qué cuenta en cada carril', () => {
  const row = (over: Partial<ClassRevenueRow> = {}): ClassRevenueRow => ({
    retainedCents: 30_000,
    commissionCents: 7_500,
    rail: 'ASIMILADOS',
    ...over,
  });

  it('reparte cada clase a SU carril: COMISION_MERCANTIL = A, ASIMILADOS = B', () => {
    const r = aggregateClassRevenue([
      row({ rail: 'COMISION_MERCANTIL' }),
      row({ rail: 'ASIMILADOS' }),
      row({ rail: 'ASIMILADOS', retainedCents: 28_000, commissionCents: 7_000 }),
    ]);
    expect(r.carrilA).toEqual({ classes: 1, totalCents: 30_000, commissionCents: 7_500 });
    expect(r.carrilB).toEqual({ classes: 2, totalCents: 58_000, commissionCents: 14_500 });
  });

  it('una clase totalmente reembolsada no aporta ni cuenta como clase', () => {
    const r = aggregateClassRevenue([row({ retainedCents: 0, commissionCents: 0 }), row()]);
    expect(r.carrilB.classes).toBe(1);
    expect(r.carrilB.totalCents).toBe(30_000);
  });

  it('un reembolso PARCIAL cuenta lo retenido, con la comisión sellada sobre lo retenido', () => {
    // Cancelación tardía: 50% devuelto, la fila sella la comisión sobre lo retenido.
    const r = aggregateClassRevenue([row({ retainedCents: 15_000, commissionCents: 3_750 })]);
    expect(r.carrilB).toEqual({ classes: 1, totalCents: 15_000, commissionCents: 3_750 });
  });

  it('la comisión se acota a lo retenido: un dato malo no infla el ingreso', () => {
    const r = aggregateClassRevenue([row({ retainedCents: 1_000, commissionCents: 9_999, rail: 'COMISION_MERCANTIL' })]);
    expect(r.carrilA.commissionCents).toBe(1_000);
  });

  it('rechaza centavos negativos o fraccionarios', () => {
    for (const bad of [-1, 0.5, Number.NaN]) {
      expect(() => aggregateClassRevenue([row({ retainedCents: bad })])).toThrow();
      expect(() => aggregateClassRevenue([row({ commissionCents: bad })])).toThrow();
    }
  });

  it('sin clases devuelve ceros', () => {
    expect(aggregateClassRevenue([])).toEqual(NO_CLASSES);
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

describe('referencia sin IVA (el techo se mide sin IVA)', () => {
  it('divide entre 1.16, redondeando hacia abajo, y no cambia el color', () => {
    const s = at(210_000_000); // 60.0% con IVA → amarillo
    expect(s.yearToDateExcludingIvaCents).toBe(Math.floor((210_000_000 * 100) / 116));
    expect(s.percentUsedExcludingIva).toBeLessThan(s.percentUsed);
    expect(s.signal).toBe('YELLOW'); // el semáforo sigue el criterio conservador (con IVA)
  });
});

describe('entradas inválidas (nunca un semáforo engañoso)', () => {
  it('rechaza centavos negativos, fraccionarios o NaN', () => {
    for (const bad of [-1, 1.5, Number.NaN]) {
      expect(() => calculateResicoStatus(bad, NO_CLASSES, 10)).toThrow();
      expect(() =>
        calculateResicoStatus(0, { ...NO_CLASSES, carrilB: { classes: 1, totalCents: bad, commissionCents: 0 } }, 10)
      ).toThrow();
      expect(() =>
        calculateResicoStatus(0, { ...NO_CLASSES, carrilA: { classes: 1, totalCents: 1_000, commissionCents: bad } }, 10)
      ).toThrow();
    }
  });

  it('una comisión mayor que el valor de sus clases es un dato imposible', () => {
    expect(() =>
      calculateResicoStatus(0, { ...NO_CLASSES, carrilA: { classes: 1, totalCents: 100, commissionCents: 101 } }, 10)
    ).toThrow(/comisión/);
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
