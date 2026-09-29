import type { ReferralHistoryItem } from '@/lib/db/referrals';

/**
 * Cómo se le cuenta una venta a QUIEN INVITÓ. Puro. Nada de aquí menciona una
 * marca de antifraude ni el motivo de una reversa por fraude: «en verificación» y
 * «no se acreditó» son lo único que la persona necesita saber (decirle qué regla
 * saltó enseña a esquivarla).
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Días que faltan para acreditar, redondeando hacia arriba; 0 si ya pasó. */
export function daysUntilAccrual(accrueAfter: Date, now: Date): number {
  return Math.max(0, Math.ceil((accrueAfter.getTime() - now.getTime()) / DAY_MS));
}

export type SaleTone = 'success' | 'pending' | 'review' | 'reversed';

export interface SaleView {
  tone: SaleTone;
  /** Texto corto con marca ✓/⏳ además del color (WCAG: el color no es el único canal). */
  label: string;
  detail: string;
}

export function describeSale(item: Pick<ReferralHistoryItem, 'status' | 'underReview' | 'accrueAfter' | 'reversedForRefund'>, now: Date): SaleView {
  switch (item.status) {
    case 'ACCRUED':
    case 'PAID':
      return { tone: 'success', label: '✓ Acreditado', detail: 'Ya es parte de tu crédito.' };
    case 'REVERSED':
      return item.reversedForRefund
        ? { tone: 'reversed', label: '↩ Revertido', detail: 'La compra se reembolsó, así que el crédito no se acreditó.' }
        : { tone: 'reversed', label: '✗ No se acreditó', detail: 'Esta compra no generó crédito.' };
    case 'PENDING': {
      if (item.underReview) {
        return { tone: 'review', label: '⏳ En verificación', detail: 'La estamos revisando; te avisamos en cuanto se acredite.' };
      }
      const days = daysUntilAccrual(item.accrueAfter, now);
      return {
        tone: 'pending',
        label: days > 0 ? `⏳ Se acredita en ${days} ${days === 1 ? 'día' : 'días'}` : '⏳ Se acredita hoy',
        detail: 'Esperamos unos días por si hay un reembolso, antes de acreditarla.',
      };
    }
  }
}
