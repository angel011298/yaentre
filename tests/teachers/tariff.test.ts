import { describe, expect, it } from 'vitest';
import {
  advanceCategoryFor,
  BASE_RATES,
  BASE_RATES_REGULARIZACION,
  calculateTariff,
  DEFAULT_DEMAND_CATEGORY,
  publicPriceRange,
  TARIFF_CAP_MULTIPLIER,
  validateTariffInput,
  type TariffParams,
} from '@/lib/teachers/tariff';
import { splitMarketplaceRevenue } from '@/lib/marketplace/commission';
import { subjectsForTrack, isCatalogSubject } from '@/lib/teachers/subject-catalog';

const base: TariffParams = {
  track: 'ADMISION',
  subjectKey: 'matematicas',
  teacherLevel: 'INICIAL',
  durationMinutes: 50,
  advanceCategory: 'EARLY',
  scheduleCategory: 'DAYTIME',
  demandCategory: 'NORMAL',
};

describe('tabulador — pista ADMISION (spec del marketplace §5)', () => {
  it('base sin multiplicadores = tarifa de la materia', () => {
    expect(calculateTariff(base)).toMatchObject({ baseCents: 30_000, finalCents: 30_000, capped: false });
  });

  it('aplica N × D × A × H × Q', () => {
    const r = calculateTariff({ ...base, teacherLevel: 'VERIFICADO', scheduleCategory: 'EVENING' });
    expect(r.finalCents).toBe(Math.round(30_000 * 1.15 * 1.08));
  });

  it('TOPE DURO de 1.5×: Destacado + 80 min + último minuto + fin de semana nunca pasa de 1.5× la base', () => {
    const r = calculateTariff({
      ...base,
      teacherLevel: 'DESTACADO',
      durationMinutes: 80,
      advanceCategory: 'LAST_MINUTE',
      scheduleCategory: 'WEEKEND',
      demandCategory: 'HIGH',
    });
    expect(r.capped).toBe(true);
    expect(r.finalCents).toBe(Math.round(30_000 * TARIFF_CAP_MULTIPLIER));
  });

  it('la demanda queda en NORMAL mientras Ángel no defina cómo se mide', () => {
    expect(DEFAULT_DEMAND_CATEGORY).toBe('NORMAL');
  });
});

describe('tabulador — pista REGULARIZACION (spec §2.10)', () => {
  it('usa SU tabla B con los MISMOS multiplicadores y el MISMO tope', () => {
    const reg = { ...base, track: 'REGULARIZACION' as const, subjectKey: 'reg_matematicas' };
    expect(calculateTariff(reg).finalCents).toBe(26_000);
    expect(calculateTariff({ ...reg, teacherLevel: 'VERIFICADO', scheduleCategory: 'EVENING' }).finalCents).toBe(
      Math.round(26_000 * 1.15 * 1.08)
    );
    const max = calculateTariff({ ...reg, teacherLevel: 'DESTACADO', durationMinutes: 80, advanceCategory: 'LAST_MINUTE', scheduleCategory: 'WEEKEND', demandCategory: 'HIGH' });
    expect(max.finalCents).toBe(Math.round(26_000 * 1.5));
  });

  it('una materia de una pista no existe en la otra', () => {
    expect(() => calculateTariff({ ...base, track: 'REGULARIZACION', subjectKey: 'matematicas' })).toThrow();
    expect(() => calculateTariff({ ...base, track: 'ADMISION', subjectKey: 'reg_calculo' })).toThrow();
  });

  it('el catálogo de la interfaz sale de las mismas tablas (no hay lista aparte)', () => {
    expect(subjectsForTrack('ADMISION').map((s) => s.key).sort()).toEqual(Object.keys(BASE_RATES).sort());
    expect(subjectsForTrack('REGULARIZACION').map((s) => s.key).sort()).toEqual(Object.keys(BASE_RATES_REGULARIZACION).sort());
    expect(isCatalogSubject('REGULARIZACION', 'reg_algebra')).toBe(true);
    expect(isCatalogSubject('ADMISION', 'reg_algebra')).toBe(false);
  });

  it('rangos públicos: base → 1.5× (sin fórmula ni factores)', () => {
    expect(publicPriceRange('REGULARIZACION', 'reg_espanol')).toEqual({ minCents: 22_000, maxCents: 33_000 });
  });
});

describe('GUARDRAIL — el precio es de la clase, nunca del comprador', () => {
  it.each(['userId', 'userPlan', 'userHistory', 'userDevice', 'userLocation', 'userSpend', 'userAge', 'userGender', 'buyerName', 'studentId'])(
    'validateTariffInput lanza con «%s»',
    (key) => {
      expect(() => validateTariffInput({ ...base, [key]: 'x' })).toThrow(/GUARDRAIL VIOLATION/);
    }
  );

  it('también con cualquier clave del alumno que no esté en la lista literal', () => {
    for (const key of ['userProfileId', 'studentProfileId', 'customerSegment', 'buyerEmail', 'alumnoEdad']) {
      expect(() => validateTariffInput({ ...base, [key]: 1 }), key).toThrow(/GUARDRAIL/);
    }
  });

  it('calculateTariff llama al guardrail: un parámetro del comprador colado revienta', () => {
    expect(() => calculateTariff({ ...base, userPlan: 'PREMIUM' } as unknown as TariffParams)).toThrow(/GUARDRAIL/);
  });

  it('control: los parámetros legítimos no lanzan', () => {
    expect(() => validateTariffInput({ ...base })).not.toThrow();
  });
});

describe('anticipación (A)', () => {
  const at = new Date('2026-11-02T15:00:00Z');
  it('≥ 48 h, 24–48 h, < 24 h', () => {
    expect(advanceCategoryFor(at, new Date(at.getTime() - 48 * 3_600_000))).toBe('EARLY');
    expect(advanceCategoryFor(at, new Date(at.getTime() - 47 * 3_600_000))).toBe('STANDARD');
    expect(advanceCategoryFor(at, new Date(at.getTime() - 24 * 3_600_000))).toBe('STANDARD');
    expect(advanceCategoryFor(at, new Date(at.getTime() - 23 * 3_600_000))).toBe('LAST_MINUTE');
  });
});

describe('comisión única del 25 % (clases y cursos) en centavos enteros', () => {
  it.each([30_000, 34_500, 45_001, 1, 0, 999_999, 33_333])('total %i: profesor + YaEntre = total exacto', (total) => {
    const { teacherCents, yaentreCents } = splitMarketplaceRevenue(total);
    expect(teacherCents + yaentreCents).toBe(total);
    expect(Number.isInteger(teacherCents) && Number.isInteger(yaentreCents)).toBe(true);
  });

  it('redondeo documentado: la parte del profesor al centavo más cercano (medio hacia arriba)', () => {
    expect(splitMarketplaceRevenue(30_000)).toEqual({ teacherCents: 22_500, yaentreCents: 7_500 });
    expect(splitMarketplaceRevenue(33_333)).toEqual({ teacherCents: 25_000, yaentreCents: 8_333 }); // 24 999.75 → 25 000
    expect(splitMarketplaceRevenue(2)).toEqual({ teacherCents: 2, yaentreCents: 0 }); // 1.5 → 2
  });

  it('rechaza montos no enteros o negativos', () => {
    expect(() => splitMarketplaceRevenue(10.5)).toThrow();
    expect(() => splitMarketplaceRevenue(-1)).toThrow();
  });
});
