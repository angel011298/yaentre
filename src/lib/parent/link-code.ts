import { randomInt } from 'node:crypto';

/**
 * Vinculación parental (F16 tarea 1): reglas de negocio del código de 6
 * dígitos que el alumno genera para compartir con su tutor. Módulo PURO —
 * la generación real y la persistencia (unicidad, TTL en DB) viven en
 * `src/lib/db/parent.ts`; aquí solo el formato del código y la regla de
 * vigencia (10 min, un solo uso).
 */

export const LINK_CODE_LENGTH = 6;
export const LINK_CODE_TTL_MINUTES = 10;

/**
 * Genera un código numérico de 6 dígitos (puede empezar con 0).
 *
 * G65 — se cambió `Math.random()` por `crypto.randomInt`. El argumento de
 * antes ("no es un secreto criptográfico de largo plazo") no se sostiene para
 * ESTE código: es la llave que le abre a un adulto el tablero de un MENOR.
 * `Math.random()` en V8 es xorshift128+, un PRNG NO criptográfico cuyo estado
 * interno se puede reconstruir observando unas pocas salidas — y observar
 * salidas es trivial aquí, porque cualquiera puede registrarse como alumno y
 * pedir todos los códigos que quiera. Reconstruido el estado, los códigos que
 * el mismo proceso genere para OTROS alumnos son predecibles.
 *
 * `randomInt` toma entropía del sistema operativo y es uniforme (sin el sesgo
 * del módulo). Sigue admitiendo un generador inyectado para las pruebas
 * deterministas que ya existían.
 */
export function generateLinkCode(random?: () => number): string {
  const max = 10 ** LINK_CODE_LENGTH;
  const n = random ? Math.floor(random() * max) : randomInt(0, max);
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
