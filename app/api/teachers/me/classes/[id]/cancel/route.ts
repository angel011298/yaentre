import { jsonOk, readJson } from '@/lib/api/respond';
import { idFrom, teacherRoute } from '@/lib/api/route-context';
import { cancelClassAndRefund } from '@/lib/classes/cancellation';
import { classRuntimeDeps } from '@/lib/classes/runtime';
import { cancelSchema } from '@/lib/classes/schemas';

/** POST /api/teachers/me/classes/{id}/cancel — el profesor cancela: reembolso del 100% al alumno y CUENTA contra su tasa de cancelación. */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = teacherRoute(
  'teachers.class.cancel',
  { statuses: ['ACTIVE', 'INACTIVE'], rateLimit: 'TEACHER_CLASS_ACTION' },
  async (ctx, request, params) => {
    const body = cancelSchema.parse((await readJson(request)) ?? {});
    await cancelClassAndRefund(
      {
        classId: idFrom(params),
        actor: { kind: 'TEACHER', teacherId: ctx.teacher.id },
        cause: 'TEACHER_REQUEST',
        reasonText: body.reason,
      },
      classRuntimeDeps()
    );
    return jsonOk({ cancelled: true });
  }
);
