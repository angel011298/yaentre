/**
 * Reglas de edad — Bloque 1, modelo por capas de menores (handoff §3.1).
 *
 * Módulo PURO y testeable: sin DB, sin `Date.now()` implícito (el `now` siempre
 * entra como parámetro). Es la única fuente de verdad de:
 *   · edad mínima para registrarse (< 15 → bloqueado);
 *   · edad a partir de la cual NO se necesita tutor para pagar (≥ 18).
 *
 * La minoría de edad en México es < 18 (art. 646 CCF). El piso de 15 es una
 * decisión de producto del handoff: por debajo de 15 no se ofrece el servicio.
 */

/** Edad mínima para poder registrarse. Por debajo, el registro se rechaza. */
export const MIN_REGISTRATION_AGE = 15;

/** Mayoría de edad: a partir de aquí no se requiere confirmación del tutor. */
export const ADULT_AGE = 18;

/**
 * Edad cumplida (años completos) a una fecha dada. Cuenta un año más solo si ya
 * pasó el cumpleaños en el año de `now` — el mes/día se comparan de verdad, no
 * se aproxima dividiendo milisegundos (que se desfasa por los años bisiestos).
 */
export function computeAge(birthDate: Date, now: Date): number {
  let age = now.getUTCFullYear() - birthDate.getUTCFullYear();
  const monthDiff = now.getUTCMonth() - birthDate.getUTCMonth();
  const dayDiff = now.getUTCDate() - birthDate.getUTCDate();
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age -= 1;
  }
  return age;
}

/** ¿La edad está por debajo del piso de registro (< 15)? */
export function isBelowMinAge(birthDate: Date, now: Date): boolean {
  return computeAge(birthDate, now) < MIN_REGISTRATION_AGE;
}

/** ¿Es menor de edad (< 18) y por tanto necesita confirmación del tutor para pagar? */
export function requiresTutorConsent(birthDate: Date, now: Date): boolean {
  return computeAge(birthDate, now) < ADULT_AGE;
}

/**
 * Valida y normaliza una fecha de nacimiento DECLARADA en un formulario
 * (`YYYY-MM-DD`). Devuelve la fecha (a medianoche UTC) o un motivo de rechazo:
 *   · 'INVALID'   → no es una fecha real;
 *   · 'FUTURE'    → está en el futuro (o es hoy);
 *   · 'TOO_OLD'   → implausible (> 100 años), casi seguro un error de captura;
 *   · 'TOO_YOUNG' → por debajo del piso de 15 años.
 * Es puro: `now` entra como parámetro.
 */
export type BirthDateRejection = 'INVALID' | 'FUTURE' | 'TOO_OLD' | 'TOO_YOUNG';

export function parseDeclaredBirthDate(
  raw: string,
  now: Date
): { ok: true; date: Date } | { ok: false; reason: BirthDateRejection } {
  // Formato estricto YYYY-MM-DD para no depender del locale del parser.
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw.trim());
  if (!match) return { ok: false, reason: 'INVALID' };

  const [, y, m, d] = match;
  const year = Number(y);
  const month = Number(m);
  const day = Number(d);
  const date = new Date(Date.UTC(year, month - 1, day));

  // Rechaza fechas que "se acomodan" (p. ej. 2010-02-31 → 3 de marzo).
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return { ok: false, reason: 'INVALID' };
  }

  if (date.getTime() >= now.getTime()) return { ok: false, reason: 'FUTURE' };
  if (computeAge(date, now) > 100) return { ok: false, reason: 'TOO_OLD' };
  if (isBelowMinAge(date, now)) return { ok: false, reason: 'TOO_YOUNG' };

  return { ok: true, date };
}
