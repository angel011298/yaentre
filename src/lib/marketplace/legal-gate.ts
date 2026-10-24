/**
 * G103 — CANDADO DE TEXTOS LEGALES PENDIENTES. Módulo PURO.
 *
 * El marketplace depende de textos que produce el CLO y que todavía no
 * existen: contrato de comisión mercantil del profesor, NDA, política de
 * grabación, condiciones de contenido de cursos, T&C de cursos y la
 * declaración/consentimiento de mayoría de edad. Cada uno vive en el código
 * con una VERSIÓN que empieza por `TODO-CLO` hasta que se integre el texto.
 *
 * Mismo aprendizaje que G98: un aviso en un documento no es un cierre. Si
 * alguien enciende una bandera del marketplace en PRODUCCIÓN antes de tener
 * los textos, la acción que los necesita se RECHAZA en el servidor (y se
 * reporta a Sentry). Fuera de producción (local, preview) se permite, para
 * poder construir y probar el flujo completo.
 */
export function isPendingLegalVersion(version: string): boolean {
  return version.startsWith('TODO-CLO');
}

export type LegalGate = { ok: true } | { ok: false; pending: string[] };

export function evaluateLegalGate(versions: string[], vercelEnv: string | undefined): LegalGate {
  if (vercelEnv !== 'production') return { ok: true };
  const pending = versions.filter(isPendingLegalVersion);
  return pending.length === 0 ? { ok: true } : { ok: false, pending };
}

export const LEGAL_PENDING_MESSAGE =
  'Esta función todavía no está disponible. Estamos terminando los documentos que la acompañan.';
