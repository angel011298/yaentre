/**
 * scripts/g99/promote-admin.ts — G99 tarea 3.
 *
 *   pnpm admin:promote <correo>
 *
 * Pone `role = 'ADMIN'` en el `UserProfile` del correo dado y deja fila en
 * `admin_audit_log`. Idempotente: correrlo dos veces no cambia nada la segunda
 * y lo dice.
 *
 * ── Por qué NO usa el cliente de servicio de Supabase ───────────────────────
 *
 * El encargo pedía buscar la cuenta en Auth con `SUPABASE_SERVICE_ROLE_KEY`.
 * Esa variable NO está cargada en Vercel producción (medido con
 * `vercel env ls production`) y localmente vale un placeholder, así que un
 * script que dependa de ella no corre. Se usa el MISMO camino que el resto de
 * la app: `app_security.auth_identities_for_profiles`, la función
 * `SECURITY DEFINER` de las migraciones 0014/0016. No hace falta ningún
 * secreto nuevo y no se abre un segundo acceso al esquema `auth`.
 *
 * El actor que queda en la bitácora es el propio script (`targetKind: 'system'`,
 * sin `actorUserProfileId`), porque no hay sesión: es una operación de consola
 * del dueño, y así se distingue de una promoción hecha desde el panel.
 */
import '../g71/env';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email || !email.includes('@')) {
    console.error('Uso: pnpm admin:promote <correo>');
    process.exitCode = 1;
    return;
  }

  // Ids de perfil cuyo correo coincide EXACTAMENTE. La función de búsqueda usa
  // ILIKE '%term%', así que se filtra aquí por igualdad: promover por
  // coincidencia parcial sería un accidente esperando a ocurrir.
  const candidates = await prisma.$queryRaw<Array<{ profileId: string }>>`
    SELECT "profileId" FROM app_security.profile_ids_by_email_search(${email})
  `;
  const ids = candidates.map((c) => c.profileId);

  if (ids.length === 0) {
    console.error(
      `🛑 No hay ninguna cuenta con el correo ${email}.\n` +
        '   Regístrala y verifícala en https://yaentre.com/registro antes de promoverla.'
    );
    process.exitCode = 1;
    return;
  }

  const identities = await prisma.$queryRaw<
    Array<{ profileId: string; email: string | null; emailConfirmedAt: Date | null }>
  >`
    SELECT "profileId", "email", "emailConfirmedAt"
      FROM app_security.auth_identities_for_profiles(${ids}::text[])
  `;
  const exact = identities.filter((i) => (i.email ?? '').trim().toLowerCase() === email);

  if (exact.length === 0) {
    console.error(`🛑 No hay cuenta en Auth con el correo exacto ${email}.`);
    process.exitCode = 1;
    return;
  }
  if (exact.length > 1) {
    console.error(`🛑 Hay ${exact.length} perfiles con ese correo. Revísalo a mano.`);
    process.exitCode = 1;
    return;
  }

  const target = exact[0];
  const profile = await prisma.userProfile.findUnique({
    where: { id: target.profileId },
    select: { id: true, role: true },
  });
  if (!profile) {
    console.error(`🛑 Existe en Auth pero no tiene UserProfile (${target.profileId}).`);
    process.exitCode = 1;
    return;
  }

  console.log(`Cuenta:     ${email}`);
  console.log(`Perfil:     ${profile.id}`);
  console.log(`Verificada: ${target.emailConfirmedAt ? 'sí' : 'NO'}`);
  console.log(`Rol actual: ${profile.role}`);

  if (profile.role === 'ADMIN') {
    console.log('\n✅ Ya era ADMIN. Nada que hacer (idempotente).');
    return;
  }

  await prisma.userProfile.update({ where: { id: profile.id }, data: { role: 'ADMIN' } });
  await prisma.adminAuditLog.create({
    data: {
      actorUserProfileId: null,
      actorEmail: 'scripts/g99/promote-admin.ts',
      action: 'admin.promoted',
      targetUserProfileId: profile.id,
      targetKind: 'user',
      reason: 'Promoción del admin maestro desde consola (G99 tarea 3).',
      metadata: { previousRole: profile.role, role: 'ADMIN', email },
    },
  });

  // Verificación POR EFECTO: se relee de la base, no se asume que el UPDATE
  // hizo lo que decía (G73b).
  const after = await prisma.userProfile.findUnique({
    where: { id: profile.id },
    select: { role: true },
  });
  console.log(`\n✅ Rol tras la promoción (releído de la base): ${after?.role}`);
  if (after?.role !== 'ADMIN') {
    console.error('🛑 El rol NO quedó en ADMIN.');
    process.exitCode = 1;
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
