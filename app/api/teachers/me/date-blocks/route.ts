import { z } from 'zod';
import { addDateBlock, listDateBlocks, TeacherError } from '@/lib/db/teachers';
import { mexicoDayKey } from '@/lib/subscriptions/access-check';
import { addDaysToKey } from '@/lib/teachers/slot-calculator';
import { apiJson, beginTeacherApi } from '@/lib/teachers/api-helpers';

/**
 * G103 — fechas bloqueadas del profesor (vacaciones, imprevistos; spec §1.8).
 * Una fecha bloqueada no ofrece ningún horario ese día. Solo hoy o fechas
 * futuras, hasta un año.
 */
export const dynamic = 'force-dynamic';

const bodySchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    reason: z.string().trim().max(120).optional().nullable(),
  })
  .strict();

export async function GET(request: Request) {
  const begin = await beginTeacherApi(request, { write: false });
  if (!begin.ok) return begin.response;
  return apiJson({ blocks: await listDateBlocks(begin.ctx.teacher.id, mexicoDayKey(new Date())) });
}

export async function POST(request: Request) {
  const begin = await beginTeacherApi(request, { write: true, rateLimit: 'TEACHER_WRITE' });
  if (!begin.ok) return begin.response;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiJson({ error: 'Elige una fecha válida.' }, 400);

  const today = mexicoDayKey(new Date());
  const { date } = parsed.data;
  if (Number.isNaN(Date.parse(`${date}T00:00:00Z`)) || date < today || date > addDaysToKey(today, 366)) {
    return apiJson({ error: 'La fecha debe ser hoy o una fecha futura (máximo un año).' }, 400);
  }

  try {
    const block = await addDateBlock(begin.ctx.teacher.id, date, parsed.data.reason ?? null);
    return apiJson({ ok: true, block }, 201);
  } catch (err) {
    if (err instanceof TeacherError) return apiJson({ error: err.message }, 409);
    throw err;
  }
}
