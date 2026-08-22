import { describe, expect, it } from 'vitest';
import {
  isCareerReachable,
  MAX_ALTERNATIVES,
  recommendCareerStrategy,
  type CareerTarget,
} from '@/lib/adaptive/career-strategy';

function career(
  careerId: string,
  minAciertos: number | null,
  confidence: CareerTarget['minAciertosConfidence'] = 'HIGH'
): CareerTarget {
  return { careerId, name: careerId, minAciertos, minAciertosYear: 2027, minAciertosConfidence: confidence };
}

describe('recommendCareerStrategy — encaminado', () => {
  it('predicción ≥ meta ⇒ va bien encaminado y no sugiere alternativas', () => {
    const chosen = career('elegida', 70);
    const result = recommendCareerStrategy({
      predictedScore: 80,
      chosenCareer: chosen,
      areaCareers: [chosen, career('otra', 60)],
    });
    expect(result.onTrack).toBe(true);
    expect(result.gap).toBe(-10); // meta - predicción
    expect(result.alternatives).toEqual([]);
  });

  it('predicción exactamente igual a la meta cuenta como encaminado', () => {
    const chosen = career('elegida', 70);
    const result = recommendCareerStrategy({
      predictedScore: 70,
      chosenCareer: chosen,
      areaCareers: [chosen],
    });
    expect(result.onTrack).toBe(true);
    expect(result.gap).toBe(0);
  });
});

describe('recommendCareerStrategy — alternativas', () => {
  it('si no alcanza, sugiere hasta 3 alcanzables de la misma área, desc por exigencia', () => {
    const chosen = career('medicina', 100);
    const alts = [
      career('enfermeria', 60),
      career('nutricion', 72),
      career('biologia', 68),
      career('psicologia', 55),
      career('quimica', 90), // no alcanzable con 75
    ];
    const result = recommendCareerStrategy({
      predictedScore: 75,
      chosenCareer: chosen,
      areaCareers: [chosen, ...alts],
    });

    expect(result.onTrack).toBe(false);
    expect(result.gap).toBe(25);
    // Alcanzables (≤75): nutricion 72, biologia 68, enfermeria 60, psicologia 55.
    // Ordenadas desc por exigencia y recortadas a 3: 72, 68, 60.
    expect(result.alternatives.map((a) => a.careerId)).toEqual([
      'nutricion',
      'biologia',
      'enfermeria',
    ]);
    expect(result.alternatives.length).toBeLessThanOrEqual(MAX_ALTERNATIVES);
  });

  it('nunca se sugiere a sí misma ni carreras fuera de alcance', () => {
    const chosen = career('medicina', 100);
    const result = recommendCareerStrategy({
      predictedScore: 75,
      chosenCareer: chosen,
      areaCareers: [chosen, career('quimica', 90), career('medicina', 100)],
    });
    expect(result.alternatives.map((a) => a.careerId)).not.toContain('medicina');
    expect(result.alternatives.map((a) => a.careerId)).not.toContain('quimica'); // 90 > 75
  });

  it('carreras sin meta (minAciertos null) no se sugieren', () => {
    const chosen = career('medicina', 100);
    const result = recommendCareerStrategy({
      predictedScore: 75,
      chosenCareer: chosen,
      areaCareers: [chosen, career('sinDato', null), career('biologia', 68)],
    });
    expect(result.alternatives.map((a) => a.careerId)).toEqual(['biologia']);
  });
});

describe('recommendCareerStrategy — la meta SIEMPRE se comunica con confianza', () => {
  it('la meta de la carrera elegida se presenta calificada, nunca como número pelón', () => {
    const chosen = career('medicina', 100, 'MED');
    const result = recommendCareerStrategy({
      predictedScore: 75,
      chosenCareer: chosen,
      areaCareers: [chosen, career('biologia', 68, 'LOW')],
    });
    // chosenTarget viene de formatEntrometroTarget: label con "~", qualifier no vacío.
    expect(result.chosenTarget.hasTarget).toBe(true);
    expect(result.chosenTarget.label).toMatch(/^~\d+ aciertos$/);
    expect(result.chosenTarget.qualifier.length).toBeGreaterThan(0);
    // Cada alternativa también trae su meta calificada.
    for (const alt of result.alternatives) {
      expect(alt.target.label).toMatch(/^~\d+ aciertos$/);
      expect(alt.target.qualifier.length).toBeGreaterThan(0);
    }
  });

  it('carrera elegida sin meta ⇒ hasTarget false, gap null, y aún ofrece alternativas', () => {
    const chosen = career('elegida', null);
    const result = recommendCareerStrategy({
      predictedScore: 75,
      chosenCareer: chosen,
      areaCareers: [chosen, career('biologia', 68)],
    });
    expect(result.hasTarget).toBe(false);
    expect(result.onTrack).toBe(false);
    expect(result.gap).toBeNull();
    expect(result.chosenTarget.hasTarget).toBe(false);
    expect(result.alternatives.map((a) => a.careerId)).toEqual(['biologia']);
  });
});

describe('isCareerReachable', () => {
  it('requiere meta conocida y predicción suficiente', () => {
    expect(isCareerReachable(75, career('x', 70))).toBe(true);
    expect(isCareerReachable(75, career('x', 80))).toBe(false);
    expect(isCareerReachable(75, career('x', null))).toBe(false);
  });
});
