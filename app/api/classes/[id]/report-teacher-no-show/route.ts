import { jsonOk } from '@/lib/api/respond';
import { idFrom, studentRoute } from '@/lib/api/route-context';
import { settleCancellation } from '@/lib/classes/cancellation';
import { classRuntimeDeps } from '@/lib/classes/runtime';
import { declareTeacherNoShow } from '@/lib/db/classes';

/**
 * POST /api/classes/{id}/report-teacher-no-show — el alumno declara que su
 * profesor no se presentó (solo pasada la gracia de 15 min). Reembolso completo
 * y cuenta contra el profesor. Es una declaración UNILATERAL: queda en el
 * historial para revisión del admin (ver RETORNO_BLOQUE2.md).
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = studentRoute('classes.teacher-no-show', { rateLimit: 'CLASS_ACTION' }, async (ctx, _req, params) => {
  const deps = classRuntimeDeps();
  const result = await declareTeacherNoShow(ctx.profile.id, idFrom(params), deps.now);
  await settleCancellation(result, deps);
  return jsonOk({ refundCents: result.outcome.refundCents });
});
