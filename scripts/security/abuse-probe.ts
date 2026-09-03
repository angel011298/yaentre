import '../lib/env';

/**
 * G67 — Sonda ACTIVA contra la extracción masiva y el abuso del plan
 * gratuito. Llama a las MISMAS funciones que ejecutan las Server Actions
 * reales (`startSimulation`, `startDrillSession`), sobre un perfil de prueba
 * DESECHABLE creado y borrado por el propio script — no toca las cuentas
 * `e2e_*`/`rlsprobe_*` establecidas.
 *
 * Uso: pnpm security:abuse
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });

const PROBE_PROFILE_ID = 'g67_probe_free';

interface Check {
  id: string;
  descripcion: string;
  ok: boolean;
  detalle: string;
}
const checks: Check[] = [];
function record(id: string, descripcion: string, ok: boolean, detalle: string): void {
  checks.push({ id, descripcion, ok, detalle });
}

async function setup(): Promise<void> {
  const template = await prisma.userProfile.findUniqueOrThrow({
    where: { id: 'e2e_sim_user' },
    select: { targetExamId: true, targetCareerId: true },
  });
  if (!template.targetExamId || !template.targetCareerId) {
    throw new Error('e2e_sim_user no tiene examen/carrera — no se puede montar la sonda.');
  }
  await prisma.userProfile.upsert({
    where: { id: PROBE_PROFILE_ID },
    create: {
      id: PROBE_PROFILE_ID,
      userId: `g67-probe-${Date.now()}`, // no es una cuenta real de Auth — solo capa DB
      role: 'STUDENT',
      onboardingStep: 4,
      displayName: 'G67 Probe',
      targetExamId: template.targetExamId,
      targetCareerId: template.targetCareerId,
    },
    update: {
      targetExamId: template.targetExamId,
      targetCareerId: template.targetCareerId,
    },
  });
}

async function cleanup(): Promise<void> {
  await prisma.$executeRawUnsafe(
    `DELETE FROM app_security.rate_limit_hits WHERE bucket_key LIKE '%${PROBE_PROFILE_ID}%'`
  );
  const sessions = await prisma.examSession.findMany({
    where: { userProfileId: PROBE_PROFILE_ID },
    select: { id: true },
  });
  const ids = sessions.map((s) => s.id);
  if (ids.length > 0) {
    await prisma.sessionAnswer.deleteMany({ where: { sessionId: { in: ids } } });
    await prisma.examSession.deleteMany({ where: { id: { in: ids } } });
  }
  await prisma.userProfile.delete({ where: { id: PROBE_PROFILE_ID } }).catch(() => {});
}

async function main(): Promise<void> {
  await setup();
  const simulator = await import('../../src/lib/db/simulator');
  const drill = await import('../../src/lib/db/drill');
  const { consumeRateLimit, resetRateLimit, RATE_LIMITS } = await import(
    '../../src/lib/rate-limit/store'
  );

  // Cubos limpios: si una corrida anterior murió a medias, el límite de
  // acción (SIMULATION_START/DRILL_START) podría bloquear ANTES del gate de
  // negocio que de verdad se quiere medir aquí.
  await resetRateLimit('SIMULATION_START', PROBE_PROFILE_ID);
  await resetRateLimit('DRILL_START', PROBE_PROFILE_ID);

  console.log('G67 — sonda de extracción masiva y abuso del plan gratuito\n');

  // ── 1. El simulacro gratis es UNO, así se abandone sin terminar ──────────
  const first = await simulator.startSimulation(PROBE_PROFILE_ID);
  record(
    'S1-primer-simulacro',
    'el primer simulacro de un perfil gratuito se permite',
    first.ok === true,
    first.ok
      ? `sesión creada, ${first.payload.questions.length} reactivos con contenido completo`
      : JSON.stringify(first)
  );

  if (first.ok) {
    // Simula lo que antes bastaba para burlar el muro: abandonar sin
    // terminar. Se fuerza el estado directamente (equivalente a esperar el
    // `timeLimitSecs` real, unas horas) para no hacer dormir la sonda.
    await prisma.examSession.update({
      where: { id: first.payload.sessionId },
      data: { status: 'ABANDONED', finishedAt: new Date() },
    });

    const second = await simulator.startSimulation(PROBE_PROFILE_ID);
    const bloqueado = second.ok === false && second.code === 'PAYWALL';
    record(
      'S2-segundo-tras-abandonar',
       'tras abandonar el primero SIN terminarlo, un segundo intento se bloquea (antes: gratis de nuevo)',
      bloqueado,
      second.ok
        ? `❌ PERMITIDO: creó OTRA sesión (${second.payload.sessionId}) — el simulacro "1 gratis" no se respetó`
        : `bloqueado: ${JSON.stringify(second)}`
    );

    const attempts = await prisma.examSession.count({
      where: { userProfileId: PROBE_PROFILE_ID, mode: 'FULL_SIMULATION' },
    });
    record(
      'S3-un-solo-intento-total',
      'en total, para este perfil gratuito, existe EXACTAMENTE 1 sesión FULL_SIMULATION',
      attempts === 1,
      `${attempts} sesión(es) FULL_SIMULATION creada(s) para este perfil (se esperaba exactamente 1)`
    );
  }

  // ── 2. La práctica libre: 10 SERVIDOS al día, se responda o no ───────────
  let blockedOnCall: number | null = null;
  for (let call = 1; call <= 4; call++) {
    const result = await drill.startDrillSession(PROBE_PROFILE_ID, { kind: 'area' });
    if (!result.ok) {
      if (result.code === 'PAYWALL') {
        blockedOnCall = call;
        break;
      }
      record(
        'D0-error-inesperado',
        `startDrillSession en la llamada ${call} no debería fallar con un código distinto de PAYWALL`,
        false,
        JSON.stringify(result)
      );
      break;
    }
    // Nunca se responde ninguno — es exactamente el ataque que se cierra.
  }
  const servedInDb = await prisma.sessionAnswer.count({
    where: {
      session: {
        userProfileId: PROBE_PROFILE_ID,
        mode: { in: ['TOPIC_DRILL', 'AREA_PRACTICE'] },
      },
    },
  });
  record(
    'D1-tope-10-sin-responder',
    'abrir sesiones de práctica en bucle SIN responder ninguna topa en 10 reactivos servidos, no en infinitos',
    servedInDb <= 10 && blockedOnCall !== null,
    `servidos sin responder ninguno: ${servedInDb} (tope 10); ` +
      (blockedOnCall ? `bloqueado en la llamada ${blockedOnCall}` : 'NUNCA se bloqueó tras 4 llamadas — ❌')
  );

  // ── 3. Límites de tasa por acción (defensa en profundidad) ───────────────
  await resetRateLimit('SIMULATION_START', PROBE_PROFILE_ID);
  const simLimit = RATE_LIMITS.SIMULATION_START.limit;
  const simVerdicts = [];
  for (let i = 0; i < simLimit + 2; i++) {
    simVerdicts.push(await consumeRateLimit('SIMULATION_START', PROBE_PROFILE_ID));
  }
  const simAllowed = simVerdicts.filter((v) => v.allowed).length;
  record(
    'R1-simulation-start-corta',
    'SIMULATION_START corta exactamente en su presupuesto por hora',
    simAllowed === simLimit,
    `${simAllowed} permitidos de ${simLimit + 2} intentos (presupuesto ${simLimit}/hora)`
  );
  await resetRateLimit('SIMULATION_START', PROBE_PROFILE_ID);

  await resetRateLimit('DRILL_START', PROBE_PROFILE_ID);
  const drillLimit = RATE_LIMITS.DRILL_START.limit;
  const drillVerdicts = [];
  for (let i = 0; i < drillLimit + 2; i++) {
    drillVerdicts.push(await consumeRateLimit('DRILL_START', PROBE_PROFILE_ID));
  }
  const drillAllowed = drillVerdicts.filter((v) => v.allowed).length;
  record(
    'R2-drill-start-corta',
    'DRILL_START corta exactamente en su presupuesto por hora',
    drillAllowed === drillLimit,
    `${drillAllowed} permitidos de ${drillLimit + 2} intentos (presupuesto ${drillLimit}/hora)`
  );
  await resetRateLimit('DRILL_START', PROBE_PROFILE_ID);

  await resetRateLimit('DIAGNOSTIC_START', PROBE_PROFILE_ID);
  const diagLimit = RATE_LIMITS.DIAGNOSTIC_START.limit;
  const diagVerdicts = [];
  for (let i = 0; i < diagLimit + 2; i++) {
    diagVerdicts.push(await consumeRateLimit('DIAGNOSTIC_START', PROBE_PROFILE_ID));
  }
  const diagAllowed = diagVerdicts.filter((v) => v.allowed).length;
  record(
    'R3-diagnostic-start-corta',
    'DIAGNOSTIC_START corta exactamente en su presupuesto por día',
    diagAllowed === diagLimit,
    `${diagAllowed} permitidos de ${diagLimit + 2} intentos (presupuesto ${diagLimit}/día)`
  );
  await resetRateLimit('DIAGNOSTIC_START', PROBE_PROFILE_ID);

  // ── 4. El endpoint /api/adaptive/next-questions con peso ─────────────────
  await resetRateLimit('ADAPTIVE_CONTENT_DAILY', PROBE_PROFILE_ID);
  const contentLimit = RATE_LIMITS.ADAPTIVE_CONTENT_DAILY.limit;
  const v1 = await consumeRateLimit('ADAPTIVE_CONTENT_DAILY', PROBE_PROFILE_ID, 7);
  const v2 = await consumeRateLimit('ADAPTIVE_CONTENT_DAILY', PROBE_PROFILE_ID, 7);
  record(
    'R4-adaptive-content-peso',
    'el peso se consume de verdad: 7+7 sobre un presupuesto de 10 bloquea la segunda llamada',
    v1.allowed && !v2.allowed,
    `1ª llamada pide 7 (hits=${v1.hits}, permitido=${v1.allowed}); 2ª pide 7 más ` +
      `(hits=${v2.hits}, permitido=${v2.allowed}) — presupuesto ${contentLimit}/día TOTAL, no ${contentLimit} por llamada`
  );
  await resetRateLimit('ADAPTIVE_CONTENT_DAILY', PROBE_PROFILE_ID);

  // ── Reporte ───────────────────────────────────────────────────────────────
  console.log('┌─ Resultado ──────────────────────────────────────────────────');
  for (const c of checks) {
    console.log(`│ ${c.ok ? '✅' : '❌'} ${c.id.padEnd(26)} ${c.descripcion}`);
    console.log(`│      ↳ ${c.detalle}`);
  }
  console.log('└──────────────────────────────────────────────────────────────');
  const fallos = checks.filter((c) => !c.ok);
  console.log(`\n${checks.length - fallos.length}/${checks.length} en verde.`);
  if (fallos.length > 0) {
    console.log(`\n⚠️  ${fallos.length} FALLO(S):`);
    for (const f of fallos) console.log(`   - ${f.id}: ${f.descripcion}`);
    process.exitCode = 1;
  }

  await cleanup();
}

main()
  .catch(async (err) => {
    console.error(err);
    await cleanup().catch(() => {});
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
