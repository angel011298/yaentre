import { errorResponse, jsonOk } from '@/lib/api/respond';
import { listTeachersForAdmin } from '@/lib/teachers/admin-service';

/** GET /api/admin/teachers (spec §11). ADMIN; sin CURP ni CLABE (esos solo salen por la revisión de un admin maestro, auditada). */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    return jsonOk(await listTeachersForAdmin(Object.fromEntries(new URL(request.url).searchParams)));
  } catch (err) {
    return errorResponse(err, { route: 'admin.teachers' });
  }
}
