import { jsonOk } from '@/lib/api/respond';
import { studentRoute } from '@/lib/api/route-context';
import { listStudentClasses } from '@/lib/db/classes';

/** GET /api/classes — las clases del propio alumno. Sin `requireOpen`: el historial no depende del interruptor. */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = studentRoute('classes.list', { rateLimit: 'DIRECTORY_READ' }, async (ctx) =>
  jsonOk(await listStudentClasses(ctx.profile.id, new Date()))
);
