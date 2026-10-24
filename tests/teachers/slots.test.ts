import { describe, expect, it } from 'vitest';
import { blockedUntil, hasConflict, occupiesSlot, type ExistingBooking } from '@/lib/teachers/conflict-prevention';
import {
  calculateAvailableSlots,
  dayOfWeekOf,
  findSlot,
  getScheduleCategory,
  mexicoLocalToInstant,
} from '@/lib/teachers/slot-calculator';

/**
 * G103 — motor de horarios (spec §1.4) con la CORRECCIÓN de zona horaria: todo
 * en `America/Mexico_City`, `startsAt` en UTC. Las fechas de las pruebas son
 * instantes UTC; los comentarios dicen la hora de la Ciudad de México.
 */

// Lunes 26-oct-2026, 08:00 CDMX = 14:00Z. México no tiene horario de verano desde 2022.
const NOW = new Date('2026-10-26T14:00:00Z');
const MONDAY_9_11 = [{ dayOfWeek: 1, startTime: '09:00', endTime: '11:00' }];

function slots(over: Partial<Parameters<typeof calculateAvailableSlots>[0]> = {}) {
  return calculateAvailableSlots({
    availability: MONDAY_9_11,
    blockedDates: [],
    existingBookings: [],
    durationMinutes: 50,
    now: NOW,
    ...over,
  });
}

describe('zona horaria: el bloque del profesor es hora de la Ciudad de México', () => {
  it('un bloque de 9:00 se ofrece a las 15:00 UTC (no a las 9:00 UTC del servidor)', () => {
    const nextMonday = slots().filter((s) => s.date === '2026-11-02');
    expect(nextMonday.map((s) => s.startTime)).toEqual(['09:00', '09:30', '10:00']);
    expect(nextMonday[0].startsAt).toBe('2026-11-02T15:00:00.000Z');
  });

  it('la forma de la spec (`new Date(fecha+hora)` sin zona) daba otra hora en un servidor UTC', () => {
    // Vercel corre en UTC: así interpretaría «9:00» la spec.
    const naive = new Date('2026-11-02T09:00:00Z');
    expect(mexicoLocalToInstant('2026-11-02', '09:00').getTime()).not.toBe(naive.getTime());
    expect(mexicoLocalToInstant('2026-11-02', '09:00').getTime() - naive.getTime()).toBe(6 * 3_600_000);
  });

  it('horario de verano histórico: 9:00 CST (UTC−6) antes del 3-abr-2022 y 9:00 CDT (UTC−5) después', () => {
    expect(mexicoLocalToInstant('2022-04-01', '09:00').toISOString()).toBe('2022-04-01T15:00:00.000Z');
    expect(mexicoLocalToInstant('2022-04-04', '09:00').toISOString()).toBe('2022-04-04T14:00:00.000Z');
    // Fin del horario de verano y de la reforma: 30-oct-2022.
    expect(mexicoLocalToInstant('2022-10-28', '09:00').toISOString()).toBe('2022-10-28T14:00:00.000Z');
    expect(mexicoLocalToInstant('2022-10-31', '09:00').toISOString()).toBe('2022-10-31T15:00:00.000Z');
  });

  it('el día de la semana sale de la FECHA local, no del reloj del servidor', () => {
    expect(dayOfWeekOf('2026-11-02')).toBe(1); // lunes
    expect(dayOfWeekOf('2026-11-01')).toBe(0); // domingo
  });

  it('a las 23:00 CDMX del domingo (05:00Z del lunes) «hoy» sigue siendo domingo', () => {
    const lateSunday = new Date('2026-11-02T05:00:00Z'); // dom 1-nov 23:00 CDMX
    const s = slots({ now: lateSunday });
    // El lunes 2-nov 9:00 está a 10 h: sí se ofrece (≥ 4 h).
    expect(s[0].startsAt).toBe('2026-11-02T15:00:00.000Z');
  });

  it('en un año con horario de verano, el bloque sigue la hora local de ese día', () => {
    const springNow = new Date('2022-04-02T00:00:00Z');
    const s = calculateAvailableSlots({
      availability: [{ dayOfWeek: 1, startTime: '09:00', endTime: '10:00' }],
      blockedDates: [],
      existingBookings: [],
      durationMinutes: 50,
      now: springNow,
      daysAhead: 4,
    });
    expect(s.map((x) => x.startsAt)).toEqual(['2022-04-04T14:00:00.000Z']);
  });
});

describe('reglas de anticipación y alcance (spec §7.2)', () => {
  it('menos de 4 h de anticipación → no se ofrece', () => {
    // Lunes 26-oct 08:00 CDMX: el bloque de hoy 9:00-11:00 está a < 4 h.
    expect(slots().some((s) => s.date === '2026-10-26')).toBe(false);
    // A las 4:59 CDMX (10:59Z) sí: 9:00 está a 4 h 01 min.
    const early = slots({ now: new Date('2026-10-26T10:59:00Z') });
    expect(early.filter((s) => s.date === '2026-10-26').map((s) => s.startTime)).toEqual(['09:00', '09:30', '10:00']);
  });

  it('nunca más de 30 días hacia adelante', () => {
    const all = slots();
    const limit = NOW.getTime() + 30 * 86_400_000;
    expect(all.every((s) => Date.parse(s.startsAt) <= limit)).toBe(true);
    expect(all.length).toBe(4 * 3); // los lunes 2, 9, 16 y 23 de noviembre
  });

  it('fechas bloqueadas no ofrecen nada', () => {
    expect(slots({ blockedDates: ['2026-11-09'] }).some((s) => s.date === '2026-11-09')).toBe(false);
  });

  it('el slot de 80 min no se sale del bloque', () => {
    const s80 = slots({ durationMinutes: 80 }).filter((s) => s.date === '2026-11-02');
    expect(s80.map((s) => `${s.startTime}-${s.endTime}`)).toEqual(['09:00-10:20', '09:30-10:50']);
  });

  it('bloques inactivos no cuentan', () => {
    expect(calculateAvailableSlots({
      availability: [{ dayOfWeek: 1, startTime: '09:00', endTime: '11:00', isActive: false }],
      blockedDates: [],
      existingBookings: [],
      durationMinutes: 50,
      now: NOW,
    })).toEqual([]);
  });
});

describe('choques con clases reservadas — margen de 10 min (spec §1.7)', () => {
  const booking = (iso: string, status: ExistingBooking['status'] = 'BOOKED', hold?: string): ExistingBooking => ({
    scheduledAt: new Date(iso),
    durationMinutes: 50,
    status,
    holdExpiresAt: hold ? new Date(hold) : null,
  });

  it('una clase 9:00–9:50 (+10 min) bloquea 9:00 y 9:30; 10:00 queda libre', () => {
    const s = slots({ existingBookings: [booking('2026-11-02T15:00:00Z')] }).filter((x) => x.date === '2026-11-02');
    expect(s.map((x) => x.startTime)).toEqual(['10:00']);
  });

  it('el margen protege también ANTES: una clase a las 10:00 bloquea la de 9:30 (9:30–10:20 + 10), no la de 9:00 (termina 9:50 + 10 = 10:00)', () => {
    const s = slots({ existingBookings: [booking('2026-11-02T16:00:00Z')] }).filter((x) => x.date === '2026-11-02');
    expect(s.map((x) => x.startTime)).toEqual(['09:00']);
  });

  it('cancelada no ocupa; apartado vigente sí; apartado vencido no', () => {
    expect(occupiesSlot(booking('2026-11-02T15:00:00Z', 'CANCELLED'), NOW)).toBe(false);
    expect(occupiesSlot(booking('2026-11-02T15:00:00Z', 'PENDING_PAYMENT', '2026-10-26T14:30:00Z'), NOW)).toBe(true);
    expect(occupiesSlot(booking('2026-11-02T15:00:00Z', 'PENDING_PAYMENT', '2026-10-26T13:59:00Z'), NOW)).toBe(false);
  });

  it('hasConflict: rangos semiabiertos — empezar justo al terminar el margen de la anterior es válido', () => {
    const existing = [booking('2026-11-02T15:00:00Z')]; // ocupa hasta 16:00Z (9:50 + 10)
    expect(hasConflict({ scheduledAt: new Date('2026-11-02T16:00:00Z'), durationMinutes: 50, existingBookings: existing, now: NOW })).toBe(false);
    expect(hasConflict({ scheduledAt: new Date('2026-11-02T15:59:00Z'), durationMinutes: 50, existingBookings: existing, now: NOW })).toBe(true);
    expect(blockedUntil(new Date('2026-11-02T15:00:00Z'), 80).toISOString()).toBe('2026-11-02T16:30:00.000Z');
  });

  it('findSlot solo acepta un instante EXACTO de los ofrecidos', () => {
    const s = slots();
    expect(findSlot(s, new Date('2026-11-02T15:00:00Z'))).not.toBeNull();
    expect(findSlot(s, new Date('2026-11-02T15:10:00Z'))).toBeNull();
    expect(findSlot(s, new Date('2026-10-26T15:00:00Z'))).toBeNull(); // < 4 h
  });
});

describe('categoría de horario para el tabulador (H)', () => {
  it('fin de semana, diurno 8–18 L-V, nocturno el resto', () => {
    expect(getScheduleCategory(6, 10)).toBe('WEEKEND');
    expect(getScheduleCategory(0, 20)).toBe('WEEKEND');
    expect(getScheduleCategory(1, 8)).toBe('DAYTIME');
    expect(getScheduleCategory(5, 17)).toBe('DAYTIME');
    expect(getScheduleCategory(3, 18)).toBe('EVENING');
    expect(getScheduleCategory(2, 21)).toBe('EVENING');
    // Las 7:00 entre semana: la spec no las define y su código dice nocturno.
    expect(getScheduleCategory(2, 7)).toBe('EVENING');
  });

  it('los horarios llevan su categoría y su anticipación', () => {
    const weekendNow = new Date('2026-10-26T14:00:00Z');
    const s = calculateAvailableSlots({
      availability: [{ dayOfWeek: 6, startTime: '18:00', endTime: '20:00' }],
      blockedDates: [],
      existingBookings: [],
      durationMinutes: 50,
      now: weekendNow,
    });
    expect(s[0].scheduleCategory).toBe('WEEKEND');
    expect(s[0].advanceCategory).toBe('EARLY'); // sábado 31-oct, > 48 h
  });
});
