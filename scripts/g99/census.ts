/**
 * scripts/g99/census.ts — G99 tarea 1.
 *
 *   pnpm admin:census
 *
 * Censo de cuentas y facturación: línea base del cierre de la fase. Separa las
 * cuentas fixture (`@acierta-test.mx`) del resto.
 *
 * Los correos NO están en `user_profiles` (viven en `auth.users`, que el rol de
 * la app no alcanza): se resuelven con `app_security.auth_identities_for_profiles`
 * (migraciones 0014/0016), el mismo camino que usa toda la app. No se abre un
 * segundo acceso al esquema `auth` y no se lee ninguna columna de credenciales.
 *
 * Reporta además si el correo del admin maestro tiene cuenta verificada y con
 * qué rol — la condición de arranque de la fase.
 */
import '../g71/env';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const FIXTURE_DOMAIN = '@acierta-test.mx';
const MASTER = process.argv[2]?.trim().toLowerCase() || 'angelortizsanchez0112@gmail.com';

interface Identity {
  profileId: string;
  email: string | null;
  emailConfirmedAt: Date | null;
}

function table(title: string, grid: Map<string, { fixture: number; real: number }>, cols: string[]) {
  console.log(`\n=== ${title} ===`);
  console.log(`  ${cols.map((c) => c.padEnd(12)).join('')}${'FIXTURE'.padStart(8)}${'NO-FIXTURE'.padStart(12)}`);
  for (const [key, cell] of [...grid.entries()].sort()) {
    const parts = key.split('|');
    console.log(
      `  ${parts.map((p) => p.padEnd(12)).join('')}${String(cell.fixture).padStart(8)}${String(cell.real).padStart(12)}`
    );
  }
  if (grid.size === 0) console.log('  (ninguno)');
}

async function main() {
  const profiles = await prisma.userProfile.findMany({
    select: { id: true, role: true, createdAt: true },
  });

  const identities = profiles.length
    ? await prisma.$queryRaw<Identity[]>`
        SELECT "profileId", "email", "emailConfirmedAt"
          FROM app_security.auth_identities_for_profiles(${profiles.map((p) => p.id)}::text[])
      `
    : [];
  const byProfile = new Map(identities.map((r) => [r.profileId, r]));
  const isFixture = (id: string) => {
    const e = byProfile.get(id)?.email;
    return Boolean(e && e.toLowerCase().endsWith(FIXTURE_DOMAIN));
  };

  const roles = new Map<string, { fixture: number; real: number }>();
  for (const p of profiles) {
    const cell = roles.get(p.role) ?? { fixture: 0, real: 0 };
    if (isFixture(p.id)) cell.fixture += 1;
    else cell.real += 1;
    roles.set(p.role, cell);
  }
  table(`user_profiles (${profiles.length}) por rol`, roles, ['ROL']);

  const subs = await prisma.subscription.findMany({
    select: { userProfileId: true, status: true, season: true, isComp: true },
  });
  const grid = new Map<string, { fixture: number; real: number }>();
  for (const s of subs) {
    const key = `${s.status}|${s.season}|${s.isComp ? 'cortesía' : 'venta'}`;
    const cell = grid.get(key) ?? { fixture: 0, real: 0 };
    if (isFixture(s.userProfileId)) cell.fixture += 1;
    else cell.real += 1;
    grid.set(key, cell);
  }
  table(`subscriptions (${subs.length})`, grid, ['ESTADO', 'TEMPORADA', 'ORIGEN']);

  const payments = await prisma.payment.findMany({
    select: { status: true, subscription: { select: { userProfileId: true } } },
  });
  const pay = new Map<string, { fixture: number; real: number }>();
  for (const p of payments) {
    const cell = pay.get(p.status) ?? { fixture: 0, real: 0 };
    if (isFixture(p.subscription.userProfileId)) cell.fixture += 1;
    else cell.real += 1;
    pay.set(p.status, cell);
  }
  table(`payments (${payments.length}) por estado`, pay, ['ESTADO']);

  const ebSold = subs.filter(
    (s) => s.season === 'EARLY_BIRD' && s.status === 'ACTIVE' && !s.isComp
  ).length;
  const ebComp = subs.filter((s) => s.season === 'EARLY_BIRD' && s.isComp).length;
  console.log(
    `\nLicencias Early Bird VENDIDAS: ${ebSold} — quedan ${500 - ebSold} de 500` +
      ` (cortesías, que no descuentan: ${ebComp})`
  );

  const auditRows = await prisma.adminAuditLog.count();
  console.log(`Filas en admin_audit_log: ${auditRows}`);

  console.log(`\n=== admin maestro: ${MASTER} ===`);
  const match = identities.find((i) => (i.email ?? '').trim().toLowerCase() === MASTER);
  if (!match) {
    console.log('  🛑 NO tiene cuenta con perfil. Debe registrarse y verificar su correo.');
    process.exitCode = 1;
    return;
  }
  const prof = profiles.find((p) => p.id === match.profileId);
  console.log(`  UserProfile: ${match.profileId}`);
  console.log(`  verificado:  ${match.emailConfirmedAt ? `sí (${match.emailConfirmedAt.toISOString()})` : 'NO'}`);
  console.log(`  rol actual:  ${prof?.role ?? '(desconocido)'}`);
  if (!match.emailConfirmedAt) process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
