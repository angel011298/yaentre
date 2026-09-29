import { randomInt } from 'node:crypto';

/**
 * CÓDIGOS DE REFERIDO — Bloque 3 (ESPECIFICACION_QR_COMISIONES §3.2).
 *
 * Módulo PURO (sin base de datos, sin `next/headers`): genera, normaliza y
 * valida el código, y arma el enlace. La unicidad la garantiza la base
 * (`referral_codes.code` es UNIQUE); aquí solo se reduce a casi cero la
 * probabilidad de colisión y se reintenta en el llamador.
 *
 * ── Por qué `crypto.randomInt` y no `Math.random` ────────────────────────────
 *
 * El código NO es un secreto, pero tampoco puede ser predecible: quien
 * adivinara el código de otra persona podría atribuirse sus ventas o
 * enumerar cuentas. `Math.random()` es xorshift128+ y se reconstruye a partir
 * de unas pocas salidas (CLAUDE.md, guardrail de G65 §5). `randomInt` sale del
 * generador criptográfico del sistema operativo y es uniforme (no tiene el
 * sesgo de módulo de `bytes % n`).
 */

/**
 * 31 símbolos, sin ambigüedad visual: fuera 0/O y 1/I/L (spec §3.2: «sin 0/O,
 * 1/l/I»). El código se lee en voz alta, se copia de un cartel y se escribe a
 * mano desde una foto: cada símbolo confundible es un soporte que no se
 * resuelve. Solo MAYÚSCULAS: el alfabeto excluye la `l` minúscula por la misma
 * razón que la `I` mayúscula.
 */
export const REFERRAL_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const REFERRAL_CODE_LENGTH = 8;

/**
 * Cadenas que un código generado no puede contener. Un código se comparte
 * públicamente entre adolescentes y padres; con 8 símbolos al azar la
 * probabilidad de que salga una grosería es minúscula pero no nula, y un
 * código así en un cartel es una queja segura. Se vuelve a sortear.
 */
const BLOCKED_SUBSTRINGS = [
  'PUTA',
  'PUTO',
  'PEDO',
  'CULO',
  'CACA',
  'CAGA',
  'MIERD',
  'NALGA',
  'VERGA',
  'PENE',
  'SEXO',
  'NAZI',
  'MAMON',
  'CHUPA',
] as const;

export type RandomIntFn = (maxExclusive: number) => number;

const defaultRandomInt: RandomIntFn = (max) => randomInt(max);

export function containsBlockedWord(code: string): boolean {
  return BLOCKED_SUBSTRINGS.some((word) => code.includes(word));
}

/**
 * Genera un código nuevo. `rand` es inyectable SOLO para probar el sorteo; en
 * producción es `crypto.randomInt`.
 */
export function generateReferralCode(rand: RandomIntFn = defaultRandomInt): string {
  for (let attempt = 0; attempt < 20; attempt++) {
    let code = '';
    for (let i = 0; i < REFERRAL_CODE_LENGTH; i++) {
      code += REFERRAL_CODE_ALPHABET[rand(REFERRAL_CODE_ALPHABET.length)];
    }
    if (!containsBlockedWord(code)) return code;
  }
  // 20 sorteos seguidos con una grosería es imposible en la práctica; si pasara
  // (un `rand` roto), es mejor fallar fuerte que devolver un código arbitrario.
  throw new Error('No se pudo generar un código de referido sin cadenas bloqueadas.');
}

/**
 * Formato aceptado al BUSCAR un código: 4-20 letras o dígitos. Más amplio que el
 * alfabeto de los códigos generados a propósito: el Embajador (Nivel 2) podrá
 * elegir el suyo («PEDRO2026», que sí lleva 0). Siempre se guarda y se busca en
 * mayúsculas.
 */
const LOOKUP_FORMAT = /^[A-Z0-9]{4,20}$/;

/** Normaliza lo que llega de una URL o una cookie. `null` = no es un código válido. */
export function normalizeReferralCode(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const code = raw.trim().toUpperCase();
  return LOOKUP_FORMAT.test(code) ? code : null;
}

// ─────────────────────────────── Cookie de atribución ───────────────────────────────

export const REFERRAL_COOKIE_NAME = 'ye_ref';
export const REFERRAL_COOKIE_MAX_AGE_SECS = 30 * 24 * 60 * 60; // 30 días (spec §3.2)

/** Lee el valor de la cookie. Un valor manipulado o corrupto es «sin atribución», nunca un error. */
export function parseReferralCookie(raw: string | undefined | null): string | null {
  return normalizeReferralCode(raw);
}

/**
 * ¿Ya hay una atribución guardada? FIRST TOUCH WINS (spec §3.2 y §8): mientras
 * la cookie traiga un código bien formado, ningún enlace posterior la
 * sobreescribe. Una cookie corrupta NO cuenta como atribución: si contara,
 * quien manipulara la suya se quedaría sin atribución para siempre.
 */
export function hasReferralAttribution(existingCookie: string | undefined | null): boolean {
  return parseReferralCookie(existingCookie) !== null;
}

/** Enlace público de un código: `https://yaentre.com/r/{code}`. */
export function referralUrl(code: string, siteUrl: string): string {
  return `${siteUrl.replace(/\/+$/, '')}/r/${code}`;
}
