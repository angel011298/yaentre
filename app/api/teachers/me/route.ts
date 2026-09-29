import { jsonError, jsonOk, readJson } from '@/lib/api/respond';
import { teacherRoute } from '@/lib/api/route-context';
import { getOwnTeacherView } from '@/lib/db/teachers';
import { parseTeacherUpdate, patchOwnTeacher } from '@/lib/teachers/service';

/**
 * GET/PATCH /api/teachers/me (spec §11). El profesor sale de la SESIÓN: no hay
 * un `id` en la ruta que pueda cambiarse por el de otro. CURP y CLABE salen
 * enmascaradas incluso para su dueño; el PATCH es estricto (ver
 * `buildTeacherUpdateSchema`).
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALL_STATUSES = ['PENDING_REVIEW', 'ACTIVE', 'INACTIVE', 'SUSPENDED'] as const;

export const GET = teacherRoute('teachers.me', { statuses: ALL_STATUSES }, async (ctx) => {
  const view = await getOwnTeacherView(ctx.profile.id);
  return view ? jsonOk(view) : jsonError('NOT_FOUND', 'No encontramos tu perfil de profesor.', 404);
});

export const PATCH = teacherRoute(
  'teachers.me.patch',
  { statuses: ['PENDING_REVIEW', 'ACTIVE', 'INACTIVE'], rateLimit: 'TEACHER_UPDATE' },
  async (ctx, request) => {
    const parsed = parseTeacherUpdate(await readJson(request));
    if (!parsed.ok) return jsonError('VALIDATION', parsed.message, 400);
    const { clabeChanged } = await patchOwnTeacher(
      { userProfileId: ctx.profile.id, authUserId: ctx.authUser.id, email: ctx.authUser.email },
      ctx.teacher,
      parsed.data
    );
    return jsonOk({ updated: true, clabeChanged });
  }
);
