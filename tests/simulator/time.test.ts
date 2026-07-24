import { describe, expect, it } from 'vitest';
import {
  computeRemainingSecs,
  formatClock,
  isTimeUp,
  timerTone,
} from '@/lib/simulator/time';

const start = new Date('2027-05-15T09:00:00.000Z');

describe('computeRemainingSecs', () => {
  it('resta el tiempo real transcurrido contra startedAt del servidor', () => {
    const now = new Date(start.getTime() + 60 * 1000); // 1 min después
    expect(computeRemainingSecs(start, 180 * 60, now)).toBe(180 * 60 - 60);
  });

  it('nunca es negativo (agotado)', () => {
    const now = new Date(start.getTime() + 200 * 60 * 1000);
    expect(computeRemainingSecs(start, 180 * 60, now)).toBe(0);
  });
});

describe('isTimeUp', () => {
  it('true cuando el restante llega a 0', () => {
    const now = new Date(start.getTime() + 180 * 60 * 1000);
    expect(isTimeUp(start, 180 * 60, now)).toBe(true);
  });
  it('false mientras queda tiempo', () => {
    const now = new Date(start.getTime() + 60 * 1000);
    expect(isTimeUp(start, 180 * 60, now)).toBe(false);
  });
});

describe('timerTone', () => {
  it('normal por encima de 30 min', () => {
    expect(timerTone(31 * 60)).toBe('normal');
  });
  it('advertencia en el umbral de 30 min y por debajo', () => {
    expect(timerTone(30 * 60)).toBe('warning');
    expect(timerTone(16 * 60)).toBe('warning');
  });
  it('urgente en el umbral de 15 min y por debajo', () => {
    expect(timerTone(15 * 60)).toBe('urgent');
    expect(timerTone(0)).toBe('urgent');
  });
});

describe('formatClock', () => {
  it('formatea HH:MM:SS (el examen dura 3 h)', () => {
    expect(formatClock(3 * 3600)).toBe('03:00:00');
    expect(formatClock(2 * 3600 + 47 * 60 + 33)).toBe('02:47:33');
    expect(formatClock(0)).toBe('00:00:00');
    expect(formatClock(-5)).toBe('00:00:00');
  });
});
