import { MarketplaceError, type MarketplaceErrorCode } from './errors';
import { isWithinAvailability, type AvailabilityBlock } from '@/lib/teachers/availability';
import {
  classifyAdvance,
  classifySchedule,
  isOnSlotGrid,
  isWithinBookableWindow,
} from '@/lib/teachers/schedule';
import {
  isSubjectKey,
  resolveDemandCategory,
  type DurationMinutes,
  type SubjectKey,
  type TariffParams,
  type TeacherLevelKey,
} from '@/lib/teachers/tariff';

/**
 * REGLAS DE UNA RESERVA — Bloque 2 (spec §6.2). Módulo PURO: decide si una
 * petición de reserva es válida y, si lo es, con QUÉ categorías se tarifica.
 * No toca la base ni Stripe; la comprobación de traslapes (que necesita leer
 * las clases existentes bajo un lock) vive en `src/lib/db/classes.ts`.
 *
 * El ORDEN de las comprobaciones es parte del contrato: se rechaza primero lo
 * que es un error de captura (duración, rejilla) y al final lo que depende del
 * estado del profesor (su disponibilidad). Así el mensaje que ve la persona es
 * el más útil para corregir su petición.
 *
 * Ninguna entrada es un dato del alumno: el tabulador no puede usarlos
 * (art. 26-II LFPDPPP) y este módulo ni siquiera los recibe.
 */

export type BookingRuleError =
  | 'INVALID_DURATION'
  | 'SUBJECT_NOT_OFFERED'
  | 'OFF_GRID'
  | 'OUTSIDE_WINDOW'
  | 'TOO_SOON'
  | 'OUT_OF_AVAILABILITY'
  | 'AFTER_PLAN_EXPIRY';

export interface BookingRuleInput {
  subjectKey: string;
  durationMinutes: number;
  scheduledAt: Date;
  now: Date;
  /** Materias que imparte el profesor. */
  offeredSubjects: readonly string[];
  availability: readonly AvailabilityBlock[];
  teacherLevel: TeacherLevelKey;
  /** Vigencia del Premium del alumno (= fecha de su examen). `null` = sin tope. */
  planExpiresAt: Date | null;
}

export type BookingRuleResult =
  | { ok: true; tariffParams: TariffParams; subjectKey: SubjectKey; durationMinutes: DurationMinutes }
  | { ok: false; error: BookingRuleError };

export function evaluateBookingRequest(input: BookingRuleInput): BookingRuleResult {
  const { durationMinutes, scheduledAt, now } = input;

  if (durationMinutes !== 50 && durationMinutes !== 80) return { ok: false, error: 'INVALID_DURATION' };

  if (!isSubjectKey(input.subjectKey) || !input.offeredSubjects.includes(input.subjectKey)) {
    return { ok: false, error: 'SUBJECT_NOT_OFFERED' };
  }

  if (!isOnSlotGrid(scheduledAt)) return { ok: false, error: 'OFF_GRID' };
  if (!isWithinBookableWindow(scheduledAt, durationMinutes)) return { ok: false, error: 'OUTSIDE_WINDOW' };

  const advanceCategory = classifyAdvance(scheduledAt, now);
  if (advanceCategory === null) return { ok: false, error: 'TOO_SOON' };

  if (!isWithinAvailability(input.availability, scheduledAt, durationMinutes)) {
    return { ok: false, error: 'OUT_OF_AVAILABILITY' };
  }

  // Una clase después de que vence el Premium del alumno ya no sería suya:
  // el acceso a las clases termina con su plan.
  if (input.planExpiresAt && scheduledAt.getTime() >= input.planExpiresAt.getTime()) {
    return { ok: false, error: 'AFTER_PLAN_EXPIRY' };
  }

  const scheduleCategory = classifySchedule(scheduledAt, durationMinutes);
  if (scheduleCategory === null) return { ok: false, error: 'OUTSIDE_WINDOW' };

  return {
    ok: true,
    subjectKey: input.subjectKey,
    durationMinutes,
    tariffParams: {
      subjectKey: input.subjectKey,
      teacherLevel: input.teacherLevel,
      durationMinutes,
      advanceCategory,
      scheduleCategory,
      demandCategory: resolveDemandCategory(),
    },
  };
}

const RULE_ERRORS: Record<BookingRuleError, { code: MarketplaceErrorCode; message: string }> = {
  INVALID_DURATION: { code: 'VALIDATION', message: 'Elige una clase de 50 u 80 minutos.' },
  SUBJECT_NOT_OFFERED: { code: 'VALIDATION', message: 'Ese profesor no imparte esa materia.' },
  OFF_GRID: { code: 'VALIDATION', message: 'Las clases empiezan en punto o y media (por ejemplo, 17:00 o 17:30).' },
  OUTSIDE_WINDOW: {
    code: 'OUT_OF_AVAILABILITY',
    message: 'Las clases se agendan entre las 8:00 y las 22:00 (hora de México) y deben terminar antes de las 22:00.',
  },
  TOO_SOON: { code: 'TOO_SOON', message: 'Agenda con al menos 2 horas de anticipación.' },
  OUT_OF_AVAILABILITY: { code: 'OUT_OF_AVAILABILITY', message: 'El profesor no tiene disponible ese horario. Elige otro.' },
  AFTER_PLAN_EXPIRY: {
    code: 'OUT_OF_AVAILABILITY',
    message: 'Esa fecha es posterior a la vigencia de tu plan. Elige una clase antes del día de tu examen.',
  },
};

/** Traduce un rechazo de las reglas al error de dominio con su mensaje. */
export function bookingRuleError(error: BookingRuleError): MarketplaceError {
  const { code, message } = RULE_ERRORS[error];
  return new MarketplaceError(code, message);
}
