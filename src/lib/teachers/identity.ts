import { ADULT_AGE, computeAge } from '@/lib/legal/age';

/**
 * Validadores de identidad y de cuenta bancaria del profesor — Bloque 2
 * (spec §3.1: «CLABE + CURP obligatorios, RFC opcional»). Módulo PURO.
 *
 * ── Qué garantizan y qué NO ────────────────────────────────────────────────
 *
 * Validan FORMA y dígito verificador: cazan un dedo torcido al capturar, no
 * prueban que la persona sea quien dice ni que la cuenta exista. La revisión
 * del admin (spec §3.1 paso 4) sigue siendo la verificación de fondo — estas
 * funciones evitan que le lleguen datos que ni siquiera pueden ser válidos.
 *
 * No hay catálogo de bancos: la spec pide «banco válido», pero un catálogo
 * escrito de memoria rechazaría a alguien con una cuenta real en una
 * institución que se me pasó, y un falso rechazo aquí le cierra la puerta a un
 * profesor. El banco lo captura la persona y lo revisa el admin junto con el
 * prefijo de 3 dígitos de la CLABE.
 */

// ─────────────────────────────────── CURP ───────────────────────────────────

const CURP_STATES =
  'AS|BC|BS|CC|CL|CM|CS|CH|DF|DG|GT|GR|HG|JC|MC|MN|MS|NT|NL|OC|PL|QT|QR|SP|SL|SR|TC|TS|TL|VZ|YN|ZS|NE';

const CURP_RE = new RegExp(
  `^[A-Z][AEIOUX][A-Z]{2}(\\d{2})(0[1-9]|1[0-2])(0[1-9]|[12]\\d|3[01])[HMX](?:${CURP_STATES})[B-DF-HJ-NP-TV-Z]{3}([A-Z\\d])\\d$`
);

/** Alfabeto del dígito verificador de la CURP (la Ñ ocupa el lugar 24). */
const CURP_DICTIONARY = '0123456789ABCDEFGHIJKLMNÑOPQRSTUVWXYZ';

/** Dígito verificador esperado para los primeros 17 caracteres de una CURP. */
export function curpCheckDigit(first17: string): number {
  let sum = 0;
  for (let i = 0; i < 17; i++) {
    const value = CURP_DICTIONARY.indexOf(first17[i]!);
    if (value < 0) return -1;
    sum += value * (18 - i);
  }
  return (10 - (sum % 10)) % 10;
}

export type CurpRejection = 'FORMAT' | 'DATE' | 'CHECK_DIGIT' | 'UNDERAGE';

/** Quita espacios y pasa a mayúsculas: como la escribe la gente, no como la imprime RENAPO. */
export function normalizeCurp(raw: string): string {
  return raw.replace(/\s+/g, '').toUpperCase();
}

/**
 * Valida una CURP: forma, fecha de nacimiento real, dígito verificador y
 * mayoría de edad. El siglo lo da el penúltimo carácter (dígito ⇒ 1900s, letra
 * ⇒ 2000s), y de la fecha sale la edad — así el requisito de adulto no exige un
 * campo más al profesor ni se puede saltar con una fecha distinta a la de su CURP.
 */
export function validateCurp(
  raw: string,
  now: Date
): { ok: true; curp: string; birthDate: Date } | { ok: false; reason: CurpRejection } {
  const curp = normalizeCurp(raw);
  const match = CURP_RE.exec(curp);
  if (!match) return { ok: false, reason: 'FORMAT' };

  const [, yy, mm, dd, homoclave] = match;
  const century = /\d/.test(homoclave!) ? 1900 : 2000;
  const year = century + Number(yy);
  const month = Number(mm);
  const day = Number(dd);

  const birthDate = new Date(Date.UTC(year, month - 1, day));
  if (
    birthDate.getUTCFullYear() !== year ||
    birthDate.getUTCMonth() !== month - 1 ||
    birthDate.getUTCDate() !== day ||
    birthDate.getTime() >= now.getTime()
  ) {
    return { ok: false, reason: 'DATE' };
  }

  if (curpCheckDigit(curp.slice(0, 17)) !== Number(curp[17])) {
    return { ok: false, reason: 'CHECK_DIGIT' };
  }

  if (computeAge(birthDate, now) < ADULT_AGE) return { ok: false, reason: 'UNDERAGE' };

  return { ok: true, curp, birthDate };
}

// ─────────────────────────────────── CLABE ───────────────────────────────────

const CLABE_WEIGHTS = [3, 7, 1];

/** Dígito verificador esperado para los primeros 17 dígitos de una CLABE. */
export function clabeCheckDigit(first17: string): number {
  let sum = 0;
  for (let i = 0; i < 17; i++) {
    const digit = Number(first17[i]);
    if (!Number.isInteger(digit)) return -1;
    sum += (digit * CLABE_WEIGHTS[i % 3]!) % 10;
  }
  return (10 - (sum % 10)) % 10;
}

export type ClabeRejection = 'FORMAT' | 'CHECK_DIGIT';

/** Solo dígitos: quita los espacios y guiones con que la gente separa los grupos. */
export function normalizeClabe(raw: string): string {
  return raw.replace(/[\s-]+/g, '');
}

export function validateClabe(
  raw: string
): { ok: true; clabe: string; bankCode: string } | { ok: false; reason: ClabeRejection } {
  const clabe = normalizeClabe(raw);
  if (!/^\d{18}$/.test(clabe)) return { ok: false, reason: 'FORMAT' };
  if (clabeCheckDigit(clabe.slice(0, 17)) !== Number(clabe[17])) return { ok: false, reason: 'CHECK_DIGIT' };
  return { ok: true, clabe, bankCode: clabe.slice(0, 3) };
}

/** «••••••••••••••4567» → se muestra solo el final. Para paneles y correos, nunca la CLABE entera. */
export function maskClabe(clabe: string): string {
  return clabe.length >= 4 ? `****${clabe.slice(-4)}` : '****';
}

// ──────────────────────────────────── RFC ────────────────────────────────────

const RFC_PERSONA_FISICA_RE = /^[A-ZÑ&]{4}(\d{2})(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])[A-Z\d]{3}$/;

/** RFC genéricos del SAT: no identifican a nadie y no sirven para facturar un servicio. */
const GENERIC_RFCS = new Set(['XAXX010101000', 'XEXX010101000']);

export type RfcRejection = 'FORMAT' | 'GENERIC';

export function normalizeRfc(raw: string): string {
  return raw.replace(/\s+/g, '').toUpperCase();
}

/**
 * RFC de PERSONA FÍSICA (13 caracteres). No se acepta el de persona moral: el
 * profesor factura como persona, y un RFC de 12 caracteres delataría que se
 * capturó el de un tercero. No se calcula la homoclave ni su dígito: la
 * constancia (CSF) que sube el profesor es la prueba de fondo.
 */
export function validateRfc(raw: string): { ok: true; rfc: string } | { ok: false; reason: RfcRejection } {
  const rfc = normalizeRfc(raw);
  if (GENERIC_RFCS.has(rfc)) return { ok: false, reason: 'GENERIC' };
  if (!RFC_PERSONA_FISICA_RE.test(rfc)) return { ok: false, reason: 'FORMAT' };
  return { ok: true, rfc };
}

// ─────────────────────────────────── Teléfono ───────────────────────────────────

/** Devuelve los 10 dígitos nacionales, o `null` si no es un número mexicano plausible. */
export function normalizeMxPhone(raw: string): string | null {
  const digits = raw.replace(/[^\d]/g, '');
  const national = digits.length === 12 && digits.startsWith('52') ? digits.slice(2) : digits;
  if (!/^\d{10}$/.test(national)) return null;
  if (national[0] === '0' || national[0] === '1') return null; // lada inexistente
  return national;
}

// ───────────────────── Datos de contacto en texto público ─────────────────────

/**
 * ¿El texto trae datos para contactar al profesor FUERA de la plataforma? La
 * biografía y el nombre público los ve cualquier alumno Premium, y el modelo de
 * comisión depende de que las clases se agenden y se paguen dentro de YaEntre:
 * un teléfono, un correo o un «escríbeme a WhatsApp» en el perfil es una
 * invitación a saltárselo. Es un filtro de sentido común, no un sistema
 * antifraude — el contrato lo prohíbe y el admin lo revisa.
 */
export function containsContactInfo(text: string): boolean {
  if (/[^\s@]+@[^\s@]+\.[^\s@]+/.test(text)) return true; // correo
  if (/(?:\d[\s.\-()]*){8,}/.test(text)) return true; // 8+ dígitos, aunque vengan separados
  if (/\b(?:whats\s*app|wa\.me|telegram|t\.me|instagram|facebook|messenger|tiktok)\b/i.test(text)) return true;
  if (/(?:^|\s)@[\w.]{3,}/.test(text)) return true; // @usuario
  if (/https?:\/\/|www\./i.test(text)) return true;
  return false;
}
