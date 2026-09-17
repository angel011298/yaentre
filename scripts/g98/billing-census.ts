/**
 * scripts/g98/billing-census.ts — G98 tarea 1.
 *
 * Censo del estado de facturación ANTES de tocar nada, y condición de parada
 * de la fase: si existe una Subscription PENDING/ACTIVE o un Payment de una
 * cuenta que NO sea fixture (`@acierta-test.mx`), la fase se detiene.
 *
 * El correo NO está en `user_profiles` (vive en `auth.users`, que el rol de la
 * app no alcanza): se resuelve con `app_security.auth_emails_for_profiles`
 * (G73). Un perfil sin correo resoluble cuenta como NO fixture — el criterio
 * conservador es el único seguro para una condición de parada.
 *
 *   pnpm tsx --tsconfig scripts/tsconfig.perf.json scripts/g98/billing-census.ts
 */
import '../g71/env';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const FIXTURE_DOMAIN = '@acierta-test.mx';

async function main() {
  const subs = await prisma.subscription.findMany({
    select: {
      id: true,
      userProfileId: true,
      plan: true,
      status: true,
      season: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  const payments = await prisma.payment.findMany({
    select: {
      id: true,
      subscriptionId: true,
      status: true,
      method: true,
      amountMxn: true,
      createdAt: true,
      subscription: { select: { userProfileId: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  const profileIds = Array.from(
    new Set([
      ...subs.map((s) => s.userProfileId),
      ...payments.map((p) => p.subscription.userProfileId),
    ])
  );

  const rows = profileIds.length
    ? await prisma.$queryRaw<Array<{ profileId: string; email: string | null }>>`
        SELECT "profileId", "email"
          FROM app_security.auth_emails_for_profiles(${profileIds}::text[])
      `
    : [];
  const emailByProfile = new Map(rows.map((r) => [r.profileId, r.email]));

  const isFixture = (profileId: string): boolean => {
    const email = emailByProfile.get(profileId);
    return Boolean(email && email.toLowerCase().endsWith(FIXTURE_DOMAIN));
  };

  // ── subscriptions por estado × temporada, separando fixture ──────────────
  const grid = new Map<string, { fixture: number; real: number }>();
  for (const s of subs) {
    const key = `${s.status}|${s.season}`;
    const cell = grid.get(key) ?? { fixture: 0, real: 0 };
    if (isFixture(s.userProfileId)) cell.fixture += 1;
    else cell.real += 1;
    grid.set(key, cell);
  }

  console.log(`\n=== subscriptions (${subs.length}) — estado × temporada ===`);
  console.log(`  ${'ESTADO'.padEnd(10)} ${'TEMPORADA'.padEnd(12)} ${'FIXTURE'.padStart(8)} ${'NO-FIXTURE'.padStart(11)}`);
  for (const [key, cell] of [...grid.entries()].sort()) {
    const [status, season] = key.split('|');
    console.log(
      `  ${status.padEnd(10)} ${season.padEnd(12)} ${String(cell.fixture).padStart(8)} ${String(cell.real).padStart(11)}`
    );
  }
  if (grid.size === 0) console.log('  (ninguna)');

  console.log(`\n=== detalle de subscriptions ===`);
  for (const s of subs) {
    const email = emailByProfile.get(s.userProfileId) ?? '(sin correo resoluble)';
    console.log(
      `  ${s.createdAt.toISOString().slice(0, 19)} ${s.plan.padEnd(11)} ${s.status.padEnd(9)} ${s.season.padEnd(11)} ${isFixture(s.userProfileId) ? 'FIXTURE ' : 'REAL    '} ${email}`
    );
  }
  if (subs.length === 0) console.log('  (ninguna)');

  console.log(`\n=== payments (${payments.length}) ===`);
  for (const p of payments) {
    const pid = p.subscription.userProfileId;
    const email = emailByProfile.get(pid) ?? '(sin correo resoluble)';
    console.log(
      `  ${p.createdAt.toISOString().slice(0, 19)} ${p.status.padEnd(10)} ${p.method.padEnd(6)} ${String(p.amountMxn ?? '—').padStart(7)} ${isFixture(pid) ? 'FIXTURE ' : 'REAL    '} ${email}`
    );
  }
  if (payments.length === 0) console.log('  (ninguno)');

  // ── condición de parada ──────────────────────────────────────────────────
  const offendingSubs = subs.filter(
    (s) => (s.status === 'PENDING' || s.status === 'ACTIVE') && !isFixture(s.userProfileId)
  );
  const offendingPayments = payments.filter((p) => !isFixture(p.subscription.userProfileId));

  const marketing = await prisma.notificationPreference.groupBy({
    by: ['enabled'],
    where: { type: 'MARKETING' },
    _count: { _all: true },
  });
  const marketingTotal = marketing.reduce((acc, r) => acc + r._count._all, 0);
  console.log(
    `\n=== NotificationPreference MARKETING: ${marketingTotal} fila(s) ` +
      `(${marketing.map((r) => `enabled=${r.enabled}:${r._count._all}`).join(', ') || 'ninguna'}) ===`
  );

  const ebConsumed = subs.filter(
    (s) => s.season === 'EARLY_BIRD' && (s.status === 'ACTIVE' || s.status === 'PENDING')
  ).length;
  console.log(`Licencias EARLY_BIRD consumidas: ${ebConsumed} — quedan ${500 - ebConsumed} de 500`);

  console.log('\n=== VEREDICTO ===');
  if (offendingSubs.length || offendingPayments.length) {
    console.log(
      `  🛑 PARADA: ${offendingSubs.length} suscripción(es) PENDING/ACTIVE y ` +
        `${offendingPayments.length} pago(s) de cuentas NO fixture.`
    );
    process.exitCode = 1;
    return;
  }
  console.log('  ✅ Sin suscripciones PENDING/ACTIVE ni pagos de cuentas no fixture.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
