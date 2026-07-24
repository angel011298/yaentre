import { describe, expect, it } from 'vitest';
import { isSubjectMastered, SUBJECT_MASTERY_THRESHOLD } from '@/lib/gamification/mastery';

describe('isSubjectMastered', () => {
  it('el umbral es 85%', () => {
    expect(SUBJECT_MASTERY_THRESHOLD).toBe(0.85);
  });

  it('false sin temas (no hay nada que dominar)', () => {
    expect(isSubjectMastered([])).toBe(false);
  });

  it('true cuando TODOS los temas están al umbral o por encima, con muestra suficiente', () => {
    const topics = [
      { topicId: 't1', attempts: 5, hitRate: 0.85 },
      { topicId: 't2', attempts: 10, hitRate: 0.9 },
      { topicId: 't3', attempts: 3, hitRate: 1.0 },
    ];
    expect(isSubjectMastered(topics)).toBe(true);
  });

  it('false si UN SOLO tema está por debajo del umbral, aunque el promedio general lo supere', () => {
    // Promedio: (1.0 + 1.0 + 1.0 + 1.0 + 0.5) / 5 = 0.9 (>85%), pero un tema
    // individual está en 50% — la regla es TODOS los temas, no el promedio.
    const topics = [
      { topicId: 't1', attempts: 5, hitRate: 1.0 },
      { topicId: 't2', attempts: 5, hitRate: 1.0 },
      { topicId: 't3', attempts: 5, hitRate: 1.0 },
      { topicId: 't4', attempts: 5, hitRate: 1.0 },
      { topicId: 't5', attempts: 5, hitRate: 0.5 },
    ];
    expect(isSubjectMastered(topics)).toBe(false);
  });

  it('false si un tema nunca se intentó (0 attempts) — no cuenta "gratis"', () => {
    const topics = [
      { topicId: 't1', attempts: 5, hitRate: 1.0 },
      { topicId: 't2', attempts: 0, hitRate: 0 },
    ];
    expect(isSubjectMastered(topics)).toBe(false);
  });

  it('false si un tema tiene hitRate alto pero muestra insuficiente (< MIN_TOPIC_ATTEMPTS)', () => {
    const topics = [
      { topicId: 't1', attempts: 5, hitRate: 1.0 },
      { topicId: 't2', attempts: 2, hitRate: 1.0 }, // 2 < 3 intentos mínimos
    ];
    expect(isSubjectMastered(topics)).toBe(false);
  });

  it('el umbral es inclusivo (>=): exactamente 0.85 cuenta', () => {
    expect(isSubjectMastered([{ topicId: 't1', attempts: 4, hitRate: 0.85 }])).toBe(true);
  });

  it('justo debajo del umbral no cuenta', () => {
    expect(isSubjectMastered([{ topicId: 't1', attempts: 4, hitRate: 0.849 }])).toBe(false);
  });
});
