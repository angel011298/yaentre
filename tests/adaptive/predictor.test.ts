import { describe, expect, it } from 'vitest';
import {
  effectiveSubjectHitRate,
  MIN_SUBJECT_ATTEMPTS,
  PESSIMISTIC_DEFAULT_HIT_RATE,
  predictScore,
  subjectHasSufficientData,
  type SubjectPerformance,
} from '@/lib/adaptive/predictor';

/**
 * Predictor de aciertos (Aciertómetro). El caso de referencia es un contrato
 * fijo del negocio: DEBE dar exactamente 74 (Task 3).
 */

describe('predictScore — caso de referencia obligatorio', () => {
  it('0.70 en materia peso 26 y 0.50 en materia peso 16, examen de 120 ⇒ EXACTAMENTE 74', () => {
    const subjects: SubjectPerformance[] = [
      { subjectId: 'mat', weight: 26, correct: 7, attempts: 10 }, // 0.70
      { subjectId: 'fis', weight: 16, correct: 5, attempts: 10 }, // 0.50
    ];
    const result = predictScore({ subjects, totalQuestions: 120 });

    expect(result.predictedScore).toBe(74);
    expect(result.confidence).toBe(1);
    expect(result.subjectsWithData).toBe(2);
    expect(result.totalSubjects).toBe(2);
  });

  it('usa floor, no round (74.857 ⇒ 74, nunca 75)', () => {
    const subjects: SubjectPerformance[] = [
      { subjectId: 'mat', weight: 26, correct: 7, attempts: 10 },
      { subjectId: 'fis', weight: 16, correct: 5, attempts: 10 },
    ];
    const { weightedHitRate } = predictScore({ subjects, totalQuestions: 120 });
    expect(weightedHitRate * 120).toBeCloseTo(74.857, 3);
    expect(predictScore({ subjects, totalQuestions: 120 }).predictedScore).toBe(74);
  });
});

describe('predictScore — materias sin datos suficientes', () => {
  it('una materia con < 5 intentos usa el default pesimista 0.30 y no cuenta en confianza', () => {
    const subjects: SubjectPerformance[] = [
      { subjectId: 'mat', weight: 26, correct: 7, attempts: 10 }, // datos
      { subjectId: 'fis', weight: 16, correct: 2, attempts: 2 }, // sin datos ⇒ 0.30
    ];
    const result = predictScore({ subjects, totalQuestions: 120 });

    // 0.70*26 + 0.30*16 = 23.0 ; /42 = 0.54762 ; *120 = 65.71 ; floor 65
    expect(result.predictedScore).toBe(65);
    expect(result.confidence).toBe(0.5);
    expect(result.subjectsWithData).toBe(1);
  });

  it('muestra pequeña con acierto alto NO infla: 2/2 (100%) cuenta como 0.30', () => {
    const perf: SubjectPerformance = { subjectId: 'x', weight: 10, correct: 2, attempts: 2 };
    expect(effectiveSubjectHitRate(perf)).toBe(PESSIMISTIC_DEFAULT_HIT_RATE);
  });

  it('todas las materias sin datos ⇒ predicción al piso (0.30) y confianza 0', () => {
    const subjects: SubjectPerformance[] = [
      { subjectId: 'a', weight: 26, correct: 0, attempts: 0 },
      { subjectId: 'b', weight: 16, correct: 0, attempts: 0 },
    ];
    const result = predictScore({ subjects, totalQuestions: 120 });
    expect(result.predictedScore).toBe(36); // floor(0.30 * 120)
    expect(result.confidence).toBe(0);
  });
});

describe('predictScore — bordes', () => {
  it('sin materias ⇒ 0 aciertos, confianza 0 (no divide por cero)', () => {
    expect(predictScore({ subjects: [], totalQuestions: 120 })).toMatchObject({
      predictedScore: 0,
      confidence: 0,
      weightedHitRate: 0,
    });
  });

  it('peso total 0 ⇒ predicción 0 sin NaN', () => {
    const result = predictScore({
      subjects: [{ subjectId: 'a', weight: 0, correct: 8, attempts: 10 }],
      totalQuestions: 120,
    });
    expect(result.predictedScore).toBe(0);
    expect(Number.isNaN(result.weightedHitRate)).toBe(false);
  });
});

describe('subjectHasSufficientData / effectiveSubjectHitRate', () => {
  it(`el umbral de datos suficientes es ${MIN_SUBJECT_ATTEMPTS} intentos`, () => {
    expect(subjectHasSufficientData(MIN_SUBJECT_ATTEMPTS - 1)).toBe(false);
    expect(subjectHasSufficientData(MIN_SUBJECT_ATTEMPTS)).toBe(true);
  });

  it('con datos suficientes usa la tasa observada', () => {
    expect(effectiveSubjectHitRate({ subjectId: 'x', weight: 10, correct: 8, attempts: 10 })).toBe(
      0.8
    );
  });
});
