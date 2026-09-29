/**
 * NORMALIZACIÓN DE CORREO PARA DETECTAR AUTOCOMPRAS — Bloque 3.
 *
 * Objetivo: dos direcciones que llegan al MISMO buzón deben normalizar igual.
 * Una persona que se refiere a sí misma para cobrarse el crédito no va a usar
 * el mismo correo; usará `yo+2@gmail.com` o `y.o@gmail.com`.
 *
 * ── Corrige la función de la spec ──────────────────────────────────────────
 *
 * La spec §3.4 escribe:
 *
 *     const normalizeEmail = (e) => e.split('+')[0].toLowerCase();
 *
 * y falla justo en el caso que quiere detectar: `'pedro+1@gmail.com'.split('+')[0]`
 * es `'pedro'` (se pierde el dominio) mientras `'pedro@gmail.com'` no tiene `+`
 * y se queda entero — `'pedro' !== 'pedro@gmail.com'`, así que el alias NO se
 * reconoce como el mismo buzón. Peor: dos personas distintas
 * (`ana+a@gmail.com` y `ana+b@yahoo.com`) darían ambas `'ana'` y se marcarían
 * como iguales. Aquí el dominio se conserva y se compara completo.
 *
 * Reglas, en orden:
 *  1. minúsculas y sin espacios en los extremos;
 *  2. se corta la parte local en el primer `+` (direccionamiento con alias,
 *     válido en Gmail, Outlook, iCloud, Fastmail…: no cambia de buzón);
 *  3. `googlemail.com` es `gmail.com`;
 *  4. en Gmail los puntos de la parte local no cuentan — SOLO en Gmail: en otros
 *     proveedores `ana.lopez` y `analopez` son buzones distintos.
 *
 * Devuelve `null` si no parece un correo (sin `@`, sin parte local, sin
 * dominio): quien llama trata `null` como «no se puede afirmar que sea el mismo».
 */
export function normalizeEmailForAbuse(email: string): string | null {
  const trimmed = email.trim().toLowerCase();
  const at = trimmed.lastIndexOf('@');
  if (at <= 0 || at === trimmed.length - 1) return null;

  let local = trimmed.slice(0, at);
  let domain = trimmed.slice(at + 1);

  const plus = local.indexOf('+');
  if (plus >= 0) local = local.slice(0, plus);

  if (domain === 'googlemail.com') domain = 'gmail.com';
  if (domain === 'gmail.com') local = local.replace(/\./g, '');

  if (local.length === 0 || domain.length === 0) return null;
  return `${local}@${domain}`;
}
