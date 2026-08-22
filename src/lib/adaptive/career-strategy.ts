import type { ConfidenceLevel } from '@prisma/client';
import { formatEntrometroTarget, type EntrometroDisplay } from './entrometro';

/**
 * Motor adaptativo (F6) — recomendador de estrategia de carrera. Lógica PURA.
 *
 * Compara la predicción de aciertos del alumno contra la meta ESTIMADA de su
 * carrera elegida. Si la alcanza o supera, va bien encaminado. Si no, sugiere
 * hasta 3 carreras alternativas de la MISMA área que sí serían alcanzables con
 * su predicción actual, ordenadas de mayor a menor exigencia.
 *
 * Regla no negociable (docs/ACIERTOS_MINIMOS.md, CC-13): la meta de carrera
 * SIEMPRE se comunica calificada por su nivel de confianza, nunca como un
 * número absoluto. Por eso cada carrera se acompaña de su `EntrometroDisplay`
 * (vía formatEntrometroTarget), no de un entero pelón.
 */

export const MAX_ALTERNATIVES = 3;

export interface CareerTarget {
  careerId: string;
  name: string;
  minAciertos: number | null;
  minAciertosYear: number | null;
  minAciertosConfidence: ConfidenceLevel | null;
}

export interface StrategyInput {
  predictedScore: number;
  chosenCareer: CareerTarget;
  /** Todas las carreras de la MISMA área (puede incluir a la elegida; se filtra). */
  areaCareers: CareerTarget[];
}

export interface CareerSuggestion {
  careerId: string;
  name: string;
  /** Meta presentada SIEMPRE como estimación calificada por confianza. */
  target: EntrometroDisplay;
  /** Aciertos mínimos crudos (para ordenar), null si la carrera no tiene dato. */
  minAciertos: number | null;
}

export interface StrategyResult {
  /** ¿La carrera elegida tiene una meta con la cual comparar? */
  hasTarget: boolean;
  /** true si predictedScore ≥ meta de la carrera elegida. false si no o sin meta. */
  onTrack: boolean;
  /** meta - predicción (positivo = faltan aciertos). null si la carrera no tiene meta. */
  gap: number | null;
  /** Presentación de la meta de la carrera elegida (siempre calificada). */
  chosenTarget: EntrometroDisplay;
  /** Alternativas alcanzables (solo cuando NO va encaminado), desc por exigencia. */
  alternatives: CareerSuggestion[];
}

function toSuggestion(career: CareerTarget): CareerSuggestion {
  return {
    careerId: career.careerId,
    name: career.name,
    minAciertos: career.minAciertos,
    target: formatEntrometroTarget({
      minAciertos: career.minAciertos,
      minAciertosYear: career.minAciertosYear,
      minAciertosConfidence: career.minAciertosConfidence,
    }),
  };
}

/**
 * ¿Es alcanzable esta carrera con la predicción actual? Requiere que la carrera
 * tenga una meta conocida y que la predicción la alcance o supere.
 */
export function isCareerReachable(predictedScore: number, career: CareerTarget): boolean {
  return career.minAciertos != null && predictedScore >= career.minAciertos;
}

export function recommendCareerStrategy(input: StrategyInput): StrategyResult {
  const { predictedScore, chosenCareer, areaCareers } = input;

  const chosenTarget = formatEntrometroTarget({
    minAciertos: chosenCareer.minAciertos,
    minAciertosYear: chosenCareer.minAciertosYear,
    minAciertosConfidence: chosenCareer.minAciertosConfidence,
  });

  const hasTarget = chosenCareer.minAciertos != null;
  const gap = chosenCareer.minAciertos != null ? chosenCareer.minAciertos - predictedScore : null;
  const onTrack = hasTarget && predictedScore >= (chosenCareer.minAciertos as number);

  // Solo se sugieren alternativas cuando NO va encaminado (o cuando su carrera
  // no tiene meta con la cual medirse): son un plan B accionable, no ruido.
  let alternatives: CareerSuggestion[] = [];
  if (!onTrack) {
    alternatives = areaCareers
      .filter((c) => c.careerId !== chosenCareer.careerId)
      .filter((c) => isCareerReachable(predictedScore, c))
      // Mayor a menor exigencia: la alternativa más ambiciosa alcanzable primero.
      .sort((a, b) => (b.minAciertos as number) - (a.minAciertos as number))
      .slice(0, MAX_ALTERNATIVES)
      .map(toSuggestion);
  }

  return { hasTarget, onTrack, gap, chosenTarget, alternatives };
}
