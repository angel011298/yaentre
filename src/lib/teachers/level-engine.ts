import type { TeacherLevel } from '@prisma/client';

/**
 * Niveles por MÉRITO automático (spec del marketplace §4). PURO.
 * Solo suben, nunca bajan; nunca se eligen ni se asignan a mano. Las tarifas
 * ya reservadas no cambian: el multiplicador se congela en `ClassSession`.
 */
interface LevelCriteria {
  minClasses: number;
  minRating: number;
  maxCancellationRate: number;
  minMonthsActive?: number;
}

export const LEVEL_CRITERIA: Record<TeacherLevel, LevelCriteria | null> = {
  INICIAL: null,
  VERIFICADO: { minClasses: 15, minRating: 4.2, maxCancellationRate: 10 },
  DESTACADO: { minClasses: 50, minRating: 4.5, maxCancellationRate: 5, minMonthsActive: 3 },
};

const ORDER: TeacherLevel[] = ['INICIAL', 'VERIFICADO', 'DESTACADO'];

export function evaluateTeacherLevel(teacher: {
  totalClassesGiven: number;
  averageRating: number;
  cancellationRate: number;
  monthsActive: number;
  level: TeacherLevel;
}): TeacherLevel | null {
  const currentIdx = ORDER.indexOf(teacher.level);
  for (let i = ORDER.length - 1; i > currentIdx; i--) {
    const c = LEVEL_CRITERIA[ORDER[i]];
    if (!c) continue;
    if (
      teacher.totalClassesGiven >= c.minClasses &&
      teacher.averageRating >= c.minRating &&
      teacher.cancellationRate <= c.maxCancellationRate &&
      (!c.minMonthsActive || teacher.monthsActive >= c.minMonthsActive)
    ) {
      return ORDER[i];
    }
  }
  return null;
}

export const LEVEL_LABELS: Record<TeacherLevel, string> = {
  INICIAL: 'Inicial',
  VERIFICADO: 'Verificado',
  DESTACADO: 'Destacado',
};
