import { toMexicoLocal } from '@/lib/teachers/schedule';

/**
 * Fechas para las pantallas de administración, SIEMPRE en hora de México
 * (UTC−6 fijo, sin horario de verano desde 2022): el servidor corre en UTC y una
 * fecha de vencimiento no puede moverse de día por eso. Puro y sin `Intl`, para
 * que dé lo mismo en cualquier entorno.
 */
const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];
const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** «17 nov 2026». */
export function formatMexicoDate(date: Date): string {
  const l = toMexicoLocal(date);
  return `${l.day} ${MONTHS_SHORT[l.month]} ${l.year}`;
}

/** «octubre 2026» para `{ year: 2026, month: 10 }`. */
export function formatMonthLabel(ref: { year: number; month: number }): string {
  return `${MONTHS[ref.month - 1]} ${ref.year}`;
}
