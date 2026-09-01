import { prisma } from './prisma';

/**
 * Lectura de correos reales desde `auth.users` (F16): la tabla la administra
 * Supabase Auth, no `schema.prisma` (CLAUDE.md prohíbe tocar el schema sin
 * instrucción explícita, y este dato ni siquiera es del dominio de la app).
 * Se usa `$queryRaw` en vez de la API admin de Supabase para no introducir una
 * dependencia nueva (llave de servicio aparte) solo para resolver
 * destinatarios de correo.
 *
 * Uso: destinatarios de los correos programados (cron, F16 tarea 8) y, como
 * respaldo, el nombre a mostrar en el selector de alumnos del tutor cuando
 * `UserProfile.displayName` está vacío (el onboarding no lo pide hoy).
 *
 * G60 — corregido un bug latente: todos los llamadores pasan `UserProfile.id`
 * (un `cuid`), pero la consulta anterior comparaba contra `auth.users.id` (un
 * `uuid`) y lo casteaba con `::uuid[]` — eso NUNCA casaba, y con `cuid`s el
 * cast reventaba con `invalid input syntax for type uuid`. La clave de Auth es
 * `UserProfile.userId`, no `UserProfile.id`; ahora se hace el JOIN correcto y
 * se devuelve el mapa indexado por `UserProfile.id` (lo que el llamador tiene).
 *
 * Pendiente del dueño (G59 §5): `acierta_ci` aún no tiene `USAGE` sobre el
 * esquema `auth`, así que esta consulta lanza `42501` y los tres jobs de
 * correo reportan 0 enviados hasta que se aplique el grant por columna.
 */

interface ProfileEmailRow {
  profileId: string;
  email: string | null;
}

export async function getAuthEmails(userProfileIds: string[]): Promise<Map<string, string>> {
  if (userProfileIds.length === 0) return new Map();

  const rows = await prisma.$queryRaw<ProfileEmailRow[]>`
    SELECT p."id" AS "profileId", u."email" AS "email"
      FROM "user_profiles" p
      JOIN auth.users u ON u."id" = p."userId"
     WHERE p."id" = ANY(${userProfileIds}::text[])
  `;

  const map = new Map<string, string>();
  for (const row of rows) {
    if (row.email) map.set(row.profileId, row.email);
  }
  return map;
}

export async function getAuthEmail(userProfileId: string): Promise<string | null> {
  const map = await getAuthEmails([userProfileId]);
  return map.get(userProfileId) ?? null;
}
