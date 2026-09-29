/**
 * LIBRO DEL CRÉDITO DE REFERIDOS — cálculo puro (Bloque 3).
 *
 * El crédito vive en LOTES: uno por venta acreditada ($150, vence a los 12
 * meses). Este módulo decide, sin base de datos, qué lotes son utilizables y de
 * cuál sale cada centavo cuando un checkout aparta crédito. La capa de datos
 * (`src/lib/db/referrals.ts`) aplica el plan con actualizaciones condicionales;
 * aquí se prueba la aritmética entera.
 */

export interface CreditLotView {
  id: string;
  remainingCents: number;
  expiresAt: Date;
  revokedAt: Date | null;
}

export interface CreditAllocation {
  lotId: string;
  cents: number;
}

/** Un lote sirve si le queda saldo, no se revocó y NO ha vencido. Vence en el instante `expiresAt`. */
export function isLotUsable(lot: CreditLotView, now: Date): boolean {
  return lot.remainingCents > 0 && lot.revokedAt === null && lot.expiresAt.getTime() > now.getTime();
}

/** Primero el que vence antes (no se deja caducar el crédito viejo); a igualdad, por id para que sea determinista. */
function byExpiry(a: CreditLotView, b: CreditLotView): number {
  const delta = a.expiresAt.getTime() - b.expiresAt.getTime();
  return delta !== 0 ? delta : a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

export function usableLots(lots: CreditLotView[], now: Date): CreditLotView[] {
  return lots.filter((lot) => isLotUsable(lot, now)).sort(byExpiry);
}

/** Crédito vigente y aplicable: la suma de lo que queda en lotes utilizables. */
export function availableCreditCents(lots: CreditLotView[], now: Date): number {
  return usableLots(lots, now).reduce((sum, lot) => sum + lot.remainingCents, 0);
}

/** El próximo vencimiento entre los lotes con saldo — el que el tablero avisa. `null` si no hay crédito. */
export function nextExpiry(lots: CreditLotView[], now: Date): Date | null {
  const usable = usableLots(lots, now);
  return usable.length > 0 ? usable[0].expiresAt : null;
}

/**
 * Reparte `amountCents` entre los lotes utilizables, el que vence antes primero.
 * Si el saldo no alcanza, devuelve lo que sí se pudo (`allocatedCents < amountCents`);
 * quien llama decide si eso basta. Nunca devuelve una asignación mayor al saldo
 * de un lote ni una cantidad no positiva.
 */
export function planAllocation(
  lots: CreditLotView[],
  now: Date,
  amountCents: number
): { allocations: CreditAllocation[]; allocatedCents: number } {
  if (!Number.isInteger(amountCents) || amountCents <= 0) return { allocations: [], allocatedCents: 0 };

  const allocations: CreditAllocation[] = [];
  let pending = amountCents;

  for (const lot of usableLots(lots, now)) {
    if (pending === 0) break;
    const take = Math.min(lot.remainingCents, pending);
    allocations.push({ lotId: lot.id, cents: take });
    pending -= take;
  }

  return { allocations, allocatedCents: amountCents - pending };
}

/** Lo que guarda `referral_credit_redemptions.allocations` (JSON): se valida al leerlo, porque viene de la base. */
export function parseAllocations(raw: unknown): CreditAllocation[] {
  if (!Array.isArray(raw)) return [];
  const out: CreditAllocation[] = [];
  for (const item of raw) {
    if (
      item &&
      typeof item === 'object' &&
      typeof (item as CreditAllocation).lotId === 'string' &&
      Number.isInteger((item as CreditAllocation).cents) &&
      (item as CreditAllocation).cents > 0
    ) {
      out.push({ lotId: (item as CreditAllocation).lotId, cents: (item as CreditAllocation).cents });
    }
  }
  return out;
}
