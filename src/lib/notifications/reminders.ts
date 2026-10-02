import { MEXICO_UTC_OFFSET_HOURS } from '@/lib/paywall/mexico-time';

/**
 * G100 — cuándo toca un recordatorio con horario. Módulo PURO (sin Prisma ni
 * cliente de correo, por la misma razón que `./schedule.ts`), probado en
 * `tests/notifications/reminders.test.ts`.
 *
 * Hora local = UTC-6 fijo (Ciudad de México, sin horario de verano desde la
 * reforma de 2022) — la misma convención que la racha y el límite diario.
 */
export interface MexicoClock {
  /** 0-23 */
  hour: number;
  /** 0 = domingo … 6 = sábado */
  weekday: number;
  /** "YYYY-MM-DD" del día en la Ciudad de México. */
  dayKey: string;
}

export function mexicoClock(now: Date): MexicoClock {
  const local = new Date(now.getTime() - MEXICO_UTC_OFFSET_HOURS * 3600 * 1000);
  const y = local.getUTCFullYear();
  const m = String(local.getUTCMonth() + 1).padStart(2, '0');
  const d = String(local.getUTCDate()).padStart(2, '0');
  return { hour: local.getUTCHours(), weekday: local.getUTCDay(), dayKey: `${y}-${m}-${d}` };
}

/**
 * Margen de recuperación, en horas. El disparador corre cada hora y una
 * corrida puede perderse (reinicio, despliegue, red); con margen 2 un
 * recordatorio de las 18:00 todavía sale a las 19:00 o 20:00. El candado de
 * `notification_deliveries` (uno por usuario, tipo y día) impide que el margen
 * se convierta en tres correos.
 */
export const REMINDER_CATCH_UP_HOURS = 2;

/** Sábado: el día del aviso de simulacro. */
export const SIMULATION_REMINDER_WEEKDAY = 6;

export type ReminderType = 'STUDY_REMINDER' | 'SIMULATION_REMINDER';

export function isWithinReminderWindow(reminderHour: number, clockHour: number): boolean {
  return clockHour >= reminderHour && clockHour <= reminderHour + REMINDER_CATCH_UP_HOURS;
}

export function isReminderDue(
  type: ReminderType,
  prefs: { reminderHour: number; reminderDays: readonly number[] },
  clock: MexicoClock
): boolean {
  if (!isWithinReminderWindow(prefs.reminderHour, clock.hour)) return false;
  if (type === 'SIMULATION_REMINDER') return clock.weekday === SIMULATION_REMINDER_WEEKDAY;
  return prefs.reminderDays.includes(clock.weekday);
}

/** Horas posibles de recordatorio que caen en la ventana de esta corrida. */
export function reminderHoursInWindow(clockHour: number): number[] {
  const hours: number[] = [];
  for (let h = clockHour - REMINDER_CATCH_UP_HOURS; h <= clockHour; h++) {
    if (h >= 0) hours.push(h);
  }
  return hours;
}

/**
 * ¿Se ve caído el disparador horario? Lo consulta el cron DIARIO (que sí
 * programa Vercel): si el latido tiene más de `maxAgeHours`, los
 * recordatorios llevan horas sin salir y el alumno no lo sabría nunca — el
 * mismo silencio de G73b. `null` = nunca corrió.
 */
export const REMINDER_HEARTBEAT_MAX_AGE_HOURS = 3;

export function isHeartbeatStale(lastRunAt: Date | null, now: Date): boolean {
  if (!lastRunAt) return true;
  return now.getTime() - lastRunAt.getTime() > REMINDER_HEARTBEAT_MAX_AGE_HOURS * 3600 * 1000;
}
