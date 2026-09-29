/**
 * ROLES DE PERSONAL Y SUS CAPACIDADES — Bloque 3. Módulo PURO: sin base de datos,
 * sin sesión, sin `process.env`. Es la única fuente de verdad de «qué puede hacer
 * cada rol», y la matriz completa está enumerada en `tests/admin/capabilities.test.ts`.
 *
 * ── Los tres roles de personal ──────────────────────────────────────────────
 *
 *  · ADMIN       — admin completo: todo el panel `/admin` y, además, lo fiscal y
 *                  lo de soporte. Las acciones DESTRUCTIVAS siguen exigiendo
 *                  ADMIN MAESTRO (`MASTER_ADMIN_EMAILS`, G99): el rol por sí solo
 *                  no las abre.
 *  · ACCOUNTANT  — contador: SOLO LECTURA FISCAL. Ve el tablero fiscal y el monitor
 *                  RESICO. No ve cuentas, ni la bóveda, ni la bitácora, ni el banco
 *                  de reactivos, y no puede ejecutar NINGUNA acción.
 *  · SUPPORT     — soporte: atiende ARCO y reembolsos. Ve la ficha de una cuenta
 *                  (sin el panel de administración) y puede exportar sus datos,
 *                  retirar su consentimiento de marketing y emitir el reembolso de
 *                  la válvula de 48 h. Nada fiscal ni de contenido.
 *
 * ── Por qué las páginas nuevas NO cuelgan de `/admin` ───────────────────────
 *
 * `app/admin/layout.tsx` exige ADMIN y cada página de `/admin` se apoya en él.
 * Si el layout admitiera a los roles nuevos, TODA página de `/admin` que hoy
 * confía en el layout (bitácora, bóveda, usuarios, reactivos…) quedaría abierta
 * a un contador o a soporte sin que nadie tocara esas páginas: el mismo error de
 * «un layout no protege» pero al revés. Por eso lo fiscal vive en `/fiscal` y lo
 * de soporte en `/soporte`, con layouts propios, y `/admin` queda EXACTAMENTE
 * como estaba (por defecto, negado). Además, cada página, ruta y acción nueva
 * llama a su guard por su cuenta.
 *
 * ── Lo que un rol de personal NO es ────────────────────────────────────────
 *
 * `is_admin()` en la base (RLS) reconoce solo a ADMIN: contador y soporte no
 * pueden leer nada por `/rest/v1` con su sesión. Toda su lectura pasa por la app,
 * detrás de estas capacidades.
 */

export const STAFF_ROLES = ['ADMIN', 'ACCOUNTANT', 'SUPPORT'] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export const CAPABILITIES = [
  /** Todo el panel `/admin`. Se aplica con `requireRole('ADMIN')` en cada página y acción existente. */
  'admin.panel',
  /** Tablero fiscal (`/fiscal`), monitor RESICO y sus endpoints. Solo lectura. */
  'fiscal.read',
  /** Buscar una cuenta y ver su ficha de soporte (sin el panel de administración). */
  'users.read',
  /** ARCO: exportar los datos de un titular y retirar su consentimiento de marketing. */
  'arco.handle',
  /** Emitir el reembolso de la válvula de 48 h. Más allá de la válvula, solo admin maestro. */
  'refunds.issue',
] as const;
export type Capability = (typeof CAPABILITIES)[number];

/** La matriz. Un rol que no aparece aquí (STUDENT, PARENT, cualquiera futuro) no tiene NINGUNA capacidad. */
const MATRIX: Record<StaffRole, readonly Capability[]> = {
  ADMIN: ['admin.panel', 'fiscal.read', 'users.read', 'arco.handle', 'refunds.issue'],
  ACCOUNTANT: ['fiscal.read'],
  SUPPORT: ['users.read', 'arco.handle', 'refunds.issue'],
};

export function isStaffRole(role: string | null | undefined): role is StaffRole {
  return typeof role === 'string' && (STAFF_ROLES as readonly string[]).includes(role);
}

export function capabilitiesOf(role: string | null | undefined): readonly Capability[] {
  return isStaffRole(role) ? MATRIX[role] : [];
}

/** ¿Este rol tiene esta capacidad? Falso para cualquier rol que no sea de personal, y para un rol desconocido. */
export function roleHasCapability(role: string | null | undefined, capability: Capability): boolean {
  return capabilitiesOf(role).includes(capability);
}

/** Etiqueta legible del rol, para la interfaz. */
export const ROLE_LABELS: Record<string, string> = {
  STUDENT: 'Alumno',
  PARENT: 'Tutor',
  ADMIN: 'Administrador',
  ACCOUNTANT: 'Contador',
  SUPPORT: 'Soporte',
};

/**
 * A dónde manda el inicio de sesión a cada rol cuando no hay un destino explícito.
 * Los roles de personal NO tienen onboarding de alumno: mandarlos a `/app` los
 * dejaría atrapados en el asistente (misma clase de error que G10 con el tutor).
 * ADMIN conserva `/app`, como hasta ahora: ya tiene su onboarding y entra a
 * `/admin` por su cuenta.
 */
export function postLoginPath(role: string | null | undefined): string {
  switch (role) {
    case 'PARENT':
      return '/tutor';
    case 'ACCOUNTANT':
      return '/fiscal';
    case 'SUPPORT':
      return '/soporte';
    default:
      return '/app';
  }
}

/** ¿Es un rol que NUNCA debe entrar a `/app` (el espacio del alumno)? Sus destinos propios van en `postLoginPath`. */
export function isNonStudentRole(role: string | null | undefined): boolean {
  return role === 'PARENT' || role === 'ACCOUNTANT' || role === 'SUPPORT';
}

// ─────────────────────────── Reembolsos: quién puede qué ───────────────────────────

/**
 * Reglas de la válvula de reembolso (handoff §3.1: «48 h con consumo cero, no
 * publicada como derecho, discrecional»). Puro, para enumerarlo entero:
 *
 *  · SOPORTE solo actúa DENTRO de la válvula (≤ 48 h desde el cobro y sin
 *    consumo). Fuera de ella, un reembolso es una decisión de dinero que no se le
 *    delega a quien atiende tickets.
 *  · ADMIN y SOPORTE-fuera-de-válvula necesitan ADMIN MAESTRO.
 *  · ACCOUNTANT, STUDENT, PARENT y cualquier otro rol: nunca.
 */
export type RefundDenial =
  | 'ROLE_NOT_ALLOWED'
  | 'MASTER_REQUIRED'
  | 'OUTSIDE_VALVE';

export function evaluateRefundAuthority(input: {
  role: string | null | undefined;
  isMaster: boolean;
  insideValve: boolean;
}): { allowed: true } | { allowed: false; reason: RefundDenial } {
  if (!roleHasCapability(input.role, 'refunds.issue')) return { allowed: false, reason: 'ROLE_NOT_ALLOWED' };

  if (input.role === 'SUPPORT') {
    // Soporte solo dentro de la válvula; un maestro que también tenga el rol de soporte no cambia esto:
    // los correos maestros son cuentas ADMIN, no de soporte.
    return input.insideValve ? { allowed: true } : { allowed: false, reason: 'OUTSIDE_VALVE' };
  }

  // ADMIN: siempre con maestro, dentro o fuera de la válvula (mover dinero es destructivo, G99).
  return input.isMaster ? { allowed: true } : { allowed: false, reason: 'MASTER_REQUIRED' };
}
