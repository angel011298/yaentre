import { describe, expect, it } from 'vitest';
import {
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
