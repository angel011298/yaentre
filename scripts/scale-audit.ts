import './lib/env';

/**
 * G69 — Consumo REAL de infraestructura por recorrido de usuario
 * (`pnpm scale:audit`).
 *
 * G59 midió los flujos de LECTURA (`pnpm perf:audit`). Para dimensionar el
 * lanzamiento hace falta la otra mitad: lo que cuesta un alumno **completo**,
 * escrituras incluidas — arrancar el examen, responder, sincronizar, cerrar y
 * ver resultados. Sin eso, cualquier cálculo de "cuántos usuarios aguanta" es
 * una corazonada.
 *
 * Cómo se mide, y por qué así:
 *
 *  1. Cliente Prisma instrumentado (`log: 'query'`) sembrado en `globalThis`
 *     ANTES de importar `src/lib/db/*`, igual que `scripts/perf-audit.ts`: lo
 *     que se cuenta es el SQL que la app emite de verdad, no una
 *     reimplementación.
 *  2. Cada sentencia se clasifica en REAL (trabajo) o PROTOCOLO
 *     (`BEGIN` / `DEALLOCATE ALL` / `COMMIT` / `SELECT 1`). El protocolo no es
 *     ruido que se pueda ignorar: con `?pgbouncer=true` cada operación de
 *     Prisma cuesta 4 viajes al pooler y OCUPA una conexión de servidor
 *     durante toda la transacción. Es exactamente la unidad que compite por el
 *     recurso escaso (ver `pnpm scale:pool`).
 *  3. Las escrituras corren sobre un perfil DESECHABLE que el propio script
 *     crea y borra (mismo patrón que `scripts/security/abuse-probe.ts`).
 *     Nunca toca `e2e_*` ni ninguna cuenta real.
 *
 * Uso:  pnpm scale:audit [--json <ruta>]
 */

import { PrismaClient } from '@prisma/client';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

// ─────────────────────────── Instrumentación ───────────────────────────

interface Captured {
  query: string;
  durationMs: number;
}

const captured: Captured[] = [];
let capturing = false;

const prisma = new PrismaClient({ log: [{ emit: 'event', level: 'query' }] });
prisma.$on('query', (e) => {
  if (capturing) captured.push({ query: e.query, durationMs: e.duration });
});

(globalThis as unknown as { prisma?: unknown }).prisma = prisma;

const PROTOCOL = /^(BEGIN|COMMIT|ROLLBACK|DEALLOCATE ALL|SELECT 1)\b/i;

interface JourneyStep {
  name: string;
  /** Sentencias totales = viajes de red al pooler. */
  statements: number;
  /** Sentencias de trabajo (sin protocolo de transacción). */
  real: number;
  /** Operaciones de Prisma ≈ transacciones que ocupan una conexión. */
  ops: number;
  dbMs: number;
  wallMs: number;
  note?: string;
}

const steps: JourneyStep[] = [];

async function step(name: string, fn: () => Promise<unknown>, note?: string): Promise<unknown> {
  captured.length = 0;
  capturing = true;
  const t0 = performance.now();
  let out: unknown;
  try {
    out = await fn();
  } finally {
    capturing = false;
  }
  const wallMs = performance.now() - t0;
  const all = [...captured];
  const real = all.filter((q) => !PROTOCOL.test(q.query.trim()));
  // Cada operación de Prisma con `pgbouncer=true` se envuelve en su propia
  // transacción: el número de BEGIN es el número de operaciones. Si no hubo
  // ninguno (porque ya se corría dentro de una transacción interactiva) se cae
  // al conteo de sentencias reales.
  const begins = all.filter((q) => /^BEGIN\b/i.test(q.query.trim())).length;
  steps.push({
    name,
    statements: all.length,
    real: real.length,
    ops: begins > 0 ? begins : real.length,
    dbMs: all.reduce((a, q) => a + q.durationMs, 0),
    wallMs,
    note,
  });
  return out;
}

// ─────────────────────────── Perfil desechable ───────────────────────────

const PROBE_ID = 'g69_scale_probe';

async function setup(): Promise<void> {
  const template = await prisma.userProfile.findFirstOrThrow({
    where: { targetExamId: { not: null }, targetCareerId: { not: null } },
    select: { targetExamId: true, targetCareerId: true },
  });
  await prisma.userProfile.upsert({
    where: { id: PROBE_ID },
    create: {
      id: PROBE_ID,
      userId: `g69-scale-${Date.now()}`, // capa DB únicamente: no es cuenta de Auth
      role: 'STUDENT',
      onboardingStep: 4,
      displayName: 'G69 Scale Probe',
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
  const sessions = await prisma.examSession.findMany({
    where: { userProfileId: PROBE_ID },
    select: { id: true },
  });
  const ids = sessions.map((s) => s.id);
  if (ids.length > 0) {
    await prisma.sessionAnswer.deleteMany({ where: { sessionId: { in: ids } } });
    await prisma.examSession.deleteMany({ where: { id: { in: ids } } });
  }
  await prisma.weakTopic.deleteMany({ where: { userProfileId: PROBE_ID } }).catch(() => {});
  await prisma.learningProfile.deleteMany({ where: { userProfileId: PROBE_ID } }).catch(() => {});
  await prisma.streakRecord.deleteMany({ where: { userProfileId: PROBE_ID } }).catch(() => {});
  await prisma
    .$executeRawUnsafe(
      `DELETE FROM app_security.rate_limit_hits WHERE bucket_key LIKE '%${PROBE_ID}%'`
    )
    .catch(() => {});
  await prisma.userProfile.delete({ where: { id: PROBE_ID } }).catch(() => {});
}

// ─────────────────────────────── Recorridos ───────────────────────────────

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const jsonPath = args.includes('--json')
    ? args[args.indexOf('--json') + 1]
    : 'scripts/logs/scale-audit.json';

  await cleanup(); // por si una corrida anterior murió a medias
  await setup();

  const dbPrisma = await import('../src/lib/db/prisma');
  if (dbPrisma.prisma !== (prisma as unknown as typeof dbPrisma.prisma)) {
    throw new Error('El singleton de src/lib/db/prisma.ts no tomó el cliente instrumentado.');
  }

  const simulator = await import('../src/lib/db/simulator');
  const sessions = await import('../src/lib/db/sessions');
  const diagnostic = await import('../src/lib/db/diagnostic');
  const drill = await import('../src/lib/db/drill');
  const dashboard = await import('../src/lib/db/dashboard');
  const adaptive = await import('../src/lib/db/adaptive');
  const gamification = await import('../src/lib/db/gamification');
  const paywall = await import('../src/lib/db/paywall');
  const rateLimit = await import('../src/lib/rate-limit/store');

  await rateLimit.resetRateLimit('SIMULATION_START', PROBE_ID).catch(() => {});
  await rateLimit.resetRateLimit('DRILL_START', PROBE_ID).catch(() => {});

  // Calentamiento: la primera consulta paga el arranque del motor de Prisma.
  await prisma.userProfile.findUnique({ where: { id: PROBE_ID } });

  console.log('G69 — consumo de infraestructura por recorrido de usuario\n');

  // ══════════════ Recorrido 1: DIAGNÓSTICO ══════════════
  console.log('· Diagnóstico…');
  await step('diag/carga-pagina', () => diagnostic.loadDiagnosticState(PROBE_ID));

  const diagStart = (await step('diag/arranque', () =>
    diagnostic.startDiagnosticSession(PROBE_ID)
  )) as Awaited<ReturnType<typeof diagnostic.startDiagnosticSession>>;

  if (!diagStart.ok) throw new Error(`No se pudo arrancar el diagnóstico: ${diagStart.code}`);
  const diagSessionId = diagStart.session.id;

  // `startDiagnosticSession` devuelve la sesión sin reactivos; la página los
  // pide con `loadDiagnosticState` (el segundo viaje real del flujo).
  const diagState = (await step('diag/hidratar', () =>
    diagnostic.loadDiagnosticState(PROBE_ID)
  )) as Awaited<ReturnType<typeof diagnostic.loadDiagnosticState>>;
  if (diagState.kind !== 'in_progress') {
    throw new Error(`El diagnóstico no quedó en progreso: ${diagState.kind}`);
  }
  const diagQuestions = diagState.session.answers.map((a) =>
    diagnostic.toRunnerQuestion(a.question)
  );

  // El diagnóstico persiste respuesta por respuesta (`submitAnswer`): una
  // petición HTTP por reactivo. Es el recorrido más caro por reactivo servido.
  await step(
    'diag/responder-1',
    () =>
      sessions.submitAnswer({
        userProfileId: PROBE_ID,
        sessionId: diagSessionId,
        questionId: diagQuestions[0].id,
        selectedOption: diagQuestions[0].options[0]?.id ?? null,
        position: 0,
        timeSpentSecs: 30,
      }),
    `× ${diagQuestions.length} reactivos`
  );

  for (let i = 1; i < diagQuestions.length; i++) {
    await sessions.submitAnswer({
      userProfileId: PROBE_ID,
      sessionId: diagSessionId,
      questionId: diagQuestions[i].id,
      selectedOption: diagQuestions[i].options[0]?.id ?? null,
      position: i,
      timeSpentSecs: 30,
    });
  }

  await step('diag/cierre', () =>
    sessions.finishSession({ userProfileId: PROBE_ID, sessionId: diagSessionId })
  );
  // La pantalla de resultados resuelve la sesión otra vez y luego arma los
  // datos — es lo que hace `app/(app)/diagnostico/page.tsx`.
  await step('diag/resultados', async () => {
    const finished = await diagnostic.loadDiagnosticState(PROBE_ID);
    if (finished.kind === 'none') return null;
    return diagnostic.loadDiagnosticResultsData(PROBE_ID, finished.session);
  });

  // ══════════════ Recorrido 2: SIMULACRO COMPLETO ══════════════
  console.log('· Simulacro completo…');
  await step('sim/carga-pagina', () => simulator.loadSimulatorState(PROBE_ID));
  // Bloque 1: la portada ahora depende del plan (medio simulacro Free vs.
  // completo pagado). El recorrido de escala mide el caso pagado (peor caso:
  // set completo de 120/140 reactivos).
  await step('sim/portada', () => simulator.loadSimulatorEntryMeta(PROBE_ID, true));

  const simStart = (await step('sim/arranque', () =>
    simulator.startSimulation(PROBE_ID)
  )) as Awaited<ReturnType<typeof simulator.startSimulation>>;

  if (!simStart.ok) throw new Error(`No se pudo arrancar el simulacro: ${simStart.code}`);
  const simSessionId = simStart.payload.sessionId;
  const simQuestions = simStart.payload.questions;
  const simPayloadBytes = Buffer.byteLength(JSON.stringify(simStart.payload), 'utf8');

  // El simulador NO usa `submitAnswer`: acumula en Zustand y descarga lotes
  // por `/api/simulator/sync` cada 15 s, y SOLO cuando hay algo nuevo (el hook
  // compara el cuerpo serializado con el último enviado). Se miden los dos
  // tamaños de lote reales: 1 respuesta (el caso típico) y 10 (reconexión
  // tras un bache de red).
  const syncBody = (from: number, count: number) => ({
    userProfileId: PROBE_ID,
    sessionId: simSessionId,
    answers: simQuestions.slice(from, from + count).map((q, i) => ({
      questionId: q.id,
      selectedOption: q.options[0]?.id ?? null,
      position: from + i,
      timeSpentSecs: 40,
    })),
    integrity: { tabBlurCount: 0, rightClickAttempts: 0, keyboardShortcutAttempts: 0 },
    suspicionEvents: [],
    completedFullscreen: true,
  });

  await step(
    'sim/sync-1-respuesta',
    () => simulator.recordSimulatorSync(syncBody(0, 1)),
    'lote típico (1 por ventana de 15 s)'
  );
  await step(
    'sim/sync-10-respuestas',
    () => simulator.recordSimulatorSync(syncBody(1, 10)),
    'lote de reconexión'
  );
  // El PRIMER lote de un simulacro escribe además los contadores de
  // integridad (el alumno acaba de entrar a pantalla completa, así que
  // `completedFullscreen` cambia). Del segundo en adelante ya no cambia nada
  // y el UPDATE se salta (G69). Ese es el coste que se repite ~120 veces, así
  // que es el que entra en la cuenta del recorrido.
  await step(
    'sim/sync-1-estable',
    () => simulator.recordSimulatorSync(syncBody(11, 1)),
    'régimen: 1 respuesta, integridad sin cambios'
  );

  // El resto del examen, sin instrumentar: solo para llenar la sesión.
  if (simQuestions.length > 12) {
    await simulator.recordSimulatorSync(syncBody(12, simQuestions.length - 12));
  }

  await step('sim/cierre', () =>
    sessions.finishSession({ userProfileId: PROBE_ID, sessionId: simSessionId })
  );
  const simResult = await step('sim/resultados', () =>
    simulator.loadSimulatorResult(PROBE_ID, simSessionId)
  );
  await step('sim/revision', () => simulator.loadSimulatorReview(PROBE_ID, simSessionId));

  // ══════════════ Recorrido 3: PRÁCTICA LIBRE ══════════════
  console.log('· Práctica libre…');
  await step('practica/opciones', () => drill.loadPracticeOptions(PROBE_ID));
  await step('practica/muro-suave', () => paywall.evaluateDrillGate(PROBE_ID));

  const drillStart = (await step('practica/arranque', () =>
    drill.startDrillSession(PROBE_ID, { kind: 'area' })
  )) as Awaited<ReturnType<typeof drill.startDrillSession>>;

  let drillCount = 0;
  if (drillStart.ok) {
    const drillSessionId = drillStart.payload.sessionId;
    const drillQuestions = drillStart.payload.questions;
    drillCount = drillQuestions.length;
    await step(
      'practica/responder-1',
      () =>
        sessions.submitAnswer({
          userProfileId: PROBE_ID,
          sessionId: drillSessionId,
          questionId: drillQuestions[0].id,
          selectedOption: drillQuestions[0].options[0]?.id ?? null,
          position: 0,
          timeSpentSecs: 25,
        }),
      `× ${drillCount} reactivos`
    );
    await step('practica/explicacion', () =>
      drill.revealExplanationLayer(PROBE_ID, drillQuestions[0].id, 1)
    );
    for (let i = 1; i < drillQuestions.length; i++) {
      await sessions.submitAnswer({
        userProfileId: PROBE_ID,
        sessionId: drillSessionId,
        questionId: drillQuestions[i].id,
        selectedOption: drillQuestions[i].options[0]?.id ?? null,
        position: i,
        timeSpentSecs: 25,
      });
    }
    await step('practica/cierre', () =>
      sessions.finishSession({ userProfileId: PROBE_ID, sessionId: drillSessionId })
    );
  } else {
    console.log(`  (la práctica no arrancó: ${drillStart.code})`);
  }

  // ══════════════ Pantallas recurrentes ══════════════
  console.log('· Pantallas recurrentes…');
  await step('pantalla/dashboard', async () => {
    const now = new Date();
    await Promise.all([
      dashboard.loadExamCountdown(PROBE_ID, now),
      dashboard.loadWeakestTopics(PROBE_ID, 3),
      dashboard.loadRecentSimulations(PROBE_ID, 3),
      dashboard.loadHeatmapData(PROBE_ID, now),
      dashboard.loadEntrometroAccess(PROBE_ID),
      adaptive.computeCareerStrategy(PROBE_ID),
      adaptive.computeWeekOverWeekDelta(PROBE_ID, now),
      gamification.loadStreakStatus(PROBE_ID, now),
      gamification.loadMasteredSubjectBadges(PROBE_ID),
    ]);
  });

  // ─────────────────────────────── Reporte ───────────────────────────────

  const pad = (s: string, n: number) => s.padEnd(n);
  console.log('\n=== COSTE POR PASO (una petición HTTP cada uno) ===\n');
  console.log(`${pad('paso', 24)}${pad('ops', 6)}${pad('sent.', 7)}${pad('reales', 8)}${pad('db ms', 8)}nota`);
  console.log('-'.repeat(86));
  for (const s of steps) {
    console.log(
      `${pad(s.name, 24)}${pad(String(s.ops), 6)}${pad(String(s.statements), 7)}` +
        `${pad(String(s.real), 8)}${pad(s.dbMs.toFixed(0), 8)}${s.note ?? ''}`
    );
  }

  const opsOf = (n: string) => steps.find((s) => s.name === n)?.ops ?? 0;

  const diagAnswers = diagQuestions.length;
  const simAnswers = simQuestions.length;
  // Cota superior de sincronizaciones por simulacro: el flush de 15 s solo
  // sale cuando el cuerpo cambió, y solo cambia al responder → una por
  // respuesta como máximo.
  const simSyncs = simAnswers;

  const journeys = [
    {
      name: `Diagnóstico (${diagAnswers} reactivos)`,
      ops:
        opsOf('diag/carga-pagina') +
        opsOf('diag/arranque') +
        opsOf('diag/hidratar') +
        opsOf('diag/responder-1') * diagAnswers +
        opsOf('diag/cierre') +
        opsOf('diag/resultados'),
      requests: 5 + diagAnswers,
    },
    {
      name: `Simulacro completo (${simAnswers} reactivos)`,
      ops:
        opsOf('sim/carga-pagina') +
        opsOf('sim/portada') +
        opsOf('sim/arranque') +
        opsOf('sim/sync-1-respuesta') +
        opsOf('sim/sync-1-estable') * (simSyncs - 1) +
        opsOf('sim/cierre') +
        opsOf('sim/resultados') +
        opsOf('sim/revision'),
      requests: 6 + simSyncs,
    },
    {
      name: `Práctica libre (${drillCount} reactivos)`,
      ops:
        opsOf('practica/opciones') +
        opsOf('practica/muro-suave') +
        opsOf('practica/arranque') +
        opsOf('practica/responder-1') * drillCount +
        opsOf('practica/explicacion') +
        opsOf('practica/cierre'),
      requests: 5 + drillCount,
    },
    {
      name: 'Dashboard (una carga)',
      ops: opsOf('pantalla/dashboard'),
      requests: 1,
    },
  ];

  console.log('\n=== COSTE POR RECORRIDO COMPLETO ===\n');
  console.log(`${pad('recorrido', 36)}${pad('ops Prisma', 13)}${pad('viajes', 9)}peticiones HTTP`);
  console.log('-'.repeat(78));
  for (const j of journeys) {
    console.log(
      `${pad(j.name, 36)}${pad(String(j.ops), 13)}${pad(String(j.ops * 4), 9)}${j.requests}`
    );
  }

  console.log(
    `\nPayload del simulacro servido al cliente: ${(simPayloadBytes / 1024).toFixed(0)} kB`
  );
  if (simResult) {
    console.log(
      `Payload de resultados: ${(Buffer.byteLength(JSON.stringify(simResult), 'utf8') / 1024).toFixed(1)} kB`
    );
  }

  mkdirSync(dirname(jsonPath), { recursive: true });
  writeFileSync(
    jsonPath,
    JSON.stringify(
      { generatedAt: new Date().toISOString(), steps, journeys, simPayloadBytes },
      null,
      2
    ),
    'utf8'
  );
  console.log(`\nDetalle → ${jsonPath}`);

  await cleanup();
  console.log('Perfil de sondeo borrado.');
}

main()
  .catch(async (e) => {
    console.error(e);
    await cleanup().catch(() => {});
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
