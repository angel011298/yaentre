import { describe, expect, it } from 'vitest';
import {
  isHeartbeatStale,
  isReminderDue,
  mexicoClock,
  reminderHoursInWindow,
} from '@/lib/notifications/reminders';
import { isNotificationEnabled } from '@/lib/notifications/preferences';

// Sábado 3 oct 2026, 18:30 CDMX = domingo 4 oct 00:30 UTC.
const SAT_1830 = new Date('2026-10-04T00:30:00Z');
// Viernes 2 oct 2026, 18:30 CDMX.
const FRI_1830 = new Date('2026-10-03T00:30:00Z');

describe('mexicoClock (G100)', () => {
  it('convierte a hora, día y fecha de la Ciudad de México (UTC-6)', () => {
    expect(mexicoClock(SAT_1830)).toEqual({ hour: 18, weekday: 6, dayKey: '2026-10-03' });
    expect(mexicoClock(new Date('2026-10-03T05:59:00Z'))).toMatchObject({ hour: 23, dayKey: '2026-10-02' });
  });
});

describe('isReminderDue', () => {
  const prefs = { reminderHour: 18, reminderDays: [1, 2, 3, 4, 5] };

  it('recordatorio diario: a su hora y en sus días', () => {
    expect(isReminderDue('STUDY_REMINDER', prefs, mexicoClock(FRI_1830))).toBe(true);
    expect(isReminderDue('STUDY_REMINDER', prefs, mexicoClock(SAT_1830))).toBe(false); // sábado no elegido
  });

  it('margen de recuperación de 2 horas, nunca antes de la hora', () => {
    const at = (h: number) => ({ ...mexicoClock(FRI_1830), hour: h });
    expect(isReminderDue('STUDY_REMINDER', prefs, at(17))).toBe(false);
    expect(isReminderDue('STUDY_REMINDER', prefs, at(20))).toBe(true);
    expect(isReminderDue('STUDY_REMINDER', prefs, at(21))).toBe(false);
  });

  it('simulacro: solo sábado, aunque el sábado no esté en sus días de estudio', () => {
    expect(isReminderDue('SIMULATION_REMINDER', prefs, mexicoClock(SAT_1830))).toBe(true);
    expect(isReminderDue('SIMULATION_REMINDER', prefs, mexicoClock(FRI_1830))).toBe(false);
  });

  it('sin días elegidos, el diario nunca sale', () => {
    expect(isReminderDue('STUDY_REMINDER', { reminderHour: 18, reminderDays: [] }, mexicoClock(FRI_1830))).toBe(false);
  });
});

describe('reminderHoursInWindow', () => {
  it('la hora actual y las dos anteriores', () => {
    expect(reminderHoursInWindow(18)).toEqual([16, 17, 18]);
    expect(reminderHoursInWindow(1)).toEqual([0, 1]);
  });
});

describe('isHeartbeatStale', () => {
  it('nunca corrió o hace más de 3 h ⇒ caído', () => {
    const now = new Date('2026-10-02T12:00:00Z');
    expect(isHeartbeatStale(null, now)).toBe(true);
    expect(isHeartbeatStale(new Date('2026-10-02T08:30:00Z'), now)).toBe(true);
    expect(isHeartbeatStale(new Date('2026-10-02T11:05:00Z'), now)).toBe(false);
  });
});

describe('opt-in de los recordatorios (G100)', () => {
  it('sin fila de preferencia, ninguno de los dos se envía', () => {
    expect(isNotificationEnabled(null, 'STUDY_REMINDER')).toBe(false);
    expect(isNotificationEnabled(null, 'SIMULATION_REMINDER')).toBe(false);
    expect(isNotificationEnabled({ enabled: true }, 'STUDY_REMINDER')).toBe(true);
  });
});
