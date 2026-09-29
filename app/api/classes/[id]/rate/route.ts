import { jsonOk, readJson } from '@/lib/api/respond';
import { idFrom, studentRoute } from '@/lib/api/route-context';
import { notifyLevelUp } from '@/lib/classes/notify';
import { rateSchema } from '@/lib/classes/schemas';
import { rateClass } from '@/lib/db/classes';

/** POST /api/classes/{id}/rate (spec §11): calificar una clase COMPLETADA, dentro de las 48 h. */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = studentRoute('classes.rate', { rateLimit: 'CLASS_ACTION' }, async (ctx, request, params) => {
  const body = rateSchema.parse(await readJson(request));
  const classId = idFrom(params);
  const level = await rateClass({
    studentProfileId: ctx.profile.id,
    classId,
    rating: body.rating,
    feedback: body.feedback ?? null,
    now: new Date(),
  });
  // El nivel se recalcula al calificar; si subió, se avisa (sin bloquear la respuesta).
  if (level.promotedTo) await notifyLevelUp(level.teacherId, level.promotedTo);
  return jsonOk({ rated: true });
});
