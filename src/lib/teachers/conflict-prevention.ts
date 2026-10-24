import type { ClassStatus } from '@prisma/client';

/**
 * G103 — choque de horarios entre clases del mismo profesor (spec §1.7).
 * Módulo PURO. La base de datos tiene la última palabra (restricción de
 * exclusión de la migración 0020); esta función sirve para no OFRECER un
 * horario que la base rechazaría y para dar un mensaje claro antes de cobrar.
 *
 * Incluye 10 minutos de margen después de cada clase.
 */
export const CLASS_BUFFER_MINUTES = 10;

/**
 * Estados que OCUPAN el horario. Un apartado `PENDING_PAYMENT` también, hasta
 * que caduque (`holdExpiresAt`). Cancelada no ocupa nada.
 */
export const SLOT_OCCUPYING_STATUSES: readonly ClassStatus[] = [
  'PENDING_PAYMENT',
  'BOOKED',
  'CONFIRMED',
  'IN_PROGRESS',
  'COMPLETED',
  'NO_SHOW_TEACHER',
  'NO_SHOW_STUDENT',
  'DISPUTED',
];

export interface ExistingBooking {
  scheduledAt: Date;
  durationMinutes: number;
  status: ClassStatus;
  holdExpiresAt?: Date | null;
}

/** ¿Esta reserva sigue ocupando su horario en el instante `now`? */
export function occupiesSlot(b: ExistingBooking, now: Date): boolean {
  if (!SLOT_OCCUPYING_STATUSES.includes(b.status)) return false;
  if (b.status === 'PENDING_PAYMENT' && b.holdExpiresAt && b.holdExpiresAt.getTime() <= now.getTime()) {
    return false;
  }
  return true;
}

/** Fin del bloqueo de una clase: inicio + duración + margen. */
export function blockedUntil(scheduledAt: Date, durationMinutes: number): Date {
  return new Date(scheduledAt.getTime() + (durationMinutes + CLASS_BUFFER_MINUTES) * 60_000);
}

export function hasConflict(params: {
  scheduledAt: Date;
  durationMinutes: number;
  existingBookings: ExistingBooking[];
  now: Date;
}): boolean {
  const newStart = params.scheduledAt.getTime();
  const newEnd = blockedUntil(params.scheduledAt, params.durationMinutes).getTime();
  return params.existingBookings
    .filter((b) => occupiesSlot(b, params.now))
    .some((b) => {
      const start = b.scheduledAt.getTime();
      const end = blockedUntil(b.scheduledAt, b.durationMinutes).getTime();
      return newStart < end && newEnd > start;
    });
}
