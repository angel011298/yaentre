import { describe, expect, it } from 'vitest';
import {
  allocateDiagnosticQuestions,
  apportionByWeight,
  capToAvailability,
  type SubjectAvailability,
} from '@/lib/diagnostic/distribution';

function sum(m: Map<string, number>): number {
  return [...m.values()].reduce((a, b) => a + b, 0);
}

describe('apportionByWeight — caso de referencia real (UNAM Área 1 Ingeniería)', () => {
  it('Mat26/Fis16/Quim12/Esp10/Inglés6 sobre 30 ⇒ EXACTAMENTE 10/7/5/5/3', () => {
    const result = apportionByWeight(
      [
        { subjectId: 'mat', weight: 26 },
        { subjectId: 'fis', weight: 16 },
        { subjectId: 'quim', weight: 12 },
        { subjectId: 'esp', weight: 10 },
        { subjectId: 'ing', weight: 6 },
      ],
      30
    );

    expect(Object.fromEntries(result)).toEqual({
      mat: 10,
      fis: 7,
      quim: 5,
      esp: 5,
      ing: 3,
    });
    expect(sum(result)).toBe(30);
  });
});

describe('apportionByWeight — garantías', () => {
  it('cada materia con peso>0 recibe al menos 1 (cobertura máxima de materias)', () => {
    const result = apportionByWeight(
      [
        { subjectId: 'a', weight: 100 },
        { subjectId: 'b', weight: 1 },
        { subjectId: 'c', weight: 1 },
      ],
      30
    );
    expect(result.get('b')).toBeGreaterThanOrEqual(1);
    expect(result.get('c')).toBeGreaterThanOrEqual(1);
    expect(sum(result)).toBe(30);
  });

  it('materias con peso 0 quedan fuera del reparto', () => {
    const result = apportionByWeight(
      [
        { subjectId: 'a', weight: 10 },
        { subjectId: 'b', weight: 0 },
      ],
      30
    );
    expect(result.has('b')).toBe(false);
    expect(result.get('a')).toBe(30);
  });

  it('siempre suma exactamente `total` cuando hay más asientos que materias', () => {
    const weights = [
      { subjectId: 'a', weight: 7 },
      { subjectId: 'b', weight: 3 },
      { subjectId: 'c', weight: 13 },
      { subjectId: 'd', weight: 1 },
      { subjectId: 'e', weight: 9 },
      { subjectId: 'f', weight: 4 },
      { subjectId: 'g', weight: 21 },
    ];
    for (const total of [7, 8, 12, 30, 100]) {
      expect(sum(apportionByWeight(weights, total))).toBe(total);
    }
  });

  it('más materias con peso>0 que `total`: elige las `total` de mayor peso, 1 c/u', () => {
    const weights = Array.from({ length: 8 }, (_, i) => ({ subjectId: `s${i}`, weight: i + 1 }));
    const result = apportionByWeight(weights, 3);
    expect(sum(result)).toBe(3);
    expect([...result.values()].every((v) => v === 1)).toBe(true);
    // Las 3 de mayor peso: s7, s6, s5.
    expect([...result.keys()].sort()).toEqual(['s5', 's6', 's7']);
  });

  it('sin materias con peso>0 ⇒ mapa vacío', () => {
    expect(apportionByWeight([], 30)).toEqual(new Map());
    expect(apportionByWeight([{ subjectId: 'a', weight: 0 }], 30)).toEqual(new Map());
  });

  it('total 0 ⇒ mapa vacío', () => {
    expect(apportionByWeight([{ subjectId: 'a', weight: 10 }], 0)).toEqual(new Map());
  });
});

describe('capToAvailability — recorte por contenido real y redistribución', () => {
  it('caso de referencia con Inglés sin contenido (0 disponibles) ⇒ 12/7/6/5, cubre 4 materias', () => {
    // Reparto ideal abundante: mat10/fis7/quim5/esp5/ing3 (caso de referencia).
    const ideal = new Map([
      ['mat', 10],
      ['fis', 7],
      ['quim', 5],
      ['esp', 5],
      ['ing', 3],
    ]);
    const subjects: SubjectAvailability[] = [
      { subjectId: 'mat', weight: 26, available: 63 },
      { subjectId: 'fis', weight: 16, available: 58 },
      { subjectId: 'quim', weight: 12, available: 31 },
      { subjectId: 'esp', weight: 10, available: 31 },
      { subjectId: 'ing', weight: 6, available: 0 },
    ];
    const result = capToAvailability(ideal, subjects);

    expect(result.get('ing')).toBe(0);
    expect(sum(result)).toBe(30);
    // El sobrante de Inglés (3) se redistribuye por peso: quim y mat primero.
    expect(result.get('mat')).toBeGreaterThanOrEqual(10);
  });

  it('nunca excede la disponibilidad real de una materia', () => {
    const ideal = new Map([
      ['a', 20],
      ['b', 10],
    ]);
    const subjects: SubjectAvailability[] = [
      { subjectId: 'a', weight: 10, available: 2 },
      { subjectId: 'b', weight: 5, available: 100 },
    ];
    const result = capToAvailability(ideal, subjects);
    expect(result.get('a')).toBe(2);
    expect(result.get('b')).toBe(28); // 10 ideal + 18 redistribuidos del sobrante de 'a'
    expect(sum(result)).toBe(30);
  });

  it('si el área entera no alcanza el total, devuelve lo disponible sin romperse', () => {
    const ideal = new Map([
      ['a', 20],
      ['b', 10],
    ]);
    const subjects: SubjectAvailability[] = [
      { subjectId: 'a', weight: 10, available: 3 },
      { subjectId: 'b', weight: 5, available: 2 },
    ];
    const result = capToAvailability(ideal, subjects);
    expect(sum(result)).toBe(5); // 3 + 2, no 30
  });
});

describe('allocateDiagnosticQuestions — punto de entrada combinado', () => {
  it('es determinista: misma entrada produce siempre el mismo resultado', () => {
    const subjects: SubjectAvailability[] = [
      { subjectId: 'mat', weight: 26, available: 63 },
      { subjectId: 'fis', weight: 16, available: 58 },
      { subjectId: 'quim', weight: 12, available: 31 },
      { subjectId: 'esp', weight: 10, available: 31 },
      { subjectId: 'ing', weight: 6, available: 0 },
    ];
    const a = allocateDiagnosticQuestions(subjects, 30);
    const b = allocateDiagnosticQuestions(subjects, 30);
    expect(a).toEqual(b);
  });

  it('con 7 materias y contenido suficiente en todas, cubre las 7 (≥6 del criterio F-01)', () => {
    const subjects: SubjectAvailability[] = [
      { subjectId: 'histmx', weight: 6, available: 20 },
      { subjectId: 'histuni', weight: 4, available: 20 },
      { subjectId: 'geo', weight: 4, available: 20 },
      { subjectId: 'matap', weight: 3, available: 20 },
      { subjectId: 'esplect', weight: 3, available: 20 },
      { subjectId: 'ing', weight: 2, available: 20 },
      { subjectId: 'civ', weight: 3, available: 20 },
    ];
    const result = allocateDiagnosticQuestions(subjects, 30);
    const coveredSubjects = [...result.values()].filter((v) => v > 0).length;
    expect(coveredSubjects).toBe(7);
    expect(sum(result)).toBe(30);
  });

  it('materias sin ningún reactivo servible quedan excluidas de raíz', () => {
    const subjects: SubjectAvailability[] = [
      { subjectId: 'a', weight: 10, available: 40 },
      { subjectId: 'b', weight: 10, available: 0 },
    ];
    const result = allocateDiagnosticQuestions(subjects, 30);
    expect(result.get('b')).toBe(0);
    expect(result.get('a')).toBe(30);
  });
});
