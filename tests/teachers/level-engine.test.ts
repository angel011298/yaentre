import { describe, expect, it } from 'vitest';
import {
  LEVEL_CRITERIA,
  computeCancellationRate,
  evaluateTeacherLevel,
  levelProgress,
  wholeMonthsBetween,
  type TeacherMetrics,
} from '@/lib/teachers/level-engine';

const base: TeacherMetrics = {
  totalClassesGiven: 0,
  averageRating: 0,
  cancellationRate: 0,
  monthsActive: 0,
  level: 'INICIAL',
};
const m = (over: Partial<TeacherMetrics>): TeacherMetrics => ({ ...base, ...over });

describe('criterios de la spec §4.1', () => {
  it('los umbrales son los documentados', () => {
    expect(LEVEL_CRITERIA.INICIAL).toBeNull();
    expect(LEVEL_CRITERIA.VERIFICADO).toEqual({ minClasses: 15, minRating: 4.2, maxCancellationRate: 10 });
    expect(LEVEL_CRITERIA.DESTACADO).toEqual({
      minClasses: 50,
      minRating: 4.5,
      maxCancellationRate: 5,
      minMonthsActive: 3,
    });
  });
});

describe('evaluateTeacherLevel — promoción', () => {
  it('un profesor nuevo no se promueve', () => {
    expect(evaluateTeacherLevel(base)).toBeNull();
  });

  it('promueve a VERIFICADO justo en el borde de los tres criterios', () => {
    expect(
      evaluateTeacherLevel(m({ totalClassesGiven: 15, averageRating: 4.2, cancellationRate: 10 }))
    ).toBe('VERIFICADO');
  });

  it.each([
    ['una clase menos', { totalClassesGiven: 14, averageRating: 4.5, cancellationRate: 0 }],
    ['calificación 4.19', { totalClassesGiven: 30, averageRating: 4.19, cancellationRate: 0 }],
    ['cancelaciones 10.01%', { totalClassesGiven: 30, averageRating: 4.9, cancellationRate: 10.01 }],
  ])('NO promueve a VERIFICADO con %s', (_n, over) => {
    expect(evaluateTeacherLevel(m(over))).toBeNull();
  });

  it('promueve a DESTACADO solo con los cuatro criterios, meses incluidos', () => {
    const ok = { totalClassesGiven: 50, averageRating: 4.5, cancellationRate: 5, monthsActive: 3 };
    expect(evaluateTeacherLevel(m(ok))).toBe('DESTACADO');
    expect(evaluateTeacherLevel(m({ ...ok, monthsActive: 2 }))).toBe('VERIFICADO');
    expect(evaluateTeacherLevel(m({ ...ok, cancellationRate: 5.01 }))).toBe('VERIFICADO');
    expect(evaluateTeacherLevel(m({ ...ok, totalClassesGiven: 49 }))).toBe('VERIFICADO');
  });

  it('promueve al nivel MÁS ALTO alcanzable: puede saltar de Inicial a Destacado', () => {
    expect(
      evaluateTeacherLevel(
        m({ totalClassesGiven: 60, averageRating: 4.8, cancellationRate: 1, monthsActive: 6 })
      )
    ).toBe('DESTACADO');
  });

  it('desde VERIFICADO solo puede subir a DESTACADO', () => {
    expect(
      evaluateTeacherLevel(m({ level: 'VERIFICADO', totalClassesGiven: 20, averageRating: 4.6 }))
    ).toBeNull();
    expect(
      evaluateTeacherLevel(
        m({
          level: 'VERIFICADO',
          totalClassesGiven: 50,
          averageRating: 4.5,
          cancellationRate: 5,
          monthsActive: 3,
        })
      )
    ).toBe('DESTACADO');
  });
});

describe('los niveles NUNCA bajan (spec §4.3)', () => {
  it('un Destacado con métricas pésimas se queda Destacado: devuelve null, no un nivel inferior', () => {
    expect(
      evaluateTeacherLevel(
        m({ level: 'DESTACADO', totalClassesGiven: 200, averageRating: 2.1, cancellationRate: 60 })
      )
    ).toBeNull();
  });

  it('un Verificado con métricas pésimas tampoco baja', () => {
    expect(
      evaluateTeacherLevel(m({ level: 'VERIFICADO', averageRating: 1, cancellationRate: 90 }))
    ).toBeNull();
  });

  it('propiedad: el resultado, si existe, siempre es ESTRICTAMENTE mayor al nivel actual', () => {
    const order = ['INICIAL', 'VERIFICADO', 'DESTACADO'];
    for (const level of order as TeacherMetrics['level'][]) {
      for (const classes of [0, 15, 50, 500])
        for (const rating of [0, 4.2, 4.5, 5])
          for (const cancel of [0, 5, 10, 50])
            for (const months of [0, 3, 12]) {
              const r = evaluateTeacherLevel({
                totalClassesGiven: classes,
                averageRating: rating,
                cancellationRate: cancel,
                monthsActive: months,
                level,
              });
              if (r !== null) expect(order.indexOf(r)).toBeGreaterThan(order.indexOf(level));
            }
    }
  });
});

describe('computeCancellationRate', () => {
  it('solo cuentan cancelaciones y no-show DEL PROFESOR', () => {
    // 1 de 10 clases que estaba comprometido a dar → 10%
    expect(
      computeCancellationRate({ completed: 8, studentNoShow: 1, teacherCancelled: 1, teacherNoShow: 0 })
    ).toBe(10);
    expect(
      computeCancellationRate({ completed: 8, studentNoShow: 0, teacherCancelled: 1, teacherNoShow: 1 })
    ).toBe(20);
  });

  it('el no-show del ALUMNO cuenta a favor del profesor: sube el denominador, no el numerador', () => {
    expect(
      computeCancellationRate({ completed: 9, studentNoShow: 0, teacherCancelled: 1, teacherNoShow: 0 })
    ).toBe(10);
    expect(
      computeCancellationRate({ completed: 9, studentNoShow: 10, teacherCancelled: 1, teacherNoShow: 0 })
    ).toBe(5);
  });

  it('sin historial la tasa es 0 (no divide entre cero)', () => {
    expect(
      computeCancellationRate({ completed: 0, studentNoShow: 0, teacherCancelled: 0, teacherNoShow: 0 })
    ).toBe(0);
  });

  it('redondea a dos decimales', () => {
    expect(
      computeCancellationRate({ completed: 2, studentNoShow: 0, teacherCancelled: 1, teacherNoShow: 0 })
    ).toBe(33.33);
  });
});

describe('wholeMonthsBetween', () => {
  const d = (s: string) => new Date(s);

  it('cuenta meses de calendario completos', () => {
    expect(wholeMonthsBetween(d('2026-10-15T12:00:00Z'), d('2027-01-15T12:00:00Z'))).toBe(3);
    expect(wholeMonthsBetween(d('2026-10-15T12:00:00Z'), d('2027-01-15T11:59:59Z'))).toBe(2);
    expect(wholeMonthsBetween(d('2026-10-15T12:00:00Z'), d('2027-01-14T23:00:00Z'))).toBe(2);
  });

  it('un mes NO son 30 días: 31 de enero → 28 de febrero cumple un mes', () => {
    expect(wholeMonthsBetween(d('2026-01-31T00:00:00Z'), d('2026-02-27T00:00:00Z'))).toBe(0);
    expect(wholeMonthsBetween(d('2026-01-31T00:00:00Z'), d('2026-02-28T00:00:00Z'))).toBe(1);
  });

  it('fechas iguales o invertidas dan 0', () => {
    expect(wholeMonthsBetween(d('2026-10-15T00:00:00Z'), d('2026-10-15T00:00:00Z'))).toBe(0);
    expect(wholeMonthsBetween(d('2027-10-15T00:00:00Z'), d('2026-10-15T00:00:00Z'))).toBe(0);
  });
});

describe('levelProgress (tablero del profesor, spec §8)', () => {
  it('desde Inicial muestra el avance hacia Verificado, con el sentido de cada criterio', () => {
    const p = levelProgress(m({ totalClassesGiven: 12, averageRating: 4.6, cancellationRate: 2 }));
    expect(p.nextLevel).toBe('VERIFICADO');
    expect(p.criteria.map((c) => [c.key, c.met])).toEqual([
      ['classes', false],
      ['rating', true],
      ['cancellations', true],
    ]);
    expect(p.criteria.find((c) => c.key === 'cancellations')).toMatchObject({
      kind: 'max',
      required: 10,
      current: 2,
    });
  });

  it('hacia Destacado incluye el criterio de meses', () => {
    expect(levelProgress(m({ level: 'VERIFICADO' })).criteria.map((c) => c.key)).toEqual([
      'classes',
      'rating',
      'cancellations',
      'months',
    ]);
  });

  it('el nivel máximo no tiene siguiente', () => {
    expect(levelProgress(m({ level: 'DESTACADO' }))).toEqual({ nextLevel: null, criteria: [] });
  });
});
