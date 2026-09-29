import { idFrom, studentRoute } from '@/lib/api/route-context';
import { jsonOk } from '@/lib/api/respond';
import { MarketplaceError } from '@/lib/classes/errors';
import { getPublicTeacher } from '@/lib/db/teachers';

/** GET /api/classes/teachers/{id} — perfil público. Un profesor no ACTIVO es 404, no «suspendido». */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = studentRoute(
  'classes.teacher',
  { rateLimit: 'DIRECTORY_READ', requirePremium: true, requireOpen: true },
  async (_ctx, _request, params) => {
    const teacher = await getPublicTeacher(idFrom(params));
    if (!teacher) throw new MarketplaceError('NOT_FOUND', 'Ese profesor ya no está disponible.');
    return jsonOk(teacher);
  }
);
