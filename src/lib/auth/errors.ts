export type AuthErrorCode = 'UNAUTHORIZED' | 'FORBIDDEN' | 'PAYWALL';

/**
 * Error tipado para los guards de autorización. `code` permite a quien la
 * consume (Server Action, Route Handler, Server Component) decidir cómo
 * responder sin parsear el mensaje.
 */
export class AuthError extends Error {
  code: AuthErrorCode;
  /**
   * G100 — sesión válida pero sin el segundo factor (aal1 con un TOTP
   * verificado). Sigue siendo `UNAUTHORIZED` a propósito: todo consumidor
   * existente ya lo trata como «manda a /login», y `/login` reenvía al reto
   * de 2FA cuando ve una sesión a medias. Ningún llamador tiene que aprender
   * un código nuevo para quedar protegido.
   */
  mfaRequired: boolean;

  constructor(code: AuthErrorCode, message: string, options: { mfaRequired?: boolean } = {}) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
    this.mfaRequired = options.mfaRequired ?? false;
  }
}
