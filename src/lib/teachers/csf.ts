import { CSF_PATH_RE } from './onboarding';

/**
 * Constancia de Situación Fiscal (CSF) del profesor — Bloque 2. Módulo PURO.
 *
 * La CSF la sube quien contesta «Sí, puedo facturar» (Carril A). Es un documento
 * fiscal con datos personales, así que va a un bucket PRIVADO (`teacher-docs`,
 * migración 0021) y su ruta sale del servidor, nunca del cliente:
 *
 *     <UID de Supabase Auth de quien sube>/<uuid aleatorio>.pdf
 *
 * La lista blanca vive AQUÍ y no en el bucket: ahí un rechazo del proveedor sale
 * como un error genérico; aquí produce un mensaje que la persona puede leer.
 */

export const CSF_BUCKET = 'teacher-docs';
/** 5 MB: una CSF real pesa decenas de KB; más que esto no es una constancia. */
export const CSF_MAX_BYTES = 5 * 1024 * 1024;

export type CsfRejection = 'EMPTY' | 'TOO_LARGE' | 'NOT_PDF';

/**
 * Valida el archivo por su CONTENIDO, no por lo que declara el navegador:
 * `type` y el nombre los controla el cliente, la firma `%PDF-` de los primeros
 * bytes no se puede cambiar sin que deje de abrir como PDF. Sin esto, un
 * `informe.html` renombrado a `.pdf` acabaría en el bucket con una extensión
 * de confianza (misma lección que la bóveda, G99).
 */
export function validateCsfFile(input: {
  sizeBytes: number;
  declaredType: string;
  head: Uint8Array;
}): { ok: true } | { ok: false; reason: CsfRejection } {
  if (!Number.isFinite(input.sizeBytes) || input.sizeBytes <= 0) return { ok: false, reason: 'EMPTY' };
  if (input.sizeBytes > CSF_MAX_BYTES) return { ok: false, reason: 'TOO_LARGE' };
  if (input.declaredType !== 'application/pdf') return { ok: false, reason: 'NOT_PDF' };
  const magic = [0x25, 0x50, 0x44, 0x46, 0x2d]; // "%PDF-"
  if (input.head.length < magic.length || !magic.every((b, i) => input.head[i] === b)) {
    return { ok: false, reason: 'NOT_PDF' };
  }
  return { ok: true };
}

export const CSF_REJECTION_MESSAGES: Record<CsfRejection, string> = {
  EMPTY: 'El archivo está vacío. Selecciona tu constancia en PDF.',
  TOO_LARGE: 'El archivo pesa más de 5 MB. Descarga de nuevo tu constancia del SAT (suele pesar muy poco).',
  NOT_PDF: 'Sube tu Constancia de Situación Fiscal en formato PDF.',
};

/** Ruta del objeto: `<uid>/<uuid>.pdf`. El `uuid` lo genera el servidor con `crypto.randomUUID()`. */
export function buildCsfPath(authUserId: string, uuid: string): string {
  return `${authUserId}/${uuid}.pdf`;
}

/**
 * ¿La ruta que llega en la solicitud es DE ESTA PERSONA? Debe tener la forma
 * exacta y su primera carpeta debe ser el UID de quien envía. Sin esto, un
 * profesor podría declarar como suya la constancia de otro (cuya ruta viera por
 * cualquier vía) y heredar su RFC verificado.
 */
export function csfPathBelongsTo(path: string, authUserId: string): boolean {
  return CSF_PATH_RE.test(path) && path.startsWith(`${authUserId}/`);
}
