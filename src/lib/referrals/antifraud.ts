/**
 * ANTIFRAUDE BÁSICO DEL PROGRAMA DE REFERIDOS — Bloque 3
 * (ESPECIFICACION_QR_COMISIONES §3.4). Módulo PURO: recibe los hechos ya
 * consultados y devuelve un veredicto; no toca la base ni la red.
 *
 * ── Dos gravedades ─────────────────────────────────────────────────────────
 *
 *  · DURA — la venta NO puede acreditarse nunca: autocompra (misma cuenta) o
 *    mismo buzón de correo. Spec §8: «NUNCA permitir autocompra». La venta se
 *    registra REVERSED en el acto (queda visible para el admin, no se pierde) y
 *    no abre ningún lote de crédito.
 *  · BLANDA — huele mal pero puede ser legítima (una campaña que funcionó; un
 *    referidor con mala racha de reembolsos). La venta se registra PENDING pero
 *    la acreditación queda RETENIDA hasta que un admin la resuelva. Nunca se
 *    rechaza en silencio ni se acredita en silencio.
 *
 * ── Lo que NO se hace, y por qué ───────────────────────────────────────────
 *
 * «Mismo dispositivo» (spec §3.4, punto 3) NO se implementa. Exigiría guardar
 * una huella del dispositivo de cada visitante — un dato personal más, sobre
 * una población de 15 a 22 años — para un beneficio marginal (el mismo cuarto
 * de la misma casa compartiendo wifi es el caso normal, no el fraude). Si se
 * quiere, es una decisión de producto y de privacidad aparte (ver retorno).
 */

import { normalizeEmailForAbuse } from './email-normalization';

export type FraudFlag = 'self_purchase' | 'same_email' | 'velocity' | 'reversal_pattern';

/** Marcas que impiden acreditar para siempre. */
export const HARD_FLAGS: readonly FraudFlag[] = ['self_purchase', 'same_email'];

/** Spec §3.4, punto 4: «> 5 ventas del mismo referrer en 24h». */
export const VELOCITY_WINDOW_HOURS = 24;
export const VELOCITY_MAX_SALES = 5;

/**
 * Spec §3.4, punto 5: «referrer crea cuenta → compra → reembolso → repite».
 * La spec no fija umbral ni ventana; estos son los de este arranque (2
 * reversiones en 90 días) y son constantes a propósito, para poder ajustarlos
 * con datos reales sin tocar la lógica. Ver retorno, pregunta abierta.
 */
export const REVERSAL_WINDOW_DAYS = 90;
export const REVERSAL_PATTERN_THRESHOLD = 2;

export interface FraudInput {
  referrerProfileId: string;
  buyerProfileId: string;
  referrerEmail: string | null;
  buyerEmail: string | null;
  /** Ventas que YA tenía el código en las últimas 24 h, sin contar la que se evalúa. */
  salesInLast24h: number;
  /** Ventas REVERSED del código en los últimos 90 días. */
  reversalsInLast90d: number;
}

export interface FraudVerdict {
  /** ¿Hay una marca dura? La venta nace REVERSED y nunca se acredita. */
  blocked: boolean;
  flags: FraudFlag[];
}

export function isHardFlag(flag: string): boolean {
  return (HARD_FLAGS as readonly string[]).includes(flag);
}

/** Mismo buzón tras normalizar (alias `+`, puntos de Gmail, `googlemail`). Si algún correo no se puede leer: `false`. */
export function sameMailbox(a: string | null, b: string | null): boolean {
  if (!a || !b) return false;
  const na = normalizeEmailForAbuse(a);
  const nb = normalizeEmailForAbuse(b);
  return na !== null && nb !== null && na === nb;
}

export function detectFraud(input: FraudInput): FraudVerdict {
  const flags: FraudFlag[] = [];

  // 1. Autocompra: la misma cuenta.
  if (input.referrerProfileId === input.buyerProfileId) flags.push('self_purchase');

  // 2. Mismo correo, con las variaciones que no cambian de buzón.
  if (sameMailbox(input.referrerEmail, input.buyerEmail)) flags.push('same_email');

  // 4. Velocidad: la venta que se evalúa es la número (previas + 1); se marca
  //    cuando esa cuenta pasa de 5 en 24 h.
  if (input.salesInLast24h + 1 > VELOCITY_MAX_SALES) flags.push('velocity');

  // 5. Patrón de reversiones.
  if (input.reversalsInLast90d >= REVERSAL_PATTERN_THRESHOLD) flags.push('reversal_pattern');

  return { blocked: flags.some(isHardFlag), flags };
}

/** Las marcas viajan como texto separado por comas en `referral_sales.fraudFlag`. */
export function serializeFlags(flags: FraudFlag[]): string | null {
  return flags.length === 0 ? null : flags.join(',');
}

export function parseFlags(raw: string | null | undefined): FraudFlag[] {
  if (!raw) return [];
  const known: readonly string[] = ['self_purchase', 'same_email', 'velocity', 'reversal_pattern'];
  return raw.split(',').filter((f): f is FraudFlag => known.includes(f));
}
