import { prisma } from './prisma';

/**
 * Lectura de correos reales desde `auth.users` (F16): la tabla la administra
 * Supabase Auth, no `schema.prisma` (CLAUDE.md prohíbe tocar el schema sin
 * instrucción explícita, y este dato ni siquiera es del dominio de la app).
 * El rol de conexión de Prisma (`acierta_ci`, BYPASSRLS) ya tiene acceso de
 * lectura — se usa `$queryRaw` en vez de la API admin de Supabase para no
 * introducir una dependencia nueva (llave de servicio aparte) solo para
 * resolver destinatarios de correo.
 *
 * Uso: destinatarios de los correos programados (cron, F16 tarea 8) y, como
 * respaldo, el nombre a mostrar en el selector de alumnos del tutor cuando
 * `UserProfile.displayName` está vacío (el onboarding no lo pide hoy).
 */

interface AuthUserRow {
  id: string;
  email: string | null;
}

export async function getAuthEmails(userIds: string[]): Promise<Map<string, string>> {
  if (userIds.length === 0) return new Map();

  const rows = await prisma.$queryRaw<AuthUserRow[]>`
    SELECT id, email FROM auth.users WHERE id = ANY(${userIds}::uuid[])
  `;

  const map = new Map<string, string>();
  for (const row of rows) {
    if (row.email) map.set(row.id, row.email);
  }
  return map;
}

export async function getAuthEmail(userId: string): Promise<string | null> {
  const map = await getAuthEmails([userId]);
  return map.get(userId) ?? null;
}
