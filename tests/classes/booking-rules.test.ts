import { describe, expect, it } from 'vitest';
import {
  bookingRuleError,
  evaluateBookingRequest,
  type BookingRuleError,
  type BookingRuleInput,
} from '@/lib/classes/booking-rules';
import { calculateTariff } from '@/lib/teachers/tariff';

// Lunes 2026-10-05: 15:00Z = 09:00 México.
const NOW = new Date('2026-09-28T12:00:00Z');
const H = (h: number, m = 0) => h * 60 + m;

const base: BookingRuleInput = {
  subjectKey: 'matematicas',
  durationMinutes: 50,
  scheduledAt: new Date('2026-10-05T15:00:00Z'), // lunes 09:00, 7 días adelante
  now: NOW,
  offeredSubjects: ['matematicas', 'fisica'],
  availability: [{ weekday: 1, startMinute: H(8), endMinute: H(20) }],
  teacherLevel: 'INICIAL',
  planExpiresAt: null,
};

const error = (over: Partial<BookingRuleInput>): BookingRuleError | null => {
  const r = evaluateBookingRequest({ ...base, ...over });
  return r.ok ? null : r.error;
};

describe('una reserva válida', () => {
  it('devuelve las categorías con las que se tarifica', () => {
    const r = evaluateBookingRequest(base);
    expect(r).toMatchObject({
      ok: true,
      tariffParams: {
        subjectKey: 'matematicas',
        teacherLevel: 'INICIAL',
        durationMinutes: 50,
        advanceCategory: 'EARLY',
        scheduleCategory: 'DAYTIME',
        demandCategory: 'NORMAL',
      },
    });
  });

  it('las categorías alimentan al tabulador y dan el precio esperado', () => {
    const r = evaluateBookingRequest(base);
    if (!r.ok) throw new Error('inalcanzable');
    expect(calculateTariff(r.tariffParams).finalCents).toBe(30000);
  });

  it('una clase de noche entre semana es EVENING y de fin de semana es WEEKEND', () => {
    const evening = evaluateBookingRequest({
      ...base,
      scheduledAt: new Date('2026-10-06T00:30:00Z'), // lunes 18:30
      availability: [{ weekday: 1, startMinute: H(8), endMinute: H(22) }],
    });
    expect(evening.ok && evening.tariffParams.scheduleCategory).toBe('EVENING');

    const weekend = evaluateBookingRequest({
      ...base,
      scheduledAt: new Date('2026-10-10T16:00:00Z'), // sábado 10:00
      availability: [{ weekday: 6, startMinute: H(8), endMinute: H(14) }],
    });
    expect(weekend.ok && weekend.tariffParams.scheduleCategory).toBe('WEEKEND');
  });

  it('el nivel del profesor entra a la tarifa', () => {
    const r = evaluateBookingRequest({ ...base, teacherLevel: 'DESTACADO' });
    if (!r.ok) throw new Error('inalcanzable');
    expect(calculateTariff(r.tariffParams).finalCents).toBe(39000);
  });
});

describe('rechazos, uno por uno', () => {
  it('duración que no es 50 ni 80', () => {
    expect(error({ durationMinutes: 60 })).toBe('INVALID_DURATION');
    expect(error({ durationMinutes: 0 })).toBe('INVALID_DURATION');
  });

  it('materia que el profesor no imparte, o que no existe', () => {
    expect(error({ subjectKey: 'quimica' })).toBe('SUBJECT_NOT_OFFERED');
    expect(error({ subjectKey: 'astrologia', offeredSubjects: ['astrologia'] })).toBe('SUBJECT_NOT_OFFERED');
  });

  it('inicio fuera de la rejilla de 30 minutos', () => {
    expect(error({ scheduledAt: new Date('2026-10-05T15:15:00Z') })).toBe('OFF_GRID');
  });

  it('fuera de la ventana 8:00–22:00, o que termina después de las 22:00', () => {
    expect(error({ scheduledAt: new Date('2026-10-05T13:30:00Z') })).toBe('OUTSIDE_WINDOW'); // 07:30
    expect(
      error({
        scheduledAt: new Date('2026-10-06T03:30:00Z'), // 21:30 + 50 min
        availability: [{ weekday: 1, startMinute: H(8), endMinute: H(22) }],
      })
    ).toBe('OUTSIDE_WINDOW');
  });

  it('con menos de 2 horas de anticipación, o en el pasado', () => {
    expect(error({ now: new Date('2026-10-05T13:30:00Z') })).toBe('TOO_SOON'); // 1.5 h antes
    expect(error({ now: new Date('2026-10-06T00:00:00Z') })).toBe('TOO_SOON'); // ya pasó
  });

  it('fuera de la disponibilidad del profesor (otro día, o no cabe en el bloque)', () => {
    expect(error({ availability: [{ weekday: 2, startMinute: H(8), endMinute: H(20) }] })).toBe('OUT_OF_AVAILABILITY');
    expect(error({ availability: [{ weekday: 1, startMinute: H(9), endMinute: H(9, 30) }] })).toBe('OUT_OF_AVAILABILITY');
    expect(error({ availability: [] })).toBe('OUT_OF_AVAILABILITY');
  });

  it('posterior a la vigencia del plan Premium del alumno', () => {
    expect(error({ planExpiresAt: new Date('2026-10-05T15:00:00Z') })).toBe('AFTER_PLAN_EXPIRY'); // borde exacto
    expect(error({ planExpiresAt: new Date('2026-10-01T00:00:00Z') })).toBe('AFTER_PLAN_EXPIRY');
    expect(error({ planExpiresAt: new Date('2026-10-05T15:00:01Z') })).toBeNull();
    expect(error({ planExpiresAt: null })).toBeNull();
  });
});

describe('el ORDEN de las comprobaciones (el mensaje más útil primero)', () => {
  it('un error de captura gana a uno de disponibilidad', () => {
    expect(error({ durationMinutes: 60, availability: [] })).toBe('INVALID_DURATION');
    expect(error({ scheduledAt: new Date('2026-10-05T15:15:00Z'), availability: [] })).toBe('OFF_GRID');
  });

  it('la materia se valida antes que el horario', () => {
    expect(error({ subjectKey: 'quimica', scheduledAt: new Date('2026-10-05T15:15:00Z') })).toBe('SUBJECT_NOT_OFFERED');
  });
});

describe('los mensajes de cara al alumno', () => {
  const all: BookingRuleError[] = [
    'INVALID_DURATION', 'SUBJECT_NOT_OFFERED', 'OFF_GRID', 'OUTSIDE_WINDOW',
    'TOO_SOON', 'OUT_OF_AVAILABILITY', 'AFTER_PLAN_EXPIRY',
  ];

  it('cada rechazo tiene un mensaje en español y un código de dominio', () => {
    for (const e of all) {
      const err = bookingRuleError(e);
      expect(err.message.length).toBeGreaterThan(10);
      expect(err.code).toMatch(/^[A-Z_]+$/);
    }
  });

  it('respetan el lenguaje obligatorio', () => {
    for (const e of all) {
      expect(bookingRuleError(e).message).not.toMatch(/garant[ií]a|próximamente|nuestros profesores|equipo docente/i);
    }
  });
});
