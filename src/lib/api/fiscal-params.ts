import { mexicoMonthOf, parseMonthKey, type MonthRef } from '@/lib/admin/fiscal';

/**
 * Parámetros de las rutas fiscales, validados. Puro: `now` entra como parámetro.
 * El primer año fiscal del producto es 2026 (Early Bird, oct-2026); pedir uno
 * anterior o futuro es un error de captura, no una consulta vacía.
 */
export const FIRST_FISCAL_YEAR = 2026;

export function parseFiscalYear(raw: string | null, now: Date): { ok: true; year: number } | { ok: false } {
  const current = mexicoMonthOf(now).year;
  if (raw === null || raw === '') return { ok: true, year: current };
  if (!/^\d{4}$/.test(raw)) return { ok: false };
  const year = Number(raw);
  return year >= FIRST_FISCAL_YEAR && year <= current ? { ok: true, year } : { ok: false };
}

/** Un mes `YYYY-MM` que ya empezó (no se exporta un mes futuro) y no es anterior al primer año fiscal. */
export function parseFiscalMonth(raw: string | null, now: Date): { ok: true; month: MonthRef } | { ok: false } {
  if (raw === null) return { ok: false };
  const ref = parseMonthKey(raw);
  if (!ref || ref.year < FIRST_FISCAL_YEAR) return { ok: false };
  const current = mexicoMonthOf(now);
  const future = ref.year > current.year || (ref.year === current.year && ref.month > current.month);
  return future ? { ok: false } : { ok: true, month: ref };
}
