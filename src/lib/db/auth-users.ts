import { prisma } from './prisma';

/**
 * Lectura de correos reales desde `auth.users` (F16): la tabla la administra
 * Supabase Auth, no `schema.prisma` (CLAUDE.md prohíbe tocar el schema sin
 * instrucción explícita, y este dato ni siquiera es del dominio de la app).
 *
 * Uso: destinatarios de los correos programados (cron, F16 tarea 8) y, como
 * respaldo, el nombre a mostrar en el selector de alumnos del tutor cuando
 * `UserProfile.displayName` está vacío (el onboarding no lo pide hoy).
 *
 * ── G73: por qué esto pasa por una función y no por un JOIN directo ──
 *
 * Desde G59 los tres correos programados reportaban 0 enviados sin producir un
 * error visible. Eran DOS defectos encadenados, y el primero tapaba al segundo:
 *
 *  A. El rol de la app no alcanzaba `auth`. El remedio que se venía arrastrando
 *     en la documentación (`GRANT USAGE ON SCHEMA auth TO …`) **no es
 *     ejecutable** en este proyecto: `auth` lo posee `supabase_admin` y el rol
 *     máximo al que llega el dueño (`postgres`) sólo tiene USAGE *sin opción de
 *     concesión*. El GRANT no falla — Postgres lo acepta como no-op — así que
 *     "aplicarlo" y darlo por hecho habría dejado los correos igual de rotos.
 *
 *  B. El JOIN estaba roto por tipos: `auth.users.id` es `uuid` y
 *     `user_profiles."userId"` es `text`, y la comparación iba sin cast
 *     (`42883: operator does not exist: uuid = text`). Incluso con el
 *     privilegio, la consulta habría seguido lanzando.
 *
 * La salida es `app_security.auth_emails_for_profiles`, una función
 * `SECURITY DEFINER` propiedad de `postgres` (migración 0014). No abre `auth`
 * al rol de la app: expone sólo el par (perfil, correo) de los ids que se le
 * pasan — nunca el hash de contraseña ni los tokens de recuperación.
 *
 * Corolario de G60 que sigue vigente: los llamadores pasan `UserProfile.id`
 * (un `cuid`), NO `auth.users.id`. El mapa vuelve indexado por `UserProfile.id`.
 */

interface ProfileEmailRow {
  profileId: string;
  email: string | null;
}

export async function getAuthEmails(userProfileIds: string[]): Promise<Map<string, string>> {
  if (userProfileIds.length === 0) return new Map();

  const rows = await prisma.$queryRaw<ProfileEmailRow[]>`
    SELECT "profileId", "email"
      FROM app_security.auth_emails_for_profiles(${userProfileIds}::text[])
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
