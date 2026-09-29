import { getSiteUrl } from '@/lib/auth/site-url';
import { parseMasterAdminList } from '@/lib/admin/master';
import { getClassNotifyContext, type CancelResult, type ClassNotifyContext } from '@/lib/db/classes';
import { getAuthEmails } from '@/lib/db/auth-users';
import { prisma } from '@/lib/db/prisma';
import { sendEmail } from '@/lib/email/client';
import {
  adminAlertEmail,
  classBookedTeacherEmail,
  classCancelledEmail,
  classLinkEmail,
  classUnconfirmedStudentEmail,
  teacherLevelUpEmail,
  confirmClassRequestEmail,
  type EmailContent,
} from '@/lib/email/templates';
import { trackServerEvent } from '@/lib/analytics/server';
import { reportSilentDegradation } from '@/lib/observability/report';
import { SUBJECT_LABELS, isSubjectKey } from '@/lib/teachers/tariff';
import { firstNameOf, formatClassWhen } from './format';

/**
 * AVISOS DE UNA CLASE — Bloque 2. Cada función devuelve si el correo SALIÓ
 * (`true`) o no (`false`): el job del ciclo de vida solo sella «ya avisé» cuando
 * el proveedor aceptó el mensaje, para que un Resend caído no se traduzca en un
 * profesor que nunca supo que tenía que confirmar (G73b: un fallo que devuelve
 * éxito no se puede detectar desde fuera).
 *
 * Nunca lanzan: un correo no puede tumbar un cobro, una cancelación ni el cron.
 */

const subjectLabel = (key: string) => (isSubjectKey(key) ? SUBJECT_LABELS[key] : key);

const teacherPanelUrl = () => `${getSiteUrl()}/profesor`;

async function deliver(userProfileId: string, content: EmailContent, stage: string): Promise<boolean> {
  let email: string | undefined;
  try {
    email = (await getAuthEmails([userProfileId])).get(userProfileId);
  } catch (err) {
    reportSilentDegradation('class_lifecycle', err, { stage: `${stage}:resolve-email` });
    return false;
  }
  if (!email) {
    // Una cuenta sin correo resoluble no es un error del correo: no hay a quién
    // avisar. Se reporta porque un profesor/alumno que nunca se entera es
    // exactamente lo que nadie ve desde fuera.
    reportSilentDegradation('class_lifecycle', new Error('Destinatario sin correo resoluble'), {
      stage,
      userProfileId,
    });
    return false;
  }
  const res = await sendEmail({ to: email, ...content });
  return res.ok;
}

/** Al profesor: llegó una reserva pagada. */
export async function notifyTeacherBooked(ctx: ClassNotifyContext): Promise<boolean> {
  return deliver(
    ctx.teacher.userProfileId,
    classBookedTeacherEmail({
      studentLabel: firstNameOf(ctx.student.displayName),
      subjectLabel: subjectLabel(ctx.subjectKey),
      whenLabel: formatClassWhen(ctx.scheduledAt),
      durationMinutes: ctx.durationMinutes,
      dashboardUrl: teacherPanelUrl(),
    }),
    'class-booked'
  );
}

/** Al profesor: 24 h antes, «confirma que vas a estar». */
export async function sendConfirmationRequest(ctx: ClassNotifyContext): Promise<boolean> {
  return deliver(
    ctx.teacher.userProfileId,
    confirmClassRequestEmail({
      studentLabel: firstNameOf(ctx.student.displayName),
      subjectLabel: subjectLabel(ctx.subjectKey),
      whenLabel: formatClassWhen(ctx.scheduledAt),
      dashboardUrl: teacherPanelUrl(),
    }),
    'confirmation-request'
  );
}

/** Al alumno: el profesor aún no confirma (ya se le avisó). */
export async function sendUnconfirmedNotice(ctx: ClassNotifyContext): Promise<boolean> {
  return deliver(
    ctx.student.profileId,
    classUnconfirmedStudentEmail({
      teacherName: ctx.teacher.publicName,
      subjectLabel: subjectLabel(ctx.subjectKey),
      whenLabel: formatClassWhen(ctx.scheduledAt),
    }),
    'unconfirmed-notice'
  );
}

/** A alumno y profesor: la clase se canceló. Devuelve si salieron los DOS. */
export async function notifyCancellation(result: CancelResult): Promise<boolean> {
  const ctx = await getClassNotifyContext(result.classId);
  if (!ctx) return false;
  const base = {
    subjectLabel: subjectLabel(ctx.subjectKey),
    whenLabel: formatClassWhen(ctx.scheduledAt),
    by: result.cancelledBy,
    refundCents: result.outcome.refundCents,
  } as const;

  // Una reserva que nunca llegó a cobrarse no interesa al profesor: para él la
  // clase nunca existió.
  const teacherKnew = result.paid;
  const [studentOk, teacherOk] = await Promise.all([
    deliver(ctx.student.profileId, classCancelledEmail({ ...base, audience: 'student' }), 'cancel-student'),
    teacherKnew
      ? deliver(ctx.teacher.userProfileId, classCancelledEmail({ ...base, audience: 'teacher' }), 'cancel-teacher')
      : Promise.resolve(true),
  ]);
  return studentOk && teacherOk;
}

/** Enlace de la clase a las dos partes. `true` solo si SALIERON LOS DOS. */
export async function sendMeetingLinks(ctx: ClassNotifyContext, meetingUrl: string): Promise<boolean> {
  const recordingNotice = ctx.recordingConsent
    ? 'Esta clase se graba con el consentimiento registrado al reservarla.'
    : null;
  const when = formatClassWhen(ctx.scheduledAt);
  const subject = subjectLabel(ctx.subjectKey);
  const [studentOk, teacherOk] = await Promise.all([
    deliver(
      ctx.student.profileId,
      classLinkEmail({
        audience: 'student',
        counterpartName: ctx.teacher.publicName,
        subjectLabel: subject,
        whenLabel: when,
        meetingUrl,
        recordingNotice,
      }),
      'meeting-link-student'
    ),
    deliver(
      ctx.teacher.userProfileId,
      classLinkEmail({
        audience: 'teacher',
        counterpartName: firstNameOf(ctx.student.displayName),
        subjectLabel: subject,
        whenLabel: when,
        meetingUrl,
        recordingNotice,
      }),
      'meeting-link-teacher'
    ),
  ]);
  return studentOk && teacherOk;
}

/**
 * Alerta a los administradores maestros. Sin destinatarios configurados NO es un
 * «nada que hacer»: es una alerta que nadie va a leer, así que se reporta.
 */
export async function alertAdmins(title: string, lines: string[]): Promise<boolean> {
  const recipients = parseMasterAdminList(process.env.MASTER_ADMIN_EMAILS);
  if (recipients.length === 0) {
    reportSilentDegradation('class_lifecycle', new Error('Alerta sin destinatarios: MASTER_ADMIN_EMAILS vacía'), {
      title,
    });
    return false;
  }
  const content = adminAlertEmail({ title, lines });
  const results = await Promise.all(recipients.map((to) => sendEmail({ to, ...content })));
  return results.some((r) => r.ok);
}

/**
 * Lo que sigue a una reserva CONFIRMADA POR EL COBRO (la haya aplicado el webhook
 * o la reconciliación): avisar al profesor y medir la demanda. Nunca lanza.
 */
export async function announceBooked(classId: string, method: 'ONE_CLICK' | 'CHECKOUT'): Promise<void> {
  try {
    const ctx = await getClassNotifyContext(classId);
    if (!ctx) return;
    await notifyTeacherBooked(ctx);
    await trackServerEvent(ctx.student.profileId, 'class_booked', {
      subjectKey: ctx.subjectKey,
      durationMinutes: ctx.durationMinutes,
      priceCents: ctx.finalTariffCents,
      method,
    });
  } catch (err) {
    reportSilentDegradation('class_lifecycle', err, { stage: 'announce_booked', classId });
  }
}

/** El profesor subió de nivel (por mérito, al calificar o completar una clase). Nunca lanza. */
export async function notifyLevelUp(teacherId: string, level: 'VERIFICADO' | 'DESTACADO'): Promise<void> {
  try {
    const teacher = await prisma.teacher.findUnique({ where: { id: teacherId }, select: { userProfileId: true } });
    if (!teacher) return;
    await deliver(teacher.userProfileId, teacherLevelUpEmail({ level, dashboardUrl: teacherPanelUrl() }), 'level-up');
    await trackServerEvent(teacher.userProfileId, 'teacher_level_up', { level });
  } catch (err) {
    reportSilentDegradation('class_lifecycle', err, { stage: 'level_up', teacherId });
  }
}
