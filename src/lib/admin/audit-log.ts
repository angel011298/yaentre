import { prisma } from '@/lib/db/prisma';
import { reportSilentDegradation } from '@/lib/observability/report';

/**
 * Bitácora de acciones de administración.
 *
 * ── Qué cambió en G99 ──────────────────────────────────────────────────────
 *
 * Hasta G98 esto era SOLO un `console.log` con prefijo `[ADMIN_AUDIT]`, y su
 * propio comentario decía que un historial consultable exigía un ALTER
 * explícito. G99 hace ese ALTER (migración 0016, tabla `admin_audit_log`):
 * la plataforma trata datos de personas de 15 a 17 años y las acciones que
 * esta fase añade —regalar un plan, darlo de baja, cambiar un rol, cerrar las
 * sesiones de alguien, subir y borrar archivos— necesitan rastro persistente.
 *
 * El `console.log` SE CONSERVA además de la escritura: los logs de la función
 * de Vercel son la evidencia que sobrevive a que la base esté caída justo
 * cuando importa.
 *
 * ── El contrato que hace que la bitácora sirva ──────────────────────────────
 *
 * `logAdminAction` es **async y se espera SIEMPRE antes de responder**. No es
 * un detalle de estilo: si la escritura se dispara sin esperar, una acción
 * puede completarse y devolver éxito mientras su fila se pierde en un rechazo
 * que nadie ve. Un rastro que se escribe "casi siempre" no es un rastro.
 *
 * Por el mismo motivo se registra TAMBIÉN cuando la acción falla por
 * validación o por permisos: el intento es justo lo que interesa auditar.
 */

/** Acciones de contenido, ya existentes desde CC-06. */
type ContentAuditAction =
  | 'question.approved'
  | 'question.approved_with_option'
  | 'question.rejected'
  | 'question.updated'
  | 'question.updated_and_approved'
  | 'question.reports_resolved';

/** Acciones de administración de cuentas y bóveda (G99). */
type AccountAuditAction =
  | 'user.comp_granted'
  | 'user.plan_canceled'
  | 'user.password_reset_forced'
  | 'user.sessions_revoked'
  | 'user.role_changed'
  | 'admin.promoted'
  | 'vault.uploaded'
  | 'vault.viewed'
  | 'vault.downloaded'
  | 'vault.deleted'
  | 'note.created'
  | 'note.deleted';

export type AdminAuditAction = ContentAuditAction | AccountAuditAction;

/**
 * Qué clase de cosa es el objetivo. Permite filtrar la bitácora sin parsear
 * el nombre de la acción.
 */
export type AdminAuditTargetKind = 'question' | 'user' | 'file' | 'system' | 'note';

export interface AdminActor {
  userProfileId: string;
  email: string | null | undefined;
}

export interface AdminAuditDetails {
  targetUserProfileId?: string | null;
  targetKind?: AdminAuditTargetKind;
  reason?: string | null;
  /** Identificadores internos y resultados. NUNCA datos personales ni, por
   *  supuesto, material de contraseñas. */
  metadata?: Record<string, unknown>;
  /** `false` cuando la acción se rechazó (validación, permisos, límite de
   *  tasa). Se registra igual: el intento es lo que interesa auditar. */
  outcome?: 'applied' | 'rejected';
}

export async function logAdminAction(
  action: AdminAuditAction,
  actor: AdminActor,
  details: AdminAuditDetails = {}
): Promise<void> {
  const {
    targetUserProfileId = null,
    targetKind = 'system',
    reason = null,
    metadata = {},
    outcome = 'applied',
  } = details;

  const entry = {
    action,
    adminUserProfileId: actor.userProfileId,
    adminEmail: actor.email ?? null,
    targetUserProfileId,
    targetKind,
    outcome,
    at: new Date().toISOString(),
    ...metadata,
  };
  console.log(`[ADMIN_AUDIT] ${JSON.stringify(entry)}`);

  try {
    await prisma.adminAuditLog.create({
      data: {
        actorUserProfileId: actor.userProfileId,
        actorEmail: actor.email ?? null,
        action,
        targetUserProfileId,
        targetKind,
        reason,
        metadata: { ...metadata, outcome } as object,
      },
    });
  } catch (err) {
    // No se relanza A PROPÓSITO: que la bitácora esté caída no debe revertir
    // una baja de plan que ya se aplicó, ni dejar al admin sin saber qué pasó.
    // Pero tampoco puede quedar en silencio — si esto se dispara, hay acciones
    // de administración ocurriendo SIN rastro, que es exactamente el agujero
    // que esta tabla vino a tapar.
    reportSilentDegradation('admin_audit', err, { action, targetKind, outcome });
  }
}
