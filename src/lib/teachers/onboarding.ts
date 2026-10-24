import type { TeacherPaymentRail } from '@prisma/client';

/**
 * G103 — validaciones del alta de profesor (spec del marketplace §3). PURO.
 *
 * Solo FORMA: que la CURP, la CLABE y el RFC estén bien construidos. La
 * verificación de identidad y de la constancia fiscal la hace el admin al
 * revisar la solicitud (`PENDING_REVIEW` → `ACTIVE`). Estos valores son datos
 * personales sensibles: nunca se registran en logs ni se devuelven completos
 * a una pantalla (ver `maskTail`).
 */

export function normalizeId(value: string): string {
  return value.normalize('NFC').toUpperCase().replace(/\s+/g, '');
}

/** CURP: 18 caracteres con la estructura oficial (RENAPO). */
export function isValidCurp(value: string): boolean {
  return /^[A-Z][AEIOUX][A-Z]{2}\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])[HMX][A-Z]{2}[B-DF-HJ-NP-TV-Z]{3}[A-Z\d]\d$/.test(
    normalizeId(value)
  );
}

/**
 * CLABE: 18 dígitos y dígito verificador correcto (pesos 3, 7, 1 sobre los 17
 * primeros, módulo 10 — algoritmo de Banxico). Un error de dedo en una CLABE
 * manda la liquidación a otra cuenta o la rebota; el dígito verificador
 * atrapa casi todos.
 */
export function isValidClabe(value: string): boolean {
  const digits = value.replace(/\s+/g, '');
  if (!/^\d{18}$/.test(digits)) return false;
  const weights = [3, 7, 1];
  let sum = 0;
  for (let i = 0; i < 17; i++) sum += (Number(digits[i]) * weights[i % 3]) % 10;
  const control = (10 - (sum % 10)) % 10;
  return control === Number(digits[17]);
}

/** RFC de persona física: 13 caracteres (4 letras, fecha, homoclave). */
export function isValidRfcPersonaFisica(value: string): boolean {
  return /^[A-ZÑ&]{4}\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])[A-Z\d]{3}$/.test(normalizeId(value));
}

/**
 * Carril de pago (spec del marketplace §3.2). Carril A (`COMISION_MERCANTIL`,
 * el profesor factura) SOLO si dijo que puede facturar, dio RFC Y subió la
 * constancia. Cualquier otra combinación → Carril B (asimilados, default).
 */
export function determinePaymentRail(canInvoice: boolean, rfc?: string | null, csfPath?: string | null): TeacherPaymentRail {
  if (canInvoice && rfc && csfPath) return 'COMISION_MERCANTIL';
  return 'ASIMILADOS';
}

/**
 * Versiones de los textos que el profesor acepta al darse de alta.
 * TODO-CLO: contrato de comisión mercantil (adhesión), NDA y política de
 * grabación de clases. Mientras la versión empiece con `TODO-CLO`, en
 * PRODUCCIÓN la solicitud se rechaza (`legal-gate.ts`).
 */
export const TEACHER_LEGAL_VERSIONS = {
  contract: 'TODO-CLO-contrato-comision-mercantil',
  nda: 'TODO-CLO-nda-profesor',
  recording: 'TODO-CLO-politica-grabacion',
} as const;
