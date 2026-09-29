import { errorResponse, readJson, resultResponse } from '@/lib/api/respond';
import { suspendTeacherAdmin } from '@/lib/teachers/admin-service';

/**
 * PATCH /api/admin/teachers/{id}/suspend (spec §11). Admin MAESTRO, con motivo. Toda
 * la verificación (rol, id, bitácora, límite de tasa) vive en el servicio, que
 * también usa la Server Action: esta ruta no repite ni omite nada.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(request: Request, route: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await route.params;
    const body = ((await readJson(request)) ?? {}) as { reason?: unknown };
    return resultResponse(await suspendTeacherAdmin({ teacherId: id, reason: body.reason }));
  } catch (err) {
    return errorResponse(err, { route: 'admin.teachers.suspend' });
  }
}
