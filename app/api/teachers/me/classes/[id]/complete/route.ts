import { jsonOk } from '@/lib/api/respond';
import { idFrom, teacherRoute } from '@/lib/api/route-context';
import { notifyLevelUp } from '@/lib/classes/notify';
import { completeClass } from '@/lib/db/classes';

/**
 * POST /api/teachers/me/classes/{id}/complete — el profesor marca la clase como
 * impartida (solo cuando está por terminar). Es la evidencia con la que se le
 * liquida, y el alumno conserva 48 h para disputarla.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = teacherRoute(
  'teachers.class.complete',
  { statuses: ['ACTIVE', 'INACTIVE'], rateLimit: 'TEACHER_CLASS_ACTION' },
  async (ctx, _req, params) => {
    const level = await completeClass(ctx.teacher.id, idFrom(params), new Date());
    if (level.promotedTo) await notifyLevelUp(level.teacherId, level.promotedTo);
    return jsonOk({ completed: true });
  }
);
