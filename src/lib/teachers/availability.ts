import { z } from 'zod';
import {
  BOOKABLE_END_MINUTE,
  BOOKABLE_START_MINUTE,
  SLOT_GRANULARITY_MINUTES,
  toMexicoLocal,
} from './schedule';

/**
 * Disponibilidad semanal de un profesor — Bloque 2 (spec §3.1: «selector de
 * bloques horarios»). Módulo PURO.
 *
 * Un bloque es `{ weekday, startMinute, endMinute }` en HORA DE MÉXICO, con
 * `weekday` 0 = domingo … 6 = sábado y los minutos contados desde la medianoche.
 * Los bloques caen dentro de la ventana reservable (8:00–22:00) y en la rejilla
 * de 30 minutos, igual que las clases: si no, un profesor podría ofrecer un
 * horario en el que nadie puede reservarle nada.
 */

export const MAX_AVAILABILITY_BLOCKS = 70; // 7 días × 10 bloques: holgado, y acota el JSON

export interface AvailabilityBlock {
  weekday: number;
  startMinute: number;
  endMinute: number;
}

const minuteOnGrid = (m: number) => m % SLOT_GRANULARITY_MINUTES === 0;

export const availabilityBlockSchema = z
  .object({
    weekday: z.number().int().min(0).max(6),
    startMinute: z.number().int(),
    endMinute: z.number().int(),
  })
  .refine((b) => b.startMinute >= BOOKABLE_START_MINUTE && b.endMinute <= BOOKABLE_END_MINUTE, {
    message: 'Los bloques deben estar entre las 8:00 y las 22:00.',
  })
  .refine((b) => b.startMinute < b.endMinute, {
    message: 'La hora de fin debe ser posterior a la de inicio.',
  })
  .refine((b) => minuteOnGrid(b.startMinute) && minuteOnGrid(b.endMinute), {
    message: 'Los bloques van en intervalos de 30 minutos.',
  });

export const availabilitySchema = z
  .array(availabilityBlockSchema)
  .max(MAX_AVAILABILITY_BLOCKS, `Máximo ${MAX_AVAILABILITY_BLOCKS} bloques.`);

/**
 * Ordena y FUSIONA los bloques que se traslapan o se tocan, por día. La forma
 * normalizada es la que se guarda: hace que la comparación y el ajuste de una
 * clase dentro de un bloque no dependan de cómo el profesor los capturó.
 */
export function normalizeAvailability(blocks: readonly AvailabilityBlock[]): AvailabilityBlock[] {
  const sorted = [...blocks].sort(
    (a, b) => a.weekday - b.weekday || a.startMinute - b.startMinute || a.endMinute - b.endMinute
  );
  const merged: AvailabilityBlock[] = [];
  for (const block of sorted) {
    const last = merged[merged.length - 1];
    if (last && last.weekday === block.weekday && block.startMinute <= last.endMinute) {
      last.endMinute = Math.max(last.endMinute, block.endMinute);
    } else {
      merged.push({ ...block });
    }
  }
  return merged;
}

/** Lee el JSON guardado en la base de forma defensiva: lo inválido se descarta, nunca lanza. */
export function parseStoredAvailability(raw: unknown): AvailabilityBlock[] {
  const parsed = availabilitySchema.safeParse(raw);
  return parsed.success ? normalizeAvailability(parsed.data) : [];
}

/**
 * ¿La clase cabe ENTERA en un bloque de disponibilidad del profesor? Debe
 * empezar y terminar dentro del mismo bloque (ya fusionados), en su día local.
 */
export function isWithinAvailability(
  blocks: readonly AvailabilityBlock[],
  scheduledAt: Date,
  durationMinutes: number
): boolean {
  const { weekday, minuteOfDay } = toMexicoLocal(scheduledAt);
  const end = minuteOfDay + durationMinutes;
  return normalizeAvailability(blocks).some(
    (b) => b.weekday === weekday && minuteOfDay >= b.startMinute && end <= b.endMinute
  );
}

/** Horas semanales ofrecidas, para el resumen del panel. */
export function weeklyAvailableHours(blocks: readonly AvailabilityBlock[]): number {
  const minutes = normalizeAvailability(blocks).reduce((sum, b) => sum + (b.endMinute - b.startMinute), 0);
  return Math.round((minutes / 60) * 10) / 10;
}
