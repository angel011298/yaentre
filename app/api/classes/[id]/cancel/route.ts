import { jsonOk, readJson } from '@/lib/api/respond';
import { idFrom, studentRoute } from '@/lib/api/route-context';
import { cancelClassAndRefund } from '@/lib/classes/cancellation';
import { classRuntimeDeps } from '@/lib/classes/runtime';
import { cancelSchema } from '@/lib/classes/schemas';

/**
 * POST /api/classes/{id}/cancel (spec §11). ≥24 h → 100%; <24 h → 50%. La
 * política vive en `computeCancellation`; el alumno solo cancela SUS clases (la
 * consulta cruza el id con el dueño de la sesión).
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = studentRoute('classes.cancel', { rateLimit: 'CLASS_ACTION' }, async (ctx, request, params) => {
  const body = cancelSchema.parse((await readJson(request)) ?? {});
  const { refundCents } = await cancelClassAndRefund(
    {
      classId: idFrom(params),
      actor: { kind: 'STUDENT', studentProfileId: ctx.profile.id },
      cause: 'STUDENT_REQUEST',
      reasonText: body.reason,
    },
    classRuntimeDeps()
  );
  return jsonOk({ refundCents });
});
