import { splitMarketplaceRevenue } from '@/lib/marketplace/commission';

/**
 * G103 — precio y reparto de los cursos pregrabados (spec §2.3). PURO.
 *
 * Comisión: la MISMA de las clases (25 % YaEntre / 75 % profesor, decisión de
 * Ángel del 23-oct-2026), en centavos enteros (`splitMarketplaceRevenue`).
 * El precio lo pone el profesor dentro de un rango, o el curso es gratis.
 */
export const COURSE_COMMISSION = {
  MIN_PRICE_CENTS: 9_900,
  MAX_PRICE_CENTS: 999_900,
  MIN_PAYOUT_CENTS: 30_000,
} as const;

export function calculateCourseRevenue(priceCents: number): { teacherCents: number; yaentreCents: number } {
  return splitMarketplaceRevenue(priceCents);
}

export function validateCoursePrice(priceCents: number, isFree: boolean): { valid: boolean; error?: string } {
  if (isFree) return priceCents === 0 ? { valid: true } : { valid: false, error: 'Un curso gratuito no lleva precio.' };
  if (!Number.isInteger(priceCents)) return { valid: false, error: 'El precio debe ser en pesos y centavos exactos.' };
  if (priceCents < COURSE_COMMISSION.MIN_PRICE_CENTS) return { valid: false, error: 'Precio mínimo: $99 MXN' };
  if (priceCents > COURSE_COMMISSION.MAX_PRICE_CENTS) return { valid: false, error: 'Precio máximo: $9,999 MXN' };
  return { valid: true };
}

/** El precio original (tachado) solo tiene sentido si es MAYOR que el precio. */
export function validateOriginalPrice(priceCents: number, originalPriceCents: number | null): { valid: boolean; error?: string } {
  if (originalPriceCents === null) return { valid: true };
  if (!Number.isInteger(originalPriceCents) || originalPriceCents <= priceCents) {
    return { valid: false, error: 'El precio original debe ser mayor que el precio de venta.' };
  }
  if (originalPriceCents > COURSE_COMMISSION.MAX_PRICE_CENTS) return { valid: false, error: 'Precio máximo: $9,999 MXN' };
  return { valid: true };
}
