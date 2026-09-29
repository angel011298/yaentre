import { MEXICO_UTC_OFFSET_HOURS } from '@/lib/paywall/mexico-time';
import type { AdvanceCategory, DurationMinutes, ScheduleCategory } from './tariff';

/**
 * CALENDARIO DE LAS CLASES — Bloque 2. Módulo PURO: el `now` siempre entra como
 * parámetro y la hora de México se calcula con el offset FIJO UTC−6 que ya usa
 * el resto del producto (`paywall/mexico-time.ts`: la reforma de 2022 eliminó el
 * horario de verano en la Zona Centro), sin `Intl` ni zonas del sistema —
 * Vercel corre en UTC y una zona del sistema haría el resultado depender de
 * dónde se ejecuta.
 *
 * ── Reglas que la spec deja tácitas y que este módulo FIJA ──────────────────
 *
 * La spec define las categorías de horario así: DAYTIME 8:00–18:00 L-V,
 * EVENING 18:00–22:00 L-V, WEEKEND sábado y domingo. No dice qué pasa con una
 * clase a las 23:00, ni con una de sábado a las 6:00, ni si el minuto de inicio
 * es libre. Estos números son SUPUESTOS declarados (ver RETORNO_BLOQUE2.md
 * «Parámetros que fijé») y viven aquí, en un solo lugar, para cambiarlos sin
 * buscar por el código:
 *
 *   · Ventana reservable: la clase debe EMPEZAR a las 8:00 o después y
 *     TERMINAR a las 22:00 o antes, todos los días.
 *   · Granularidad: el inicio cae en :00 o :30.
 *   · Anticipación mínima: 2 horas.
 *   · La categoría de horario se decide por la hora de INICIO.
 */

export const BOOKABLE_START_MINUTE = 8 * 60; //    08:00
export const BOOKABLE_END_MINUTE = 22 * 60; //     22:00
export const DAYTIME_END_MINUTE = 18 * 60; //      18:00
export const SLOT_GRANULARITY_MINUTES = 30;
export const MIN_BOOKING_LEAD_MINUTES = 120;

const HOUR_MS = 3_600_000;
const MINUTE_MS = 60_000;

export interface MexicoLocal {
  year: number;
  /** 0 = enero … 11 = diciembre (como `Date`). */
  month: number;
  day: number;
  /** 0 = domingo … 6 = sábado. */
  weekday: number;
  /** Minutos transcurridos desde la medianoche de México. */
  minuteOfDay: number;
}

/** Descompone un instante UTC en fecha y hora locales de México. */
export function toMexicoLocal(date: Date): MexicoLocal {
  const shifted = new Date(date.getTime() - MEXICO_UTC_OFFSET_HOURS * HOUR_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
    weekday: shifted.getUTCDay(),
    minuteOfDay: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(),
  };
}

/** ¿El inicio cae en la rejilla de 30 min (sin segundos ni milisegundos)? */
export function isOnSlotGrid(scheduledAt: Date): boolean {
  if (scheduledAt.getUTCSeconds() !== 0 || scheduledAt.getUTCMilliseconds() !== 0) return false;
  return toMexicoLocal(scheduledAt).minuteOfDay % SLOT_GRANULARITY_MINUTES === 0;
}

/** ¿La clase cabe entera dentro de la ventana reservable de su día? */
export function isWithinBookableWindow(scheduledAt: Date, durationMinutes: DurationMinutes): boolean {
  const start = toMexicoLocal(scheduledAt).minuteOfDay;
  return start >= BOOKABLE_START_MINUTE && start + durationMinutes <= BOOKABLE_END_MINUTE;
}

/**
 * Categoría de horario para la tarifa. `null` si la clase cae fuera de la
 * ventana reservable — el llamador la rechaza; nunca se le inventa un precio.
 */
export function classifySchedule(
  scheduledAt: Date,
  durationMinutes: DurationMinutes
): ScheduleCategory | null {
  if (!isWithinBookableWindow(scheduledAt, durationMinutes)) return null;
  const { weekday, minuteOfDay } = toMexicoLocal(scheduledAt);
  if (weekday === 0 || weekday === 6) return 'WEEKEND';
  return minuteOfDay < DAYTIME_END_MINUTE ? 'DAYTIME' : 'EVENING';
}

/**
 * Categoría de anticipación: ≥48 h EARLY, 24–48 h STANDARD, <24 h LAST_MINUTE.
 * `null` si la clase ya empezó o empieza antes de la anticipación mínima.
 */
export function classifyAdvance(scheduledAt: Date, now: Date): AdvanceCategory | null {
  const leadMs = scheduledAt.getTime() - now.getTime();
  if (leadMs < MIN_BOOKING_LEAD_MINUTES * MINUTE_MS) return null;
  const hours = leadMs / HOUR_MS;
  if (hours >= 48) return 'EARLY';
  if (hours >= 24) return 'STANDARD';
  return 'LAST_MINUTE';
}

/** Instante de fin de una clase. */
export function classEndsAt(scheduledAt: Date, durationMinutes: number): Date {
  return new Date(scheduledAt.getTime() + durationMinutes * MINUTE_MS);
}

/** ¿Dos intervalos [aStart, aEnd) y [bStart, bEnd) se traslapan? Los bordes que se tocan NO cuentan. */
export function intervalsOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart.getTime() < bEnd.getTime() && bStart.getTime() < aEnd.getTime();
}
