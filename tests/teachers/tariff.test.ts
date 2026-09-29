import { describe, expect, it } from 'vitest';
import {
  ACTIVE_DEMAND_CATEGORIES,
  BASE_RATES,
  FORBIDDEN_TARIFF_KEYS,
  MULTIPLIERS_HUNDREDTHS,
  SUBJECT_KEYS,
  TariffGuardrailError,
  calculateTariff,
  formatMxnFromCents,
  priceCeilingCents,
  priceFloorCents,
  publicPriceRange,
  quoteTariff,
  splitTariff,
  teacherFromPriceCents,
  validateTariffInput,
  type AdvanceCategory,
  type DemandCategory,
  type DurationMinutes,
  type ScheduleCategory,
  type TariffParams,
  type TeacherLevelKey,
} from '@/lib/teachers/tariff';

const BASE: TariffParams = {
  subjectKey: 'matematicas',
  teacherLevel: 'INICIAL',
  durationMinutes: 50,
  advanceCategory: 'EARLY',
  scheduleCategory: 'DAYTIME',
  demandCategory: 'NORMAL',
};

const LEVELS: TeacherLevelKey[] = ['INICIAL', 'VERIFICADO', 'DESTACADO'];
const DURATIONS: DurationMinutes[] = [50, 80];
const ADVANCES: AdvanceCategory[] = ['EARLY', 'STANDARD', 'LAST_MINUTE'];
const SCHEDULES: ScheduleCategory[] = ['DAYTIME', 'EVENING', 'WEEKEND'];
const DEMANDS: DemandCategory[] = ['LOW', 'NORMAL', 'HIGH'];

describe('catálogo de tarifas base', () => {
  it('todas las bases están en el rango $260–$340 del contexto maestro §4.3', () => {
    for (const key of SUBJECT_KEYS) {
      expect(BASE_RATES[key]).toBeGreaterThanOrEqual(26000);
      expect(BASE_RATES[key]).toBeLessThanOrEqual(34000);
    }
  });
});

describe('calculateTariff — valores exactos', () => {
  it('la tarifa base pura (Inicial, 50 min, ≥48 h, diurno, demanda normal) es la base', () => {
    expect(calculateTariff(BASE)).toMatchObject({ baseCents: 30000, finalCents: 30000, capped: false });
  });

  it('cada nivel multiplica la base: Verificado ×1.15, Destacado ×1.30', () => {
    expect(calculateTariff({ ...BASE, teacherLevel: 'VERIFICADO' }).finalCents).toBe(34500);
    expect(calculateTariff({ ...BASE, teacherLevel: 'DESTACADO' }).finalCents).toBe(39000);
  });

  it('combina todos los factores con aritmética entera exacta (sin error de punto flotante)', () => {
    // Química $280 × 1.15 × 1.05 × 1.08 = 28000 × 1.3041 = 36514.8 → 36515
    expect(
      calculateTariff({
        subjectKey: 'quimica',
        teacherLevel: 'VERIFICADO',
        durationMinutes: 50,
        advanceCategory: 'STANDARD',
        scheduleCategory: 'EVENING',
        demandCategory: 'NORMAL',
      }).finalCents
    ).toBe(36515);
  });

  it('una clase de 80 min sin otros factores llega EXACTAMENTE al tope (no se marca como recortada)', () => {
    const r = calculateTariff({ ...BASE, durationMinutes: 80 });
    expect(r.finalCents).toBe(45000);
    expect(r.capped).toBe(false);
  });

  it('cuando los factores rebasan 1.5× se recorta al tope y se marca', () => {
    const r = calculateTariff({ ...BASE, durationMinutes: 80, teacherLevel: 'DESTACADO', advanceCategory: 'LAST_MINUTE' });
    expect(r.finalCents).toBe(45000);
    expect(r.capped).toBe(true);
  });

  it('el desglose devuelve los multiplicadores como decimales para sellarlos en la fila', () => {
    const r = calculateTariff({ ...BASE, teacherLevel: 'VERIFICADO', scheduleCategory: 'EVENING' });
    expect(r.multipliers).toEqual({ level: 1.15, duration: 1, advance: 1, schedule: 1.08, demand: 1 });
  });

  it('es determinista: la misma entrada da siempre el mismo precio', () => {
    const first = calculateTariff(BASE).finalCents;
    for (let i = 0; i < 200; i++) expect(calculateTariff({ ...BASE }).finalCents).toBe(first);
  });
});

describe('tope duro de 1.5× — enumeración EXHAUSTIVA', () => {
  it('ninguna combinación de materia × nivel × duración × anticipación × horario × demanda lo rebasa', () => {
    let combos = 0;
    for (const subjectKey of SUBJECT_KEYS)
      for (const teacherLevel of LEVELS)
        for (const durationMinutes of DURATIONS)
          for (const advanceCategory of ADVANCES)
            for (const scheduleCategory of SCHEDULES)
              for (const demandCategory of DEMANDS) {
                const { finalCents, baseCents } = calculateTariff({
                  subjectKey,
                  teacherLevel,
                  durationMinutes,
                  advanceCategory,
                  scheduleCategory,
                  demandCategory,
                });
                expect(finalCents).toBeLessThanOrEqual(Math.round(baseCents * 1.5));
                // Piso: el factor más bajo posible es 0.95 (demanda baja).
                expect(finalCents).toBeGreaterThanOrEqual(Math.round(baseCents * 0.95));
                combos++;
              }
    expect(combos).toBe(SUBJECT_KEYS.length * 3 * 2 * 3 * 3 * 3);
  });

  it('el tope es alcanzable: el techo de cada materia es exactamente 1.5× su base', () => {
    for (const key of SUBJECT_KEYS) expect(priceCeilingCents(key)).toBe(Math.round(BASE_RATES[key] * 1.5));
  });
});

describe('anti-discriminación (spec §5.3) — el tabulador NUNCA usa datos del comprador', () => {
  it.each(FORBIDDEN_TARIFF_KEYS.map((k) => [k]))('rechaza «%s» aunque TypeScript no lo vea', (key) => {
    const smuggled = { ...BASE, [key]: 'cualquier-valor' } as unknown as TariffParams;
    expect(() => calculateTariff(smuggled)).toThrow(TariffGuardrailError);
    expect(() => validateTariffInput(smuggled as unknown as Record<string, unknown>)).toThrow(/26-II LFPDPPP/);
  });

  // Lista LITERAL e independiente de `FORBIDDEN_TARIFF_KEYS`. El `it.each` de
  // arriba itera sobre esa misma constante, así que quitar una clave de la lista
  // quitaba también su propia prueba y el verde no se movía (lo demostró una
  // mutación). Esta lista está escrita a mano: la spec §5.3 más los nombres con
  // los que ESTE repo nombra a una persona.
  const MUST_BE_FORBIDDEN = [
    // spec §5.3
    'userId', 'userPlan', 'userHistory', 'userDevice', 'userLocation',
    'userSpend', 'userAge', 'userGender', 'buyerName', 'studentId',
    // nombres del repo
    'userProfileId', 'studentProfileId', 'studentUserId', 'parentProfileId', 'authUserId',
    // contexto del comprador
    'email', 'plan', 'ip', 'device', 'location',
  ];

  it.each(MUST_BE_FORBIDDEN.map((k) => [k]))('«%s» está en la lista de prohibidos', (key) => {
    expect((FORBIDDEN_TARIFF_KEYS as readonly string[]).map((k) => k.toLowerCase())).toContain(
      key.toLowerCase()
    );
    expect(() => validateTariffInput({ ...BASE, [key]: 'x' } as Record<string, unknown>)).toThrow(
      TariffGuardrailError
    );
  });

  it('no se salta cambiando mayúsculas', () => {
    expect(() => validateTariffInput({ StudentProfileId: 'x' })).toThrow(TariffGuardrailError);
    expect(() => validateTariffInput({ USERPLAN: 'PREMIUM' })).toThrow(TariffGuardrailError);
  });

  it('la entrada legítima pasa', () => {
    expect(() => validateTariffInput({ ...BASE })).not.toThrow();
  });

  it('dos alumnos distintos que piden la misma clase pagan exactamente lo mismo', () => {
    // El precio no tiene entrada alguna que dependa de quien compra: la misma
    // llamada, hecha «por» cualquiera, es la misma llamada.
    const paraAlumnoA = quoteTariff({ ...BASE, teacherLevel: 'VERIFICADO' });
    const paraAlumnoB = quoteTariff({ ...BASE, teacherLevel: 'VERIFICADO' });
    expect(paraAlumnoA).toEqual(paraAlumnoB);
  });

  it('una materia o categoría desconocida lanza en vez de inventar un precio', () => {
    expect(() => calculateTariff({ ...BASE, subjectKey: 'astrologia' as never })).toThrow(/Materia desconocida/);
    expect(() => calculateTariff({ ...BASE, advanceCategory: 'MAÑANA' as never })).toThrow(/inválida/);
    expect(() => calculateTariff({ ...BASE, durationMinutes: 60 as never })).toThrow(/inválida/);
  });
});

describe('presentación al alumno (spec §5.0) — solo el precio final', () => {
  it('quoteTariff devuelve ÚNICAMENTE el precio: ni multiplicadores, ni base, ni tope', () => {
    const quote = quoteTariff({ ...BASE, teacherLevel: 'DESTACADO', durationMinutes: 80 });
    expect(Object.keys(quote)).toEqual(['priceCents']);
    expect(JSON.stringify(quote)).not.toMatch(/multiplier|base|cap|level|demand/i);
  });
});

describe('splitTariff — comisión 25% / profesor 75%', () => {
  it('reparte 25/75 en montos redondos', () => {
    expect(splitTariff(30000)).toEqual({ commissionCents: 7500, teacherPayCents: 22500 });
    expect(splitTariff(45000)).toEqual({ commissionCents: 11250, teacherPayCents: 33750 });
  });

  it('redondea la comisión a la mitad hacia arriba y el profesor recibe el remanente', () => {
    expect(splitTariff(24700)).toEqual({ commissionCents: 6175, teacherPayCents: 18525 });
    expect(splitTariff(2)).toEqual({ commissionCents: 1, teacherPayCents: 1 }); // 0.5 → 1
    expect(splitTariff(1)).toEqual({ commissionCents: 0, teacherPayCents: 1 }); // 0.25 → 0
  });

  it('propiedad: ni un centavo se pierde ni se inventa, para todo monto de 0 a 20 000', () => {
    for (let amount = 0; amount <= 20_000; amount++) {
      const { commissionCents, teacherPayCents } = splitTariff(amount);
      expect(commissionCents + teacherPayCents).toBe(amount);
      expect(teacherPayCents).toBeGreaterThanOrEqual(0);
    }
  });

  it('rechaza montos que no son enteros de centavos no negativos', () => {
    expect(() => splitTariff(10.5)).toThrow();
    expect(() => splitTariff(-1)).toThrow();
    expect(() => splitTariff(Number.NaN)).toThrow();
  });
});

describe('rangos y «Desde $X» — publicidad veraz', () => {
  it('hoy la demanda activa es solo NORMAL, así que el piso de una materia es su base', () => {
    expect(ACTIVE_DEMAND_CATEGORIES).toEqual(['NORMAL']);
    expect(priceFloorCents('matematicas')).toBe(30000);
    expect(priceFloorCents('espanol')).toBe(26000);
  });

  it('el piso NUNCA es menor a un precio que de verdad se pueda cobrar', () => {
    // Recorre toda combinación con demanda ACTIVA: el mínimo real es el piso.
    for (const subjectKey of SUBJECT_KEYS) {
      let cheapest = Infinity;
      for (const durationMinutes of DURATIONS)
        for (const advanceCategory of ADVANCES)
          for (const scheduleCategory of SCHEDULES)
            for (const demandCategory of ACTIVE_DEMAND_CATEGORIES)
              cheapest = Math.min(
                cheapest,
                calculateTariff({ subjectKey, teacherLevel: 'INICIAL', durationMinutes, advanceCategory, scheduleCategory, demandCategory }).finalCents
              );
      expect(priceFloorCents(subjectKey, 'INICIAL')).toBe(cheapest);
    }
  });

  it('el piso sube con el nivel del profesor', () => {
    expect(priceFloorCents('matematicas', 'VERIFICADO')).toBe(34500);
    expect(priceFloorCents('matematicas', 'DESTACADO')).toBe(39000);
  });

  it('publicPriceRange da el rango base–tope sin fórmula', () => {
    expect(publicPriceRange('matematicas')).toEqual({ minCents: 30000, maxCents: 45000 });
    expect(Object.keys(publicPriceRange('fisica')).sort()).toEqual(['maxCents', 'minCents']);
  });

  it('«Desde» de un profesor es el piso más bajo de sus materias, a su nivel', () => {
    expect(teacherFromPriceCents(['matematicas', 'espanol'], 'INICIAL')).toBe(26000);
    expect(teacherFromPriceCents(['matematicas', 'espanol'], 'VERIFICADO')).toBe(29900);
    expect(teacherFromPriceCents([], 'INICIAL')).toBeNull();
  });

  it('los multiplicadores en centésimas son los de la spec', () => {
    expect(MULTIPLIERS_HUNDREDTHS.level).toEqual({ INICIAL: 100, VERIFICADO: 115, DESTACADO: 130 });
    expect(MULTIPLIERS_HUNDREDTHS.duration).toEqual({ 50: 100, 80: 150 });
    expect(MULTIPLIERS_HUNDREDTHS.advance).toEqual({ EARLY: 100, STANDARD: 105, LAST_MINUTE: 112 });
    expect(MULTIPLIERS_HUNDREDTHS.schedule).toEqual({ DAYTIME: 100, EVENING: 108, WEEKEND: 112 });
    expect(MULTIPLIERS_HUNDREDTHS.demand).toEqual({ LOW: 95, NORMAL: 100, HIGH: 110 });
  });

  it('formatea pesos sin decimales si son redondos y con ellos si no', () => {
    expect(formatMxnFromCents(30000)).toMatch(/300$/);
    expect(formatMxnFromCents(24750)).toMatch(/247\.50$/);
  });
});
