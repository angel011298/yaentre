import { jsonOk } from '@/lib/api/respond';
import { idFrom, studentRoute } from '@/lib/api/route-context';
import { MarketplaceError } from '@/lib/classes/errors';
import { getStudentClass } from '@/lib/db/classes';

/**
 * GET /api/classes/{id} — estado de UNA clase del propio alumno. La pantalla lo
 * consulta tras reservar, hasta que el webhook la pasa a BOOKED. Un id ajeno es
 * 404 (no 403): no se confirma que exista.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = studentRoute('classes.get', { rateLimit: 'DIRECTORY_READ' }, async (ctx, _req, params) => {
  const cls = await getStudentClass(idFrom(params), ctx.profile.id, new Date());
  if (!cls) throw new MarketplaceError('NOT_FOUND', 'No encontramos esa clase.');
  return jsonOk(cls);
});
