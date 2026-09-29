import { jsonOk } from '@/lib/api/respond';
import { teacherRoute } from '@/lib/api/route-context';
import { listTeacherClasses } from '@/lib/db/classes';

/** GET /api/teachers/me/classes (spec §11): sus clases. Ve su parte, no el precio del alumno; del alumno, solo el primer nombre. */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = teacherRoute('teachers.me.classes', { statuses: ['ACTIVE', 'INACTIVE'] }, async (ctx) =>
  jsonOk(await listTeacherClasses(ctx.teacher.id, new Date()))
);
