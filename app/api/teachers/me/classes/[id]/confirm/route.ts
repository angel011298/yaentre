import { jsonOk } from '@/lib/api/respond';
import { idFrom, teacherRoute } from '@/lib/api/route-context';
import { confirmClass } from '@/lib/db/classes';

/** POST /api/teachers/me/classes/{id}/confirm (spec §11): confirma su asistencia (BOOKED → CONFIRMED). */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = teacherRoute(
  'teachers.class.confirm',
  { statuses: ['ACTIVE', 'INACTIVE'], rateLimit: 'TEACHER_CLASS_ACTION' },
  async (ctx, _req, params) => {
    await confirmClass(ctx.teacher.id, idFrom(params), new Date());
    return jsonOk({ confirmed: true });
  }
);
