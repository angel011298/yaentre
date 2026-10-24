import { z } from 'zod';
import { getAvailability, replaceAvailability } from '@/lib/db/teachers';
import { validateWeeklyAvailability, AVAILABILITY_RULES } from '@/lib/teachers/availability';
import { apiJson, beginTeacherApi } from '@/lib/teachers/api-helpers';

/**
 * G103 — disponibilidad semanal del profesor (spec §1.8).
 *   GET → mis bloques.
 *   PUT → reemplazo TOTAL de la semana, transaccional (o queda la nueva, o la
 *         anterior). Las clases ya reservadas no se tocan: cambiar la
 *         disponibilidad solo afecta horarios futuros por reservar.
 */
export const dynamic = 'force-dynamic';

const blockSchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: z.string().regex(/^\d{2}:\d{2}$/),
    endTime: z.string().regex(/^\d{2}:\d{2}$/),
  })
  .strict();

const bodySchema = z
  .object({ blocks: z.array(blockSchema).max(AVAILABILITY_RULES.MAX_WEEKLY_BLOCKS) })
  .strict();

export async function GET(request: Request) {
  const begin = await beginTeacherApi(request, { write: false });
  if (!begin.ok) return begin.response;
  return apiJson({ blocks: await getAvailability(begin.ctx.teacher.id) });
}

export async function PUT(request: Request) {
  const begin = await beginTeacherApi(request, { write: true, rateLimit: 'TEACHER_WRITE' });
  if (!begin.ok) return begin.response;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return apiJson({ error: `Máximo ${AVAILABILITY_RULES.MAX_WEEKLY_BLOCKS} bloques con día y horas válidos.` }, 400);
  }
  const week = validateWeeklyAvailability(parsed.data.blocks);
  if (!week.ok) return apiJson({ error: week.error }, 400);

  const saved = await replaceAvailability(begin.ctx.teacher.id, parsed.data.blocks);
  return apiJson({ ok: true, saved });
}
