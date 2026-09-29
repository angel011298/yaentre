import { jsonOk } from '@/lib/api/respond';
import { idFrom, teacherRoute } from '@/lib/api/route-context';
import { settleCancellation } from '@/lib/classes/cancellation';
import { classRuntimeDeps } from '@/lib/classes/runtime';
import { declareStudentNoShow } from '@/lib/db/classes';

/** POST /api/teachers/me/classes/{id}/student-no-show — el alumno no llegó (pasados 15 min del inicio). Sin reembolso (SUPUESTO; ver RETORNO_BLOQUE2.md). */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = teacherRoute(
  'teachers.class.student-no-show',
  { statuses: ['ACTIVE', 'INACTIVE'], rateLimit: 'TEACHER_CLASS_ACTION' },
  async (ctx, _req, params) => {
    const deps = classRuntimeDeps();
    const result = await declareStudentNoShow(ctx.teacher.id, idFrom(params), deps.now);
    await settleCancellation(result, deps);
    return jsonOk({ recorded: true });
  }
);
