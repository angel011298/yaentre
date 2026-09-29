/**
 * scripts/bloque3/referrals-integration.ts — Bloque 3.
 *
 *   REFERRALS_TEST_DATABASE_URL=postgresql://…/algo_scratch pnpm referrals:integration
 *
 * Ejercita `src/lib/db/referrals.ts` contra un Postgres REAL: las garantías que
 * un doble de Prisma no puede dar (restricciones únicas, actualizaciones
 * condicionales bajo concurrencia, transacciones que se deshacen).
 *
 * ── Seguridad ──────────────────────────────────────────────────────────────
 *
 * Escribe y borra filas. Por eso REHÚSA correr salvo que el nombre de la base
 * termine en `_scratch`: nunca contra Supabase, nunca contra producción. Sin la
 * variable FALLA (código 1) en vez de saltarse en silencio: un verde que no
 * corrió nada es peor que un rojo (G71 §6 D6).
 *
 * Crea la función `app_security.auth_emails_for_profiles` en la base de prueba
 * (en Supabase real existe desde la migración 0014) leyendo de una tabla local.
 *
 * El esquema debe estar aplicado con las migraciones 0022 y 0023 (o con
 * `prisma db push`).
 */
const url = process.env.REFERRALS_TEST_DATABASE_URL;
if (!url) {
  console.error('❌ Falta REFERRALS_TEST_DATABASE_URL. Esta sonda no se salta: sin base de prueba no hay veredicto.');
  process.exit(1);
}
const dbName = new URL(url).pathname.replace(/^\//, '');
if (!dbName.endsWith('_scratch')) {
  console.error(`❌ La base "${dbName}" no termina en _scratch. Esta sonda escribe y borra filas; no corre contra otra cosa.`);
  process.exit(1);
}
process.env.DATABASE_URL = url;
process.env.DIRECT_URL = url;

type Referrals = typeof import('@/lib/db/referrals');

let failures = 0;
let checks = 0;
function check(name: string, ok: boolean, detail?: unknown) {
  checks++;
  if (ok) console.log(`  ✅ ${name}`);
  else {
    failures++;
    console.log(`  ❌ ${name}${detail === undefined ? '' : ` — ${JSON.stringify(detail)}`}`);
  }
}

async function main() {
  const { prisma } = await import('@/lib/db/prisma');
  const R: Referrals = await import('@/lib/db/referrals');
  const { generateReferralCode } = await import('@/lib/referrals/code');
  const { addMonthsClamped } = await import('@/lib/referrals/commission');

  // El reloj real: `createdAt` lo pone la base con `now()`, y las ventanas de velocidad comparan contra él.
  const NOW = new Date();
  const day = 86_400_000;
  const tag = `it${Date.now()}`;

  // ── Infraestructura de la base de prueba: los correos que en Supabase vienen de auth.users ──
  await prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS app_security`);
  await prisma.$executeRawUnsafe(
    `CREATE TABLE IF NOT EXISTS app_security.scratch_emails (profile_id text primary key, email text not null)`
  );
  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION app_security.auth_emails_for_profiles(ids text[])
    RETURNS TABLE("profileId" text, "email" text) LANGUAGE sql AS
    $$ SELECT profile_id, email FROM app_security.scratch_emails WHERE profile_id = ANY(ids) $$
  `);

  const created: string[] = [];
  async function mkUser(label: string, email: string) {
    const p = await prisma.userProfile.create({ data: { userId: `${tag}-${label}` } });
    created.push(p.id);
    await prisma.$executeRawUnsafe(`INSERT INTO app_security.scratch_emails VALUES ($1, $2)`, p.id, email);
    return p;
  }
  async function mkReferrer(label: string, email: string) {
    const user = await mkUser(label, email);
    return { user, code: await R.ensureReferralCode(user.id) };
  }
  async function mkPurchase(
    buyerId: string,
    opts: { plan?: 'SEASON_PASS' | 'PREMIUM' | 'MONTHLY'; cents?: number; paidAgoDays?: number; pi?: string; isComp?: boolean } = {}
  ) {
    const paidAt = new Date(NOW.getTime() - (opts.paidAgoDays ?? 8) * day);
    return prisma.subscription.create({
      data: {
        userProfileId: buyerId,
        plan: opts.plan ?? 'SEASON_PASS',
        season: 'EARLY_BIRD',
        status: 'ACTIVE',
        isComp: opts.isComp ?? false,
        startedAt: paidAt,
        payments: {
          create: {
            amountMxn: opts.cents ?? 99_900,
            method: 'CARD',
            status: 'SUCCEEDED',
            paidAt,
            stripePaymentIntentId: opts.pi ?? `pi_${tag}_${Math.random().toString(36).slice(2)}`,
          },
        },
      },
      select: { id: true },
    });
  }

  try {
    console.log('\n── Códigos ──');
    const ref = await mkUser('ref', `Ana.Lopez+x@gmail.com`);
    const codes = await Promise.all(Array.from({ length: 10 }, () => R.ensureReferralCode(ref.id)));
    check('10 llamadas concurrentes dan el MISMO código', new Set(codes.map((c) => c.code)).size === 1, codes.map((c) => c.code));
    check('y solo hay UNA fila', (await prisma.referralCode.count({ where: { userProfileId: ref.id } })) === 1);
    const code = codes[0];

    let duplicateRejected = false;
    try {
      await prisma.referralCode.create({ data: { code: generateReferralCode(), userProfileId: ref.id, type: 'REFERIDO' } });
    } catch {
      duplicateRejected = true;
    }
    check('la base rechaza un segundo REFERIDO de la misma persona (único userProfileId+type)', duplicateRejected);

    check('un código activo atribuye', (await R.resolveCodeForAttribution(code.code))?.id === code.id);
    check('un código inexistente no atribuye', (await R.resolveCodeForAttribution('ZZZZZZZZ')) === null);
    await prisma.referralCode.update({ where: { id: code.id }, data: { type: 'EMBAJADOR' } });
    check('un código de EMBAJADOR NO atribuye (Nivel 2 inactivo)', (await R.resolveCodeForAttribution(code.code)) === null);
    await prisma.referralCode.update({ where: { id: code.id }, data: { type: 'REFERIDO' } });

    console.log('\n── Registro de ventas ──');
    const b1 = await mkUser('b1', 'luis@hotmail.com');
    await prisma.userProfile.update({ where: { id: b1.id }, data: { referredByCodeId: code.id } });
    const s1 = await mkPurchase(b1.id);
    const r1 = await R.recordReferralSale(s1.id, NOW);
    check('una compra atribuida registra su venta PENDING', r1.status === 'recorded' && !r1.blocked, r1);
    const sale1 = await prisma.referralSale.findUnique({ where: { purchaseId: s1.id } });
    check('el periodo antifraude es cobro + 7 días', sale1?.accrueAfter.getTime() === NOW.getTime() - 8 * day + 7 * day, sale1?.accrueAfter);
    check('la comisión es $150 y el monto de la venta lo que se pagó', sale1?.commissionAmount === 15_000 && sale1?.saleAmount === 99_900);
    check('reprocesar NO duplica (purchaseId único)', (await R.recordReferralSale(s1.id, NOW)).status === 'exists');
    const concurrent = await Promise.all([R.recordReferralSale(s1.id, NOW), R.recordReferralSale(s1.id, NOW), R.recordReferralSale(s1.id, NOW)]);
    check('ni en carrera', concurrent.every((r) => r.status === 'exists') && (await prisma.referralSale.count({ where: { purchaseId: s1.id } })) === 1);

    // Los bloqueos duros van con OTRO referidor: dos reversiones activan el patrón de
    // reversiones y retendrían sus ventas siguientes (que es justo lo que se quiere, pero
    // contaminaría el resto de esta sonda).
    const refB = await mkReferrer('refB', 'Pedro.Gomez@gmail.com');
    const bAlias = await mkUser('alias', 'p.edro.gomez+promo@googlemail.com');
    await prisma.userProfile.update({ where: { id: bAlias.id }, data: { referredByCodeId: refB.code.id } });
    const sAlias = await mkPurchase(bAlias.id);
    const rAlias = await R.recordReferralSale(sAlias.id, NOW);
    check('el MISMO buzón (alias + y puntos de Gmail) nace REVERSED y sin comisión',
      rAlias.status === 'recorded' && rAlias.blocked && rAlias.flags.includes('same_email'), rAlias);
    const saleAlias = await prisma.referralSale.findUnique({ where: { purchaseId: sAlias.id } });
    check('…con motivo same_email y comisión 0', saleAlias?.status === 'REVERSED' && saleAlias.reverseReason === 'same_email' && saleAlias.commissionAmount === 0, saleAlias);

    await prisma.userProfile.update({ where: { id: refB.user.id }, data: { referredByCodeId: refB.code.id } });
    const sSelf = await mkPurchase(refB.user.id);
    const rSelf = await R.recordReferralSale(sSelf.id, NOW);
    check('AUTOCOMPRA (la misma cuenta) bloqueada', rSelf.status === 'recorded' && rSelf.blocked && rSelf.flags.includes('self_purchase'), rSelf);

    const bAfter = await mkUser('afterB', 'despues@hotmail.com');
    await prisma.userProfile.update({ where: { id: bAfter.id }, data: { referredByCodeId: refB.code.id } });
    const sAfter = await mkPurchase(bAfter.id);
    const rAfter = await R.recordReferralSale(sAfter.id, NOW);
    check('tras 2 reversiones en 90 días, la siguiente venta de ese código se RETIENE (reversal_pattern, blanda)',
      rAfter.status === 'recorded' && !rAfter.blocked && rAfter.flags.includes('reversal_pattern'), rAfter);

    const bMonthly = await mkUser('mon', 'mensual@hotmail.com');
    await prisma.userProfile.update({ where: { id: bMonthly.id }, data: { referredByCodeId: code.id } });
    const sMonthly = await mkPurchase(bMonthly.id, { plan: 'MONTHLY', cents: 9_900 });
    const rMonthly = await R.recordReferralSale(sMonthly.id, NOW);
    check('el plan MENSUAL no genera comisión', rMonthly.status === 'not_eligible', rMonthly);

    const bComp = await mkUser('comp', 'cortesia@hotmail.com');
    await prisma.userProfile.update({ where: { id: bComp.id }, data: { referredByCodeId: code.id } });
    const sComp = await mkPurchase(bComp.id, { isComp: true });
    check('una cortesía no es una venta', (await R.recordReferralSale(sComp.id, NOW)).status === 'not_eligible');

    const bNo = await mkUser('no', 'sinref@hotmail.com');
    const sNo = await mkPurchase(bNo.id);
    check('un comprador sin referidor no genera venta', (await R.recordReferralSale(sNo.id, NOW)).status === 'not_attributed');

    const bLow = await mkUser('low', 'creditado@hotmail.com');
    await prisma.userProfile.update({ where: { id: bLow.id }, data: { referredByCodeId: code.id } });
    const sLow = await mkPurchase(bLow.id, { cents: 70_000 });
    const rLow = await R.recordReferralSale(sLow.id, NOW);
    check('pagó tan poco (con crédito) que ya no soporta la comisión: no la genera', rLow.status === 'not_eligible', rLow);

    console.log('\n── Velocidad (> 5 ventas en 24 h) ──');
    const refV = await mkReferrer('refV', 'vendedora@hotmail.com');
    const fast: string[] = [];
    for (let i = 0; i < 7; i++) {
      const b = await mkUser(`v${i}`, `veloz${i}@hotmail.com`);
      await prisma.userProfile.update({ where: { id: b.id }, data: { referredByCodeId: refV.code.id } });
      const s = await mkPurchase(b.id, { paidAgoDays: 8 });
      fast.push(s.id);
      await R.recordReferralSale(s.id, NOW);
    }
    const velocitySales = await prisma.referralSale.findMany({ where: { purchaseId: { in: fast } }, orderBy: { createdAt: 'asc' } });
    check('las 5 primeras en 24 h van limpias', velocitySales.slice(0, 5).every((v) => v.fraudFlag === null), velocitySales.map((v) => v.fraudFlag));
    check('la 6ª y la 7ª se marcan velocity (blanda: PENDING)', velocitySales.slice(5).every((v) => v.fraudFlag === 'velocity' && v.status === 'PENDING'), velocitySales.slice(5).map((v) => v.fraudFlag));

    console.log('\n── Acreditación (7 días, reembolsos, marcas) ──');
    const refunded = new Set<string>();
    const deps = { getRefundedCents: async (pi: string) => (refunded.has(pi) ? 5_000 : 0) };
    const sum1 = await R.accrueDueSales(NOW, deps);
    check('acredita las limpias y NO las retenidas por una marca blanda', sum1.accrued >= 1 && sum1.failed === 0, sum1);
    check('la venta 1 quedó ACCRUED con su lote de $150 que vence a los 12 meses',
      (await prisma.referralSale.findUnique({ where: { purchaseId: s1.id } }))?.status === 'ACCRUED' &&
        (await prisma.referralCreditLot.findFirst({ where: { saleId: sale1!.id } }))?.expiresAt.getTime() === addMonthsClamped(NOW, 12).getTime());
    check('las bloqueadas (self/same_email) jamás acreditan', (await prisma.referralCreditLot.count({ where: { saleId: saleAlias!.id } })) === 0 && (await prisma.referralSale.findUnique({ where: { purchaseId: sSelf.id } }))?.status === 'REVERSED');
    const heldNow = await prisma.referralSale.findMany({ where: { purchaseId: { in: fast.slice(5) } } });
    check('las ventas con marca blanda siguen PENDING (retenidas)', heldNow.length === 2 && heldNow.every((h) => h.status === 'PENDING'));
    check('la venta retenida por reversal_pattern también', (await prisma.referralSale.findUnique({ where: { purchaseId: sAfter.id } }))?.status === 'PENDING');
    check('correr otra vez NO vuelve a acreditar (idempotente)', (await R.accrueDueSales(NOW, deps)).accrued === 0);

    const bYoung = await mkUser('young', 'joven@hotmail.com');
    await prisma.userProfile.update({ where: { id: bYoung.id }, data: { referredByCodeId: code.id } });
    const sYoung = await mkPurchase(bYoung.id, { paidAgoDays: 3 });
    await R.recordReferralSale(sYoung.id, NOW);
    await R.accrueDueSales(NOW, deps);
    check('a los 3 días NO se acredita', (await prisma.referralSale.findUnique({ where: { purchaseId: sYoung.id } }))?.status === 'PENDING');

    const bRef = await mkUser('refd', 'reembolsado@hotmail.com');
    await prisma.userProfile.update({ where: { id: bRef.id }, data: { referredByCodeId: code.id } });
    const piRef = `pi_${tag}_refunded`;
    const sRef = await mkPurchase(bRef.id, { pi: piRef, paidAgoDays: 9 });
    await R.recordReferralSale(sRef.id, NOW);
    refunded.add(piRef);
    const sumR = await R.accrueDueSales(NOW, deps);
    const saleRef = await prisma.referralSale.findUnique({ where: { purchaseId: sRef.id } });
    check('reembolsado en Stripe dentro del periodo → REVERSED (refund), sin lote', sumR.reversed >= 1 && saleRef?.status === 'REVERSED' && saleRef.reverseReason === 'refund' && (await prisma.referralCreditLot.count({ where: { saleId: saleRef.id } })) === 0, saleRef);

    const bDown = await mkUser('down', 'caido@hotmail.com');
    await prisma.userProfile.update({ where: { id: bDown.id }, data: { referredByCodeId: code.id } });
    const piDown = `pi_${tag}_down`;
    const sDown = await mkPurchase(bDown.id, { pi: piDown, paidAgoDays: 9 });
    await R.recordReferralSale(sDown.id, NOW);
    const sumD = await R.accrueDueSales(NOW, { getRefundedCents: async () => { throw new Error('Stripe caído'); } });
    check('Stripe inalcanzable → NO se acredita (falla cerrado) y se cuenta como failed', sumD.failed >= 1 && (await prisma.referralSale.findUnique({ where: { purchaseId: sDown.id } }))?.status === 'PENDING', sumD);

    const flaggedSale = heldNow[0];
    const flaggedOther = heldNow[1];
    const cleared = await R.resolveFraudFlag(flaggedSale.id, 'CLEAR', NOW);
    check('el admin libera una marca blanda', cleared.ok);
    check('liberar dos veces no procede', !(await R.resolveFraudFlag(flaggedSale.id, 'CLEAR', NOW)).ok);
    const sumC = await R.accrueDueSales(NOW, deps);
    check('liberada, se acredita en la siguiente corrida (a nombre del referidor de ESA venta)', (await prisma.referralSale.findUnique({ where: { id: flaggedSale.id } }))?.status === 'ACCRUED' && (await prisma.referralCreditLot.findFirst({ where: { saleId: flaggedSale.id } }))?.userProfileId === refV.user.id, sumC);
    check('una marca DURA no se puede «liberar»', !(await R.resolveFraudFlag(saleAlias!.id, 'CLEAR', NOW)).ok);
    check('resolver una venta que no existe no procede', (await R.resolveFraudFlag('inexistente', 'CLEAR', NOW)).ok === false);

    check('el admin confirma fraude → REVERSED (fraud) y sin lote',
      (await R.resolveFraudFlag(flaggedOther.id, 'CONFIRM', NOW)).ok &&
        (await prisma.referralSale.findUnique({ where: { id: flaggedOther.id } }))?.reverseReason === 'fraud' &&
        (await prisma.referralCreditLot.count({ where: { saleId: flaggedOther.id } })) === 0);

    console.log('\n── Código suspendido: retiene, no cancela ──');
    const sus = await R.suspendReferralCode(code.id, 'prueba', NOW);
    check('suspender funciona y dos veces no', sus.ok && !(await R.suspendReferralCode(code.id, 'otra', NOW)).ok);
    check('un código suspendido ya no atribuye', (await R.resolveCodeForAttribution(code.code)) === null);
    const bHeld = await mkUser('held', 'retenido@hotmail.com');
    await prisma.userProfile.update({ where: { id: bHeld.id }, data: { referredByCodeId: code.id } });
    const sHeld = await mkPurchase(bHeld.id, { paidAgoDays: 9 });
    await R.recordReferralSale(sHeld.id, NOW);
    const sumS = await R.accrueDueSales(NOW, deps);
    check('con el código suspendido las ventas se RETIENEN (no se acreditan ni se cancelan)',
      (await prisma.referralSale.findUnique({ where: { purchaseId: sHeld.id } }))?.status === 'PENDING' && sumS.held >= 1, sumS);
    check('reactivar lo deja atribuir otra vez', (await R.reinstateReferralCode(code.id)).ok && (await R.resolveCodeForAttribution(code.code)) !== null);
    await R.accrueDueSales(NOW, deps);
    check('reactivado, la venta retenida se acredita', (await prisma.referralSale.findUnique({ where: { purchaseId: sHeld.id } }))?.status === 'ACCRUED');

    console.log('\n── Crédito: apartar, consumir, liberar ──');
    const lotsNow = await prisma.referralCreditLot.findMany({ where: { userProfileId: ref.id, revokedAt: null } });
    const total = lotsNow.reduce((s, l) => s + l.remainingCents, 0);
    check(`el saldo vigente es la suma de sus lotes ($${total / 100})`, (await R.getAvailableCreditCents(ref.id, NOW)) === total && total >= 30_000, total);

    // Dos checkouts a la vez que piden 20 000 cada uno: entre los dos NO pueden pasar del saldo.
    const [c1, c2] = await Promise.all([R.reserveCredit(ref.id, 20_000, NOW), R.reserveCredit(ref.id, 20_000, NOW)]);
    const reserved = (c1?.reservedCents ?? 0) + (c2?.reservedCents ?? 0);
    const lotsAfter = await prisma.referralCreditLot.findMany({ where: { userProfileId: ref.id } });
    check('dos apartados simultáneos NO gastan el mismo saldo', reserved <= total && lotsAfter.every((l) => l.remainingCents >= 0), { reserved, total });
    check('lo apartado + lo que queda = lo que había', reserved + lotsAfter.reduce((s, l) => s + l.remainingCents, 0) === total, { reserved });
    check('el saldo disponible bajó exactamente lo apartado', (await R.getAvailableCreditCents(ref.id, NOW)) === total - reserved);

    // Liberar devuelve todo.
    if (c1) {
      check('liberar devuelve el crédito a sus lotes', (await R.releaseRedemptionById(c1.redemptionId, 'prueba', NOW)) === true);
      check('liberar dos veces NO devuelve dos veces (idempotente)', (await R.releaseRedemptionById(c1.redemptionId, 'prueba', NOW)) === false);
    }
    if (c2) await R.releaseRedemptionById(c2.redemptionId, 'prueba', NOW);
    check('tras liberar todo, el saldo es el original', (await R.getAvailableCreditCents(ref.id, NOW)) === total);

    // Consumir dentro de una transacción con la suscripción.
    const buyer = await mkUser('spender', 'gastador@hotmail.com');
    const spend = await R.reserveCredit(ref.id, 15_000, NOW);
    const pendingSub = await prisma.subscription.create({ data: { userProfileId: buyer.id, plan: 'SEASON_PASS', season: 'EARLY_BIRD', status: 'PENDING' }, select: { id: true } });
    await prisma.$transaction((tx) => R.attachRedemptionToSubscriptionTx(tx, spend!.redemptionId, pendingSub.id));
    const consumed = await prisma.$transaction((tx) => R.consumeRedemptionTx(tx, pendingSub.id, NOW));
    check('el pago confirmado CONSUME el apartado', consumed === 'consumed');
    check('consumir otra vez no hace nada', (await prisma.$transaction((tx) => R.consumeRedemptionTx(tx, pendingSub.id, NOW))) === 'none');
    check('lo consumido NO se puede liberar después', (await R.releaseRedemptionById(spend!.redemptionId, 'tarde', NOW)) === false);
    check('el saldo quedó $150 abajo para siempre', (await R.getAvailableCreditCents(ref.id, NOW)) === total - 15_000);

    // Checkout fallido: liberar por suscripción.
    const fail = await R.reserveCredit(ref.id, 10_000, NOW);
    const failSub = await prisma.subscription.create({ data: { userProfileId: buyer.id, plan: 'SEASON_PASS', season: 'EARLY_BIRD', status: 'PENDING' }, select: { id: true } });
    await prisma.$transaction((tx) => R.attachRedemptionToSubscriptionTx(tx, fail!.redemptionId, failSub.id));
    await prisma.$transaction((tx) => R.releaseRedemptionForSubscriptionTx(tx, failSub.id, 'checkout_failed', NOW));
    check('el checkout fallido devuelve el crédito', (await R.getAvailableCreditCents(ref.id, NOW)) === total - 15_000);
    const wasReleased = await prisma.$transaction((tx) => R.consumeRedemptionTx(tx, failSub.id, NOW));
    check('un pago que llega sobre un apartado YA liberado se detecta (was_released)', wasReleased === 'was_released', wasReleased);

    console.log('\n── Vencimiento y revocación ──');
    const later = new Date(NOW.getTime() + 400 * day);
    check('un año y pico después el crédito venció (saldo 0)', (await R.getAvailableCreditCents(ref.id, later)) === 0);
    check('y no se puede apartar crédito vencido', (await R.reserveCredit(ref.id, 1_000, later)) === null);

    const accLots = await prisma.referralCreditLot.findMany({ where: { userProfileId: ref.id, revokedAt: null, remainingCents: { gt: 0 } } });
    check('hay un lote con saldo para probar la reversa (si no, la prueba sería vacía)', accLots.length >= 1, accLots.length);
    const acc = await prisma.referralSale.findUnique({ where: { id: accLots[0].saleId } });
    const rev = await R.reverseSale(acc!.id, 'support_refund', NOW);
    const revoked = await prisma.referralCreditLot.findFirst({ where: { saleId: acc!.id } });
    check('reembolso posterior a la acreditación: revierte, REVOCA el lote y lo deja en saldo 0', rev.reversed && rev.wasAccrued && revoked?.revokedAt !== null && revoked?.remainingCents === 0, revoked);
    check('informa cuánto crédito YA se había gastado (no se reclama)', rev.consumedBeforeReversalCents === accLots[0].amountCents - accLots[0].remainingCents, rev);
    check('revertir dos veces no procede', (await R.reverseSale(acc!.id, 'support_refund', NOW)).reversed === false);

    console.log('\n── Red de seguridad de apartados ──');
    const orphan = await R.reserveCredit(ref.id, 5_000, NOW);
    const balanceBefore = await R.getAvailableCreditCents(ref.id, NOW);
    const stale = await R.releaseStaleRedemptions(new Date(NOW.getTime() + 5 * day));
    check('un apartado sin suscripción con más de 4 días se libera', stale.released >= 1 && (await R.getAvailableCreditCents(ref.id, NOW)) === balanceBefore + 5_000, stale);
    check('…y ya no queda RESERVED', (await prisma.referralCreditRedemption.findUnique({ where: { id: orphan!.redemptionId } }))?.status === 'RELEASED');

    console.log('\n── Lo que ve la persona ──');
    const overview = await R.getReferralOverview(ref.id, NOW);
    const history = await R.getReferralHistory(ref.id);
    check('el resumen trae código, saldo y conteos', overview.code?.code === code.code && overview.balanceCents >= 0 && overview.successfulCount >= 1, overview);
    const dump = JSON.stringify({ overview, history });
    const leaks = [b1.id, bLow.id, buyer.id, 'hotmail.com', 'luis@'].filter((needle) => dump.includes(needle));
    check('NINGÚN dato del comprador (id, correo) aparece en lo que ve el referidor', leaks.length === 0, leaks);
    const historyV = await R.getReferralHistory(refV.user.id);
    const dumpV = JSON.stringify(historyV);
    check('el historial de quien tuvo marcas (7 ventas, una liberada y una confirmada como fraude) existe…', historyV.length === 7, historyV.length);
    check('…y oculta las marcas y el motivo de fraude (solo «en revisión» o nada)', !dumpV.includes('velocity') && !dumpV.includes('fraud') && !dump.includes('same_email') && !dump.includes('self_purchase'), dumpV.slice(0, 300));

    console.log('\n── Panel de administración ──');
    const referrers = await R.listReferrers();
    check('el listado de referidores incluye al de la prueba con sus conteos', referrers.some((r) => r.code === code.code && r.sales.accrued >= 1));
    const alerts = await R.listFraudAlerts();
    check('las alertas de fraude listan la autocompra y el mismo correo, marcadas como bloqueadas', alerts.some((a) => a.flags.includes('same_email') && a.blocked) && alerts.some((a) => a.flags.includes('self_purchase') && a.blocked));
  } finally {
    // Limpieza: solo lo que esta corrida creó.
    if (created.length > 0) {
      await prisma.referralCreditRedemption.deleteMany({ where: { userProfileId: { in: created } } });
      await prisma.referralCreditLot.deleteMany({ where: { userProfileId: { in: created } } });
      await prisma.referralSale.deleteMany({ where: { buyerProfileId: { in: created } } });
      await prisma.referralSale.deleteMany({ where: { referralCode: { userProfileId: { in: created } } } });
      await prisma.userProfile.updateMany({ where: { id: { in: created } }, data: { referredByCodeId: null } });
      await prisma.referralCode.deleteMany({ where: { userProfileId: { in: created } } });
      await prisma.subscription.deleteMany({ where: { userProfileId: { in: created } } });
      await prisma.userProfile.deleteMany({ where: { id: { in: created } } });
      await prisma.$executeRawUnsafe(`DELETE FROM app_security.scratch_emails WHERE profile_id = ANY($1::text[])`, created);
    }
    await prisma.$disconnect();
  }

  console.log(`\n${failures === 0 ? '✅' : '❌'} ${checks - failures}/${checks} comprobaciones`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('❌ La sonda reventó:', err);
  process.exit(1);
});
