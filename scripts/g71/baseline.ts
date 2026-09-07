/**
 * scripts/g71/baseline.ts — G71. Foto del estado de la base, para comparar
 * ANTES y DESPUÉS del recorrido de verificación integral.
 *
 * El rol `acierta_ci` no tiene acceso al esquema `auth` (hallazgo G59), así
 * que aquí no salen los correos: los perfiles se identifican por su id y su
 * `displayName`. El cruce con `auth.users` se hace por fuera.
 *
 *   pnpm tsx scripts/g71/baseline.ts
 */
import { prisma } from './db';

async function main() {
  const profiles = await prisma.userProfile.findMany({
    select: { id: true, userId: true, role: true, displayName: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });
  console.log(`\n=== user_profiles (${profiles.length}) ===`);
  for (const p of profiles) {
    console.log(
      `  ${p.createdAt.toISOString().slice(0, 19)}  ${p.role.padEnd(7)} ${(p.displayName ?? '—').padEnd(24)} ${p.id}`
    );
  }

  const subs = await prisma.subscription.findMany({
    select: { id: true, userProfileId: true, plan: true, status: true, season: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });
  console.log(`\n=== subscriptions (${subs.length}) ===`);
  for (const s of subs) {
    console.log(
      `  ${s.createdAt.toISOString().slice(0, 19)}  ${s.plan.padEnd(8)} ${s.status.padEnd(9)} ${s.season.padEnd(11)} user=${s.userProfileId}`
    );
  }

  const eb = await prisma.subscription.count({
    where: { season: 'EARLY_BIRD', status: { in: ['ACTIVE', 'PENDING'] } },
  });
  console.log(`\nLicencias EARLY_BIRD consumidas: ${eb} — quedan ${500 - eb} de 500`);

  const counts = {
    payments: await prisma.payment.count(),
    processedStripeEvents: await prisma.processedStripeEvent.count(),
    examSessions: await prisma.examSession.count(),
    sessionAnswers: await prisma.sessionAnswer.count(),
    parentLinks: await prisma.parentLink.count(),
    parentLinkCodes: await prisma.parentLinkCode.count(),
    questions: await prisma.question.count(),
    questionsVerified: await prisma.question.count({ where: { isVerified: true } }),
  };
  console.log('');
  for (const [k, v] of Object.entries(counts)) console.log(`  ${k.padEnd(24)} ${v}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
