import { trackServerEvent } from '@/lib/analytics/server';
import { logAdminAction } from '@/lib/admin/audit-log';
import { beginMarketplaceAdminAction } from '@/lib/admin/marketplace-guard';
import {
  adminTeacherIdSchema,
  adminTeacherListSchema,
  adminTeacherTargetSchema,
  type ActionResult,
} from '@/lib/admin/schemas';
import { requireRole } from '@/lib/auth/guards';
import { cancelClassAndRefund } from '@/lib/classes/cancellation';
import { MarketplaceError } from '@/lib/classes/errors';
import { classRuntimeDeps } from '@/lib/classes/runtime';
import { getAuthEmail } from '@/lib/db/auth-users';
import { listUpcomingCancellableClassIds } from '@/lib/db/classes';
import {
  approveTeacher,
  getTeacherContact,
  listTeachersAdmin,
  reactivateTeacher,
  suspendTeacher,
} from '@/lib/db/teachers';
import { sendEmail } from '@/lib/email/client';
import { teacherApprovedEmail } from '@/lib/email/templates';
import { reportSilentDegradation } from '@/lib/observability/report';
import { teacherDashboardUrl } from './service';

/**
 * ADMINISTRACIÓN DE PROFESORES — Bloque 2. Una sola implementación que usan las
 * Server Actions de `/admin/profesores` y los Route Handlers de
 * `/api/admin/teachers/*`, para que las reglas no puedan divergir entre las dos
 * puertas de entrada.
 *
 * Todas cumplen las cuatro condiciones de la excepción autorizada de G99 (ver
 * `beginMarketplaceAdminAction`) y exigen ADMIN MAESTRO: decidir quién puede dar
 * clases —y cobrar por ellas— es de la misma clase que regalar un plan.
 *
 * Este archivo NO es `'use server'`: exporta funciones que reciben el `input`
 * crudo, y un archivo `'use server'` convierte cada export en un endpoint. Los
 * archivos de acciones son envoltorios delgados.
 */

type Result<T> = Promise<ActionResult<T>>;

function failure(err: unknown): ActionResult<never> {
  if (err instanceof MarketplaceError) return { ok: false, code: err.code, message: err.message };
  reportSilentDegradation('marketplace_api', err, { area: 'admin-teachers' });
  return { ok: false, code: 'UNKNOWN', message: 'Algo salió mal. Intenta de nuevo.' };
}

export async function approveTeacherAdmin(input: unknown): Result<{ status: 'ACTIVE' }> {
  const begun = await beginMarketplaceAdminAction('teacher.approved', adminTeacherTargetSchema, input, {
    requireMaster: true,
  });
  if (!begun.ok) return begun.result;
  const { actor, data } = begun;

  try {
    const contact = await getTeacherContact(data.teacherId);
    if (!contact) throw new MarketplaceError('NOT_FOUND', 'No encontramos a ese profesor.');
    await approveTeacher(data.teacherId, new Date());

    await logAdminAction('teacher.approved', actor, {
      targetKind: 'teacher',
      reason: data.reason,
      metadata: { teacherId: data.teacherId },
    });

    // Aviso y medición: mejor esfuerzo, la aprobación ya es un hecho.
    const to = await getAuthEmail(contact.userProfileId).catch(() => null);
    if (to) await sendEmail({ to, ...teacherApprovedEmail({ publicName: contact.publicName, dashboardUrl: teacherDashboardUrl() }) });
    await trackServerEvent(contact.userProfileId, 'teacher_approved', { paymentRail: contact.paymentRail });
    return { ok: true, data: { status: 'ACTIVE' } };
  } catch (err) {
    await logAdminAction('teacher.approved', actor, {
      targetKind: 'teacher',
      reason: data.reason,
      metadata: { teacherId: data.teacherId, denied: err instanceof MarketplaceError ? err.code : 'ERROR' },
      outcome: 'rejected',
    });
    return failure(err);
  }
}

export async function suspendTeacherAdmin(
  input: unknown
): Result<{ status: 'SUSPENDED'; classesCancelled: number; classesFailed: number }> {
  const begun = await beginMarketplaceAdminAction('teacher.suspended', adminTeacherTargetSchema, input, {
    requireMaster: true,
  });
  if (!begun.ok) return begun.result;
  const { actor, data } = begun;

  try {
    const now = new Date();
    await suspendTeacher(data.teacherId, data.reason, now);

    // Sus clases futuras se cancelan con reembolso completo: el alumno no se
    // queda con una clase de un profesor que ya no puede darla. Cada una es
    // independiente: una que falle NO impide las demás, y se cuenta.
    let classesCancelled = 0;
    let classesFailed = 0;
    for (const classId of await listUpcomingCancellableClassIds(data.teacherId, now)) {
      try {
        await cancelClassAndRefund(
          { classId, actor: { kind: 'SYSTEM' }, cause: 'TEACHER_REQUEST', reasonText: 'Profesor suspendido' },
          classRuntimeDeps(now)
        );
        classesCancelled += 1;
      } catch (err) {
        classesFailed += 1;
        reportSilentDegradation('class_lifecycle', err, { stage: 'suspend_cancel', classId });
      }
    }

    await logAdminAction('teacher.suspended', actor, {
      targetKind: 'teacher',
      reason: data.reason,
      metadata: { teacherId: data.teacherId, classesCancelled, classesFailed },
    });
    return { ok: true, data: { status: 'SUSPENDED', classesCancelled, classesFailed } };
  } catch (err) {
    await logAdminAction('teacher.suspended', actor, {
      targetKind: 'teacher',
      reason: data.reason,
      metadata: { teacherId: data.teacherId, denied: err instanceof MarketplaceError ? err.code : 'ERROR' },
      outcome: 'rejected',
    });
    return failure(err);
  }
}

export async function reactivateTeacherAdmin(input: unknown): Result<{ status: 'ACTIVE' }> {
  const begun = await beginMarketplaceAdminAction('teacher.reactivated', adminTeacherTargetSchema, input, {
    requireMaster: true,
  });
  if (!begun.ok) return begun.result;
  const { actor, data } = begun;

  try {
    await reactivateTeacher(data.teacherId);
    await logAdminAction('teacher.reactivated', actor, {
      targetKind: 'teacher',
      reason: data.reason,
      metadata: { teacherId: data.teacherId },
    });
    return { ok: true, data: { status: 'ACTIVE' } };
  } catch (err) {
    await logAdminAction('teacher.reactivated', actor, {
      targetKind: 'teacher',
      reason: data.reason,
      metadata: { teacherId: data.teacherId, denied: err instanceof MarketplaceError ? err.code : 'ERROR' },
      outcome: 'rejected',
    });
    return failure(err);
  }
}

/** Listado para la revisión: ADMIN (no hace falta maestro), solo datos NO sensibles (sin CURP ni CLABE). */
export async function listTeachersForAdmin(input: unknown) {
  await requireRole('ADMIN');
  const parsed = adminTeacherListSchema.parse(input ?? {});
  return listTeachersAdmin(parsed);
}

/**
 * Ruta de la constancia de un profesor, para que el admin MAESTRO la abra. La
 * lectura queda en la bitácora ANTES de entregar el acceso: ver los documentos
 * fiscales de una persona es justo lo que se audita.
 */
export async function resolveCsfPathForAdmin(input: unknown): Result<{ path: string }> {
  const begun = await beginMarketplaceAdminAction('teacher.csf_viewed', adminTeacherIdSchema, input, {
    requireMaster: true,
  });
  if (!begun.ok) return begun.result;
  const { actor, data } = begun;

  const contact = await getTeacherContact(data.teacherId);
  const path = contact?.csfDocumentUrl ?? null;
  await logAdminAction('teacher.csf_viewed', actor, {
    targetKind: 'teacher',
    metadata: { teacherId: data.teacherId, found: path !== null },
    outcome: path ? 'applied' : 'rejected',
  });
  if (!path) return { ok: false, code: 'NOT_FOUND', message: 'Ese profesor no subió constancia.' };
  return { ok: true, data: { path } };
}
