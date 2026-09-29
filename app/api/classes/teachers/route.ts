import { studentRoute } from '@/lib/api/route-context';
import { jsonOk } from '@/lib/api/respond';
import { directoryQuerySchema } from '@/lib/classes/schemas';
import { listDirectory } from '@/lib/db/teachers';

/** GET /api/classes/teachers — directorio de profesores ACTIVOS (spec §11). Solo Premium, marketplace abierto. */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = studentRoute(
  'classes.teachers',
  { rateLimit: 'DIRECTORY_READ', requirePremium: true, requireOpen: true },
  async (_ctx, request) => {
    const query = directoryQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    return jsonOk(await listDirectory(query as Parameters<typeof listDirectory>[0]));
  }
);
