export type AdminErrorCode = 'NOT_FOUND' | 'VALIDATION';

/**
 * Error tipado para las operaciones de administración de contenido (CC-06).
 * Análogo a SessionError (src/lib/db/sessions.ts): permite a la Server Action
 * mapear el error a un código legible sin filtrar detalles internos.
 */
export class AdminError extends Error {
  code: AdminErrorCode;

  constructor(code: AdminErrorCode, message: string) {
    super(message);
    this.name = 'AdminError';
    this.code = code;
  }
}
