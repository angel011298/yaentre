import { deleteDateBlock } from '@/lib/db/teachers';
import { apiJson, beginTeacherApi } from '@/lib/teachers/api-helpers';

/**
 * G103 — DELETE /api/teachers/me/date-blocks/{id}. El borrado filtra por el
 * profesor de la SESIÓN: un id de otro profesor responde 404 igual que uno que
 * no existe (no se confirma que exista).
 */
export const dynamic = 'force-dynamic';

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const begin = await beginTeacherApi(request, { write: true, rateLimit: 'TEACHER_WRITE' });
  if (!begin.ok) return begin.response;
  const { id } = await params;
  if (!/^c[a-z0-9]{20,40}$/.test(id)) return apiJson({ error: 'No encontrado.' }, 404);
  const removed = await deleteDateBlock(begin.ctx.teacher.id, id);
  return removed ? apiJson({ ok: true }) : apiJson({ error: 'No encontrado.' }, 404);
}
