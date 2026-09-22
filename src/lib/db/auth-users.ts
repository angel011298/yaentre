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

// ═══════════════════════════════════════════════════════════════════════════
// G99 — IDENTIDAD PARA EL PANEL DE ADMINISTRACIÓN
// ═══════════════════════════════════════════════════════════════════════════
//
// Lo que sigue NO es un segundo camino al esquema `auth`: es el MISMO — las
// funciones `SECURITY DEFINER` propiedad de `postgres` que viven en
// `app_security` (migraciones 0014 y 0016). Todo lo que la app sabe de
// `auth.users` entra por aquí, por eso vive en este archivo y no en el módulo
// de administración.
//
// 🔒 La superficie está acotada en el SQL, no en el TypeScript: la función
// selecciona exactamente `email`, `email_confirmed_at` y `last_sign_in_at`.
// `encrypted_password`, `recovery_token` y los `*_token` no se exponen, no se
// leen y no se derivan en ninguna parte de esta fase.

export interface AuthIdentity {
  email: string | null;
  emailConfirmedAt: Date | null;
  lastSignInAt: Date | null;
}

interface AuthIdentityRow {
  profileId: string;
  email: string | null;
  emailConfirmedAt: Date | null;
  lastSignInAt: Date | null;
}

/** Identidad de Auth de varios perfiles, indexada por `UserProfile.id`. */
export async function getAuthIdentities(
  userProfileIds: string[]
): Promise<Map<string, AuthIdentity>> {
  if (userProfileIds.length === 0) return new Map();

  const rows = await prisma.$queryRaw<AuthIdentityRow[]>`
    SELECT "profileId", "email", "emailConfirmedAt", "lastSignInAt"
      FROM app_security.auth_identities_for_profiles(${userProfileIds}::text[])
  `;

  const map = new Map<string, AuthIdentity>();
  for (const row of rows) {
    map.set(row.profileId, {
      email: row.email,
      emailConfirmedAt: row.emailConfirmedAt,
      lastSignInAt: row.lastSignInAt,
    });
  }
  return map;
}

/**
 * Ids de perfil cuyo correo contiene `term`. La búsqueda se resuelve EN
 * POSTGRES: traerse todos los perfiles a memoria para filtrar por correo es el
 * anti-patrón que revienta a escala (G69), y además el correo ni siquiera está
 * en la tabla que Prisma consulta.
 */
export async function searchProfileIdsByEmail(term: string): Promise<string[]> {
  const trimmed = term.trim();
  if (!trimmed) return [];

  // `ILIKE '%term%'` se construye DENTRO de la función SQL; aquí el término
  // viaja como parámetro, nunca interpolado.
  const rows = await prisma.$queryRaw<Array<{ profileId: string }>>`
    SELECT "profileId" FROM app_security.profile_ids_by_email_search(${trimmed})
  `;
  return rows.map((r) => r.profileId);
}

/**
 * Cierra TODAS las sesiones de una cuenta borrando sus refresh tokens y sus
 * filas de `auth.sessions`.
 *
 * ⚠️ ALCANCE REAL, que la interfaz dice tal cual: esto revoca el refresh token
 * de inmediato, pero un ACCESS token ya emitido sigue siendo válido hasta que
 * expire solo (1 h por omisión en Supabase). Un JWT firmado no se puede
 * "desfirmar"; prometer un cierre instantáneo sería mentir.
 *
 * Por qué no `supabase.auth.admin.signOut()`: exige
 * `SUPABASE_SERVICE_ROLE_KEY`, que no está cargada en Vercel producción. Una
 * acción de administración que depende de un secreto ausente nace muerta en
 * producción — la firma exacta de G73b.
 */
export async function revokeAllSessions(userProfileId: string): Promise<number> {
  const rows = await prisma.$queryRaw<Array<{ revoke_auth_sessions: number }>>`
    SELECT app_security.revoke_auth_sessions(${userProfileId}) AS revoke_auth_sessions
  `;
  return Number(rows[0]?.revoke_auth_sessions ?? 0);
}
