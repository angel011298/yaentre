/**
 * scripts/g71/cleanup.ts — G71. Deja la base como estaba antes de la
 * verificación integral.
 *
 * Regla de G65: una sonda borra lo que crea. Esta fase creó cuentas reales en
 * producción (alumno, tutor y las del E2E de registro), les compró un pase con
 * tarjeta de prueba y dejó sesiones de examen en las cuentas fixture. Todo eso
 * se retira aquí.
 *
 * NO toca `auth.users`: el rol `acierta_ci` no llega al esquema `auth` (G59) y
 * el proyecto sigue sin `SUPABASE_SERVICE_ROLE_KEY` en producción (G70). El
 * borrado de las filas de `auth.users` se hace por SQL de administración; este
 * script limpia todo lo que cuelga de `public` y verifica el resultado.
 *
 *   pnpm tsx scripts/g71/cleanup.ts            (solo inspecciona)
 *   pnpm tsx scripts/g71/cleanup.ts --apply    (borra de verdad)
 *
 * G98: cada fase que verifica en producción añade aquí SU sección. Lo que la
 * sonda de G98 crea es una fila de consentimiento de MARKETING en la cuenta
 * fixture (al pulsar «Avísame cuando abra» de verdad, que es la única forma
 * de saber que el botón guarda algo). La propia sonda la borra al terminar;
 * esta sección es la red por si se interrumpió a media corrida.
 */
import { prisma } from './db';

const APPLY = process.argv.includes('--apply');

/** Perfiles creados por G71: los de `@mailinator.com` de esta fase. */
const PERFILES_DE_G71 = [
  'cmtqh2plt000011r56v5cbfxh', // yaentre.g71.alumno@mailinator.com
  'cmtqog4qm0000sijyojcncc89', // yaentre.g71.tutor@mailinator.com
  'cmtqq05fe0000v6kd83am5afz', // e2e.journey.1788754089871@mailinator.com
  'cmtqq5hzt0000fd1mle43dw68', // e2e.journey.1788754340631@mailinator.com
  'cmtqqdlka0000jsg8zk6cgozn', // e2e.journey.1788754719395@mailinator.com
];

/** Cuentas fixture: se conservan, pero sin el rastro que dejó esta fase. */
const FIXTURES = ['e2e_sim_user', 'e2e_free_user'];
/** Todo lo de esta fase ocurrió después de esta marca (UTC). */
const DESDE = new Date('2026-09-06T23:00:00Z');

async function main() {
  console.log(`Modo: ${APPLY ? 'APLICAR' : 'INSPECCIÓN (usa --apply para borrar)'}\n`);

  const perfiles = await prisma.userProfile.findMany({
    where: { id: { in: PERFILES_DE_G71 } },
    select: { id: true, role: true, createdAt: true },
  });
  console.log(`Perfiles de G71 por borrar: ${perfiles.length}/${PERFILES_DE_G71.length}`);
  for (const p of perfiles) console.log(`  ${p.role.padEnd(7)} ${p.id}  ${p.createdAt.toISOString()}`);

  const prefsFixture = await prisma.notificationPreference.findMany({
    where: { userProfileId: { in: FIXTURES }, type: 'MARKETING' },
    select: { userProfileId: true, enabled: true },
  });
  console.log(`
Consentimientos MARKETING en las fixture (G98): ${prefsFixture.length}`);
  for (const p of prefsFixture) console.log(`  ${p.userProfileId.padEnd(14)} enabled=${p.enabled}`);

  const sesionesFixture = await prisma.examSession.findMany({
    where: { userProfileId: { in: FIXTURES }, startedAt: { gte: DESDE } },
    select: { id: true, userProfileId: true, mode: true, status: true, startedAt: true },
  });
  console.log(`\nSesiones que esta fase dejó en las cuentas fixture: ${sesionesFixture.length}`);
  for (const s of sesionesFixture) {
    console.log(`  ${s.userProfileId.padEnd(14)} ${s.mode.padEnd(16)} ${s.status.padEnd(12)} ${s.startedAt.toISOString()}`);
  }

  const subsFixture = await prisma.subscription.findMany({
    where: { userProfileId: { in: FIXTURES }, createdAt: { gte: DESDE } },
    select: { id: true, userProfileId: true, plan: true, status: true, season: true },
  });
  console.log(`\nSuscripciones que el E2E de checkout dejó en las fixture: ${subsFixture.length}`);
  for (const s of subsFixture) {
    console.log(`  ${s.userProfileId.padEnd(14)} ${s.plan.padEnd(12)} ${s.status.padEnd(9)} ${s.season}`);
  }

  if (!APPLY) {
    console.log('\nDRY-RUN. Nada se borró.');
    return;
  }

  // Cascadas: `UserProfile` borra en cascada sesiones, respuestas, suscripciones,
  // pagos, vínculos y códigos (ver `onDelete: Cascade` en el schema).
  const borradosPerfiles = await prisma.userProfile.deleteMany({ where: { id: { in: PERFILES_DE_G71 } } });
  const borradasSesiones = await prisma.examSession.deleteMany({
    where: { userProfileId: { in: FIXTURES }, startedAt: { gte: DESDE } },
  });
  const borradasSubs = await prisma.subscription.deleteMany({
    where: { userProfileId: { in: FIXTURES }, createdAt: { gte: DESDE } },
  });
  console.log(
    `\nBorrado: ${borradosPerfiles.count} perfiles · ${borradasSesiones.count} sesiones fixture · ${borradasSubs.count} suscripciones fixture`
  );

  // ── G98: consentimientos de MARKETING dejados por `pnpm sales:probe` ──
  const prefsG98 = await prisma.notificationPreference.deleteMany({
    where: { userProfileId: { in: FIXTURES }, type: 'MARKETING' },
  });
  console.log(`Consentimientos MARKETING de las fixture que se retiran (G98): ${prefsG98.count}`);

  // `processed_stripe_events` no cuelga de ningún perfil: es el registro de
  // idempotencia del webhook y se limpia por su `eventId`.
  const eventos = await prisma.processedStripeEvent.deleteMany({ where: { processedAt: { gte: DESDE } } });
  console.log(`Eventos de Stripe procesados que se retiran: ${eventos.count}`);

  await verificar();
}

async function verificar() {
  const perfiles = await prisma.userProfile.count();
  const subs = await prisma.subscription.count();
  const earlyBirdActivas = await prisma.subscription.count({
    where: { season: 'EARLY_BIRD', status: 'ACTIVE' },
  });
  const pagos = await prisma.payment.count();
  const eventos = await prisma.processedStripeEvent.count();
  const sesiones = await prisma.examSession.count();
  const respuestas = await prisma.sessionAnswer.count();
  const vinculos = await prisma.parentLink.count();
  const codigos = await prisma.parentLinkCode.count();
  const marketing = await prisma.notificationPreference.count({ where: { type: 'MARKETING' } });

  console.log('\n─ Estado tras la limpieza ─────────────────────────────────────');
  console.log(`  user_profiles            ${perfiles}   (esperado 5: las fixture)`);
  console.log(`  subscriptions            ${subs}   (esperado 1: e2e_sim_sub)`);
  console.log(`  payments                 ${pagos}   (esperado 0)`);
  console.log(`  processed_stripe_events  ${eventos}   (esperado 0)`);
  console.log(`  exam_sessions            ${sesiones}   (esperado 5: las fixture)`);
  console.log(`  session_answers          ${respuestas}   (esperado 480)`);
  console.log(`  parent_links             ${vinculos}   (esperado 0)`);
  console.log(`  parent_link_codes        ${codigos}   (esperado 0)`);
  console.log(`  prefs MARKETING          ${marketing}   (esperado 0 — G98)`);
  console.log(
    `  licencias EARLY_BIRD     ${earlyBirdActivas} usadas → quedan ${500 - earlyBirdActivas} de 500` +
      '   (el contador de la app cuenta solo ACTIVE — ver countEarlyBirdUsed)'
  );
  console.log('───────────────────────────────────────────────────────────────');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
