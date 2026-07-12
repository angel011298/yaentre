/**
 * Registro de auditoría mínimo para acciones de administración de contenido
 * (CC-06). NO se agregó ninguna tabla ni columna al schema (restricción
 * explícita de la sesión): el "quién y cuándo" se registra como un log
 * estructurado en la propia Server Action, no como estado persistido.
 *
 * En producción, `console.log` en una Server Action de Vercel llega a los
 * logs de la función (inspeccionables desde el dashboard / `vercel logs`).
 * El prefijo `[ADMIN_AUDIT]` facilita filtrarlos. Si más adelante se necesita
 * un historial persistente y consultable (p. ej. para disputas de contenido),
 * la vía correcta es un ALTER explícito (tabla `AdminAuditLog`), fuera del
 * alcance de esta sesión.
 */

export type AdminAuditEvent =
  | 'question.approved'
  | 'question.rejected'
  | 'question.updated'
  | 'question.reports_resolved';

export interface AdminActor {
  userProfileId: string;
  email: string | null | undefined;
}

export function logAdminAction(
  event: AdminAuditEvent,
  actor: AdminActor,
  details: Record<string, unknown> = {},
): void {
  const entry = {
    event,
    adminUserProfileId: actor.userProfileId,
    adminEmail: actor.email ?? null,
    at: new Date().toISOString(),
    ...details,
  };
  console.log(`[ADMIN_AUDIT] ${JSON.stringify(entry)}`);
}
