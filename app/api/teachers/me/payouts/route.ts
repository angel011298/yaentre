import { jsonOk } from '@/lib/api/respond';
import { teacherRoute } from '@/lib/api/route-context';

/**
 * GET /api/teachers/me/payouts (spec §11). El motor de liquidación NO está
 * construido: depende de que Ángel confirme que el contador validó el proceso
 * (ver RETORNO_BLOQUE2.md). Por eso responde `available: false` en vez de una
 * lista vacía — «no tienes liquidaciones» y «todavía no las mostramos» no son lo
 * mismo, y el profesor no debe concluir que no se le pagó.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = teacherRoute('teachers.me.payouts', { statuses: ['ACTIVE', 'INACTIVE'] }, async () =>
  jsonOk({
    available: false,
    payouts: [],
    message: 'Tus liquidaciones aparecerán aquí cuando se active el pago semanal.',
  })
);
