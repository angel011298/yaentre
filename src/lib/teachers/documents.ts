/**
 * G103 — documentos del profesor (constancia de situación fiscal). PURO.
 * Bucket PRIVADO `teacher-documents` (migración 0021): el profesor sube a su
 * propia carpeta con su sesión; solo un ADMIN puede leer. Nunca URLs públicas.
 */
export const TEACHER_DOCS_BUCKET = 'teacher-documents';
export const CSF_MAX_BYTES = 2 * 1024 * 1024;

/** Firma real de un PDF: `%PDF-` en los primeros bytes. */
export function isPdf(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 5 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  );
}
