import { describe, expect, it } from 'vitest';
import {
  isPerfectRound,
  PERFECT_ROUND_THRESHOLD,
  simulatorConfigFor,
  TIMER_URGENT_SECS,
  TIMER_WARNING_SECS,
} from '@/lib/simulator/config';

describe('simulatorConfigFor', () => {
  it('UNAM baraja las opciones (preguntas + opciones)', () => {
    expect(simulatorConfigFor('UNAM').shuffleOptions).toBe(true);
  });

  it('IPN NO baraja las opciones (solo preguntas)', () => {
    expect(simulatorConfigFor('IPN').shuffleOptions).toBe(false);
  });

  it('instituciones post-launch usan default conservador', () => {
    expect(simulatorConfigFor('UAM').shuffleOptions).toBe(false);
    expect(simulatorConfigFor('CENEVAL').shuffleOptions).toBe(false);
  });
});

describe('umbrales del temporizador', () => {
  it('advertencia a 30 min, urgente a 15 min', () => {
    expect(TIMER_WARNING_SECS).toBe(30 * 60);
    expect(TIMER_URGENT_SECS).toBe(15 * 60);
  });
});

describe('isPerfectRound', () => {
  it('el umbral es 90%', () => {
    expect(PERFECT_ROUND_THRESHOLD).toBe(0.9);
  });

  it('true en el umbral exacto (90/100)', () => {
    expect(isPerfectRound(90, 100)).toBe(true);
  });

  it('false justo debajo del umbral (89/100)', () => {
    expect(isPerfectRound(89, 100)).toBe(false);
  });

  it('true con 100%', () => {
    expect(isPerfectRound(120, 120)).toBe(true);
  });

  it('se mide contra los reactivos SERVIDOS, no el total oficial del examen', () => {
    // 18/20 servidos = 90%, aunque el examen oficial tenga 120.
    expect(isPerfectRound(18, 20)).toBe(true);
  });

  it('false con 0 reactivos servidos (evita división por cero)', () => {
    expect(isPerfectRound(0, 0)).toBe(false);
  });
});
