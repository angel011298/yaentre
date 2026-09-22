import { reportControlFailure } from '@/lib/observability/report';

/**
 * G99 — COMPUERTA DE ADMIN MAESTRO.
 *
 * El panel tiene dos niveles de privilegio:
 *
 *  · **ADMIN** — pestañas de solo lectura (usuarios, bitácora, ver archivos)
 *    y subida de archivos. Lo da `UserProfile.role`.
 *  · **ADMIN MAESTRO** — además, las acciones DESTRUCTIVAS: alta y baja de
 *    planes, forzar restablecimiento de contraseña, cerrar sesiones, cambiar
 *    rol, y borrar archivos de la bóveda. Lo da la pertenencia a
 *    `MASTER_ADMIN_EMAILS`.
 *
 * La lista vive en el ENTORNO, no en la base ni en el código: promover a
 * alguien a ADMIN desde el propio panel no puede bastar para que se autoconceda
 * el poder de degradar a los demás. Hace falta tocar Vercel, que es una acción
 * del dueño y deja su propio rastro.
 *
 * ── LA REGLA QUE NO SE INVIERTE ────────────────────────────────────────────
 *
 * Variable ausente, vacía o sin entradas válidas ⇒ NINGUNA acción destructiva
 * procede. Nunca al revés. Es la misma lección que G98 dejó en el interruptor
 * de ventas: el default tiene que ser CERRADO, para que olvidar una variable
 * jamás abra una puerta. Y como una configuración incompleta produce un
 * bloqueo que desde fuera se ve igual que "este admin no es maestro", el caso
 * se REPORTA a Sentry — un control que se cierra en silencio es la firma de
 * G73b.
 */

/** Normalización única: minúsculas y sin espacios. Un correo con mayúsculas en
 *  Vercel y minúsculas en Auth es la misma persona. */
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Parsea la lista separada por comas. Puro y total: entrada vacía o basura
 * devuelve lista vacía, nunca lanza.
 */
export function parseMasterAdminList(raw: string | undefined | null): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map(normalizeEmail)
    // Una entrada sin `@` no es un correo: se descarta en vez de convertirse
    // en una llave comodín por accidente (p. ej. una coma de más, o `*`).
    .filter((entry) => entry.length > 0 && entry.includes('@'));
}

/**
 * ¿Este correo es admin maestro, según ESTA lista? Función pura — el entorno
 * no se lee aquí, para que las pruebas enumeren la matriz sin tocar
 * `process.env`.
 */
export function isMasterAdminEmail(
  email: string | null | undefined,
  rawList: string | undefined | null
): boolean {
  const list = parseMasterAdminList(rawList);
  if (list.length === 0) return false;
  if (!email) return false;
  const normalized = normalizeEmail(email);
  if (!normalized.includes('@')) return false;
  return list.includes(normalized);
}

export type MasterAdminVerdict =
  | { ok: true }
  | { ok: false; reason: 'NOT_CONFIGURED' | 'NOT_MASTER' };

/**
 * Decide con la lista dada y explica POR QUÉ cuando deniega. Pura: la
 * distinción entre "no hay lista" y "no estás en ella" es lo que permite
 * reportar la primera sin confundirla con la segunda.
 */
export function evaluateMasterAdmin(
  email: string | null | undefined,
  rawList: string | undefined | null
): MasterAdminVerdict {
  if (parseMasterAdminList(rawList).length === 0) {
    return { ok: false, reason: 'NOT_CONFIGURED' };
  }
  return isMasterAdminEmail(email, rawList) ? { ok: true } : { ok: false, reason: 'NOT_MASTER' };
}

/** Mensaje único de cara al admin. No revela quién SÍ está en la lista. */
export const MASTER_ADMIN_DENIED_MESSAGE =
  'Esta acción está reservada al administrador maestro.';

/**
 * Lee el entorno y decide. Envoltorio impuro de `evaluateMasterAdmin`, usado
 * por las Server Actions. Cuando la lista no está configurada, la acción se
 * deniega Y se reporta: desde la interfaz un bloqueo por "falta la variable"
 * es indistinguible de uno por "no eres maestro", y esa indistinguibilidad es
 * justo lo que dejó el limitador de G65 muerto durante meses.
 */
export function requireMasterAdmin(email: string | null | undefined): MasterAdminVerdict {
  const verdict = evaluateMasterAdmin(email, process.env.MASTER_ADMIN_EMAILS);

  if (!verdict.ok && verdict.reason === 'NOT_CONFIGURED') {
    reportControlFailure(
      'master_admin_gate',
      'fail-closed',
      new Error('MASTER_ADMIN_EMAILS ausente o vacía: toda acción destructiva queda bloqueada.'),
      { configured: false }
    );
  }

  return verdict;
}
