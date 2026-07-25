/**
 * Vinculación parental (F16 tarea 1): reglas de negocio del código de 6
 * dígitos que el alumno genera para compartir con su tutor. Módulo PURO —
 * la generación real y la persistencia (unicidad, TTL en DB) viven en
 * `src/lib/db/parent.ts`; aquí solo el formato del código y la regla de
 * vigencia (10 min, un solo uso).
 */

export const LINK_CODE_LENGTH = 6;
export const LINK_CODE_TTL_MINUTES = 10;

/** Genera un código numérico de 6 dígitos (puede empezar con 0). Inyecta
 *  `random` (0..1) solo para pruebas deterministas — por defecto usa
 *  `Math.random()`, suficiente para un código de un solo uso de corta vida
 *  (no es un secreto criptográfico de largo plazo). */
export function generateLinkCode(random: () => number = Math.random): string {
  const max = 10 ** LINK_CODE_LENGTH;
  const n = Math.floor(random() * max);
  return String(n).padStart(LINK_CODE_LENGTH, '0');
}

export function computeLinkCodeExpiry(now: Date): Date {
  return new Date(now.getTime() + LINK_CODE_TTL_MINUTES * 60 * 1000);
}

export interface LinkCodeRecord {
  expiresAt: Date;
  usedAt: Date | null;
}

/** Un código es canjeable si no se usó antes Y sigue dentro de su TTL. */
export function isLinkCodeRedeemable(record: LinkCodeRecord, now: Date): boolean {
  if (record.usedAt !== null) return false;
  return record.expiresAt.getTime() > now.getTime();
}
