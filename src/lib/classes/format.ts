import { toMexicoLocal } from '@/lib/teachers/schedule';

/**
 * Formato de fechas y nombres para correos y pantallas de clases — Bloque 2.
 * Módulo PURO. La hora siempre es la de México (UTC−6 fijo): el alumno y el
 * profesor leen la MISMA hora en el correo y en el calendario, sin que el
 * servidor (UTC) la mueva.
 */

const DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

const pad = (n: number) => String(n).padStart(2, '0');

/** «lunes 5 de octubre, 17:00» en hora de México. */
export function formatClassWhen(date: Date): string {
  const l = toMexicoLocal(date);
  const hh = Math.floor(l.minuteOfDay / 60);
  const mm = l.minuteOfDay % 60;
  return `${DAYS[l.weekday]} ${l.day} de ${MONTHS[l.month]}, ${pad(hh)}:${pad(mm)}`;
}

/**
 * Cómo se le nombra a un alumno ante su profesor: SOLO el primer nombre. El
 * profesor necesita saludar a quien va a enseñar, no conocer el nombre completo
 * de una persona que puede ser menor de edad (minimización de datos).
 */
export function firstNameOf(displayName: string | null | undefined): string {
  const first = displayName?.trim().split(/\s+/)[0];
  return first ? first : 'tu alumno';
}
