export type AuthErrorCode = 'UNAUTHORIZED' | 'FORBIDDEN' | 'PAYWALL';

/**
 * Error tipado para los guards de autorización. `code` permite a quien la
 * consume (Server Action, Route Handler, Server Component) decidir cómo
 * responder sin parsear el mensaje.
 */
export class AuthError extends Error {
  code: AuthErrorCode;

  constructor(code: AuthErrorCode, message: string) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
  }
}
