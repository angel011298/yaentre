import { describe, expect, it } from 'vitest';
import {
  MIN_BOOKING_LEAD_MINUTES,
  classEndsAt,
  classifyAdvance,
  classifySchedule,
  intervalsOverlap,
  isOnSlotGrid,
  isWithinBookableWindow,
  toMexicoLocal,
} from '@/lib/teachers/schedule';

// 2026-10-05 es LUNES. México = UTC−6 fijo, así que 14:00Z = 08:00 local.
const at = (isoUtc: string) => new Date(isoUtc);

describe('toMexicoLocal', () => {
  it('convierte UTC a hora de México (UTC−6) con día de la semana', () => {
    expect(toMexicoLocal(at('2026-10-05T14:00:00Z'))).toEqual({
      year: 2026, month: 9, day: 5, weekday: 1, minuteOfDay: 8 * 60,
    });
  });

  it('respeta el cambio de día: 03:00Z del martes es lunes 21:00 en México', () => {
    const l = toMexicoLocal(at('2026-10-06T03:00:00Z'));
    expect(l.weekday).toBe(1);
    expect(l.minuteOfDay).toBe(21 * 60);
  });
});

describe('classifySchedule', () => {
  it('lunes 8:00–18:00 es DAYTIME', () => {
    expect(classifySchedule(at('2026-10-05T14:00:00Z'), 50)).toBe('DAYTIME'); // 08:00
    expect(classifySchedule(at('2026-10-05T22:30:00Z'), 50)).toBe('DAYTIME'); // 16:30
  });

  it('lunes 18:00–22:00 es EVENING; a las 18:00 en punto ya es EVENING', () => {
    expect(classifySchedule(at('2026-10-06T00:00:00Z'), 50)).toBe('EVENING'); // 18:00
    expect(classifySchedule(at('2026-10-06T02:00:00Z'), 50)).toBe('EVENING'); // 20:00
  });

  it('la categoría se decide por la hora de INICIO: una de 80 min que empieza 17:30 es DAYTIME', () => {
    expect(classifySchedule(at('2026-10-05T23:30:00Z'), 80)).toBe('DAYTIME'); // 17:30 → termina 18:50
  });

  it('sábado y domingo son WEEKEND', () => {
    expect(classifySchedule(at('2026-10-10T16:00:00Z'), 50)).toBe('WEEKEND'); // sáb 10:00
    expect(classifySchedule(at('2026-10-11T16:00:00Z'), 80)).toBe('WEEKEND'); // dom 10:00
  });

  it('fuera de la ventana 8:00–22:00 devuelve null (no se inventa un precio)', () => {
    expect(classifySchedule(at('2026-10-05T13:30:00Z'), 50)).toBeNull(); // 07:30
    expect(classifySchedule(at('2026-10-06T03:30:00Z'), 50)).toBeNull(); // 21:30 → 22:20
    expect(classifySchedule(at('2026-10-06T05:00:00Z'), 50)).toBeNull(); // 23:00
    expect(classifySchedule(at('2026-10-10T12:00:00Z'), 50)).toBeNull(); // sáb 06:00
  });

  it('una clase que termina EXACTAMENTE a las 22:00 sí cabe', () => {
    expect(isWithinBookableWindow(at('2026-10-06T03:10:00Z'), 50)).toBe(true); // 21:10 → 22:00
    expect(isWithinBookableWindow(at('2026-10-06T03:11:00Z'), 50)).toBe(false);
  });
});

describe('classifyAdvance', () => {
  const now = at('2026-10-01T12:00:00Z');
  const hoursAfter = (h: number) => new Date(now.getTime() + h * 3_600_000);

  it('≥48 h es EARLY (48 h exactas incluidas)', () => {
    expect(classifyAdvance(hoursAfter(48), now)).toBe('EARLY');
    expect(classifyAdvance(hoursAfter(200), now)).toBe('EARLY');
  });

  it('24–48 h es STANDARD (24 h exactas incluidas)', () => {
    expect(classifyAdvance(hoursAfter(47.99), now)).toBe('STANDARD');
    expect(classifyAdvance(hoursAfter(24), now)).toBe('STANDARD');
  });

  it('<24 h es LAST_MINUTE', () => {
    expect(classifyAdvance(hoursAfter(23.99), now)).toBe('LAST_MINUTE');
    expect(classifyAdvance(hoursAfter(2), now)).toBe('LAST_MINUTE');
  });

  it('menos de la anticipación mínima, o en el pasado, es null', () => {
    expect(MIN_BOOKING_LEAD_MINUTES).toBe(120);
    expect(classifyAdvance(hoursAfter(1.99), now)).toBeNull();
    expect(classifyAdvance(hoursAfter(0), now)).toBeNull();
    expect(classifyAdvance(hoursAfter(-5), now)).toBeNull();
  });
});

describe('rejilla y traslapes', () => {
  it('el inicio debe caer en :00 o :30, sin segundos', () => {
    expect(isOnSlotGrid(at('2026-10-05T14:00:00Z'))).toBe(true);
    expect(isOnSlotGrid(at('2026-10-05T14:30:00Z'))).toBe(true);
    expect(isOnSlotGrid(at('2026-10-05T14:15:00Z'))).toBe(false);
    expect(isOnSlotGrid(at('2026-10-05T14:00:30Z'))).toBe(false);
  });

  it('classEndsAt suma la duración', () => {
    expect(classEndsAt(at('2026-10-05T14:00:00Z'), 80).toISOString()).toBe('2026-10-05T15:20:00.000Z');
  });

  it('dos intervalos que solo se tocan NO se traslapan; uno que invade el otro sí', () => {
    const a = at('2026-10-05T14:00:00Z'), b = at('2026-10-05T14:50:00Z');
    expect(intervalsOverlap(a, b, b, at('2026-10-05T15:40:00Z'))).toBe(false);
    expect(intervalsOverlap(a, b, at('2026-10-05T14:30:00Z'), at('2026-10-05T15:20:00Z'))).toBe(true);
    expect(intervalsOverlap(a, b, a, b)).toBe(true);
  });
});
