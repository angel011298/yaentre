/**
 * G100 — segundo factor (TOTP de Supabase Auth). Módulo PURO, probado en
 * `tests/auth/mfa.test.ts`.
 *
 * Nivel de la sesión: el claim `aal` del JWT de acceso — `aal1` tras la
 * contraseña o Google, `aal2` tras el código. Se lee del token que `getUser()`
 * ya validó contra el servidor de Auth, así que el claim es de fiar y no
 * cuesta otro viaje de red.
 */
export type AssuranceLevel = 'aal1' | 'aal2' | null;

export interface FactorLike {
  factor_type: string;
  status: string;
}

export function aalFromAccessToken(accessToken: string | null | undefined): AssuranceLevel {
  if (!accessToken) return null;
  const payload = accessToken.split('.')[1];
  if (!payload) return null;
  try {
    const json = JSON.parse(
      Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
    ) as { aal?: unknown };
    return json.aal === 'aal1' || json.aal === 'aal2' ? json.aal : null;
  } catch {
    return null;
  }
}

export function hasVerifiedTotp(factors: readonly FactorLike[] | null | undefined): boolean {
  return (factors ?? []).some((f) => f.factor_type === 'totp' && f.status === 'verified');
}

/**
 * ¿Falta el código? Solo si la cuenta TIENE un factor verificado y la sesión
 * aún no llegó a aal2. Un factor sin verificar (inscripción a medias) no
 * cuenta: si contara, abandonar la inscripción dejaría la cuenta bloqueada.
 */
export function needsMfaChallenge(
  aal: AssuranceLevel,
  factors: readonly FactorLike[] | null | undefined
): boolean {
  return hasVerifiedTotp(factors) && aal !== 'aal2';
}

/** Código TOTP de 6 dígitos; tolera espacios que pega una app autenticadora. */
export function normalizeTotpCode(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const code = raw.replace(/\s+/g, '');
  return /^\d{6}$/.test(code) ? code : null;
}
