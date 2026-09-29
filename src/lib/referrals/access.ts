/**
 * QUIÉN PUEDE USAR «INVITA Y GANA» — Bloque 3.
 *
 * Cualquier alumno o tutor (spec §2, Nivel 1: «cualquier usuario, alumno o padre,
 * incluidos menores»). ADMIN también, porque un admin usa `/app` como alumno. Los
 * roles de PERSONAL que no tienen espacio de alumno (contador y soporte) no: su
 * cuenta es de trabajo, y un código de referido a su nombre no significa nada.
 */
export const REFERRAL_ROLES = ['STUDENT', 'PARENT', 'ADMIN'] as const;

export type ReferralRole = (typeof REFERRAL_ROLES)[number];

export function canUseReferrals(role: string | null | undefined): boolean {
  return (REFERRAL_ROLES as readonly string[]).includes(role ?? '');
}
