import { jsonOk, readJson } from '@/lib/api/respond';
import { idFrom, studentRoute } from '@/lib/api/route-context';
import { alertAdmins } from '@/lib/classes/notify';
import { formatClassWhen } from '@/lib/classes/format';
import { disputeSchema } from '@/lib/classes/schemas';
import { disputeClass } from '@/lib/db/classes';

/** POST /api/classes/{id}/dispute — el alumno reporta un problema de una clase «impartida». Congela el pago del profesor y avisa al admin. */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = studentRoute('classes.dispute', { rateLimit: 'CLASS_ACTION' }, async (ctx, request, params) => {
  const body = disputeSchema.parse(await readJson(request));
  const classId = idFrom(params);
  const cls = await disputeClass({ studentProfileId: ctx.profile.id, classId, reason: body.reason, now: new Date() });
  await alertAdmins('Clase en disputa', [
    `Clase ${classId}: ${formatClassWhen(cls.scheduledAt)} (${cls.subjectKey})`,
    `Motivo del alumno: ${body.reason}`,
  ]);
  return jsonOk({ disputed: true });
});
