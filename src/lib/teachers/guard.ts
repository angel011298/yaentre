import { redirect } from 'next/navigation';
import { cache } from 'react';
import { AuthError } from '@/lib/auth/errors';
import { requireUser, type RequireUserResult } from '@/lib/auth/guards';
import { getTeacherByProfile, type TeacherWithSubjects } from '@/lib/db/teachers';

/**
 * G103 — guard del profesor. Un profesor es una cuenta con fila en `teachers`;
 * el rol de `user_profiles` no cambia (no se agrega un rol nuevo: toda la
 * autorización existente depende de los tres actuales). La fila se busca por
 * el `userProfileId` de la SESIÓN — nunca por un id que mande el cliente.
 *
 * `requireTeacher` LANZA (para Server Actions y Route Handlers, donde el
 * `AuthError` se vuelve un resultado). `getTeacherPageContext` REDIRIGE (para
 * páginas: un `AuthError` sin capturar llegaría a Sentry, G100).
 */
export type TeacherContext = RequireUserResult & { teacher: TeacherWithSubjects };

export async function requireTeacher(opts: { active?: boolean } = {}): Promise<TeacherContext> {
  const base = await requireUser();
  const teacher = await getTeacherByProfile(base.profile.id);
  if (!teacher) throw new AuthError('FORBIDDEN', 'No tienes un perfil de profesor.');
  if (opts.active && teacher.status !== 'ACTIVE') {
    throw new AuthError('FORBIDDEN', 'Tu perfil de profesor todavía no está activo.');
  }
  return { ...base, teacher };
}

export const getTeacherPageContext = cache(async function getTeacherPageContext(
  next = '/profesor'
): Promise<TeacherContext> {
  let base: RequireUserResult;
  try {
    base = await requireUser();
  } catch (err) {
    if (err instanceof AuthError) redirect(`/login?next=${encodeURIComponent(next)}`);
    throw err;
  }
  const teacher = await getTeacherByProfile(base.profile.id);
  if (!teacher) redirect('/profesor/solicitud');
  return { ...base, teacher };
});
