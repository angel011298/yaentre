import '../lib/env';

/**
 * G67 — Sonda ACTIVA de que el tiempo del simulador/diagnóstico se calcula en
 * el SERVIDOR y no se puede estirar desde el navegador.
 *
 * No puede esperar 3 horas reales para probar el límite del simulacro, así
 * que hace lo equivalente a lo que lograría un reloj de sistema manipulado:
 * ADELANTA el `startedAt` guardado en la base (el ancla real del servidor)
 * hacia el pasado, y confirma que la siguiente escritura de la sesión —
 * `submitAnswer` (diagnóstico) / `recordSimulatorSync` (simulacro, el camino
 * REAL que usa `SimulatorRunner` vía `sendBeacon`) — la cierra por su cuenta
 * como `COMPLETED_BY_TIMEOUT` y rechaza la operación, en vez de aceptarla
 * como si el examen siguiera vivo.
 *
 * Uso: pnpm security:time-integrity
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });
const PROBE_PROFILE_ID = 'g67_probe_time';

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
  await prisma.userProfile.upsert({
    where: { id: PROBE_PROFILE_ID },
    create: {
      id: PROBE_PROFILE_ID,
      userId: `g67-time-probe-${Date.now()}`,
      role: 'STUDENT',
      onboardingStep: 4,
      displayName: 'G67 Time Probe',
      targetExamId: template.targetExamId,
      targetCareerId: template.targetCareerId,
    },
    update: {},
  });
}

async function cleanup(): Promise<void> {
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

/** Retrasa `startedAt` para simular que ya pasó `secsAgo` desde que abrió. */
async function backdate(sessionId: string, secsAgo: number): Promise<void> {
  await prisma.examSession.update({
    where: { id: sessionId },
    data: { startedAt: new Date(Date.now() - secsAgo * 1000) },
  });
}

async function main(): Promise<void> {
  await setup();
  const sessionsDb = await import('../../src/lib/db/sessions');
  const diagnosticDb = await import('../../src/lib/db/diagnostic');
  const simulatorDb = await import('../../src/lib/db/simulator');
  const { resetRateLimit } = await import('../../src/lib/rate-limit/store');
  await resetRateLimit('DIAGNOSTIC_START', PROBE_PROFILE_ID);
  await resetRateLimit('SIMULATION_START', PROBE_PROFILE_ID);

  console.log('G67 — sonda de integridad del tiempo (servidor, no navegador)\n');

  // ── 1. DIAGNÓSTICO: 45 min reales, "reloj congelado" tras el límite ──────
  const diag = await diagnosticDb.startDiagnosticSession(PROBE_PROFILE_ID);
  if (diag.ok) {
    const questionId = (
      await prisma.sessionAnswer.findFirstOrThrow({
        where: { sessionId: diag.session.id },
        select: { questionId: true },
      })
    ).questionId;

    // El alumno "congeló" su reloj: en la base ya pasaron 50 min (límite: 45).
    await backdate(diag.session.id, 50 * 60);

    let rechazado = false;
    let mensaje = '';
    try {
      await sessionsDb.submitAnswer({
        userProfileId: PROBE_PROFILE_ID,
        sessionId: diag.session.id,
        questionId,
        selectedOption: 'A',
        position: 0,
        timeSpentSecs: 1,
      });
    } catch (err) {
      rechazado = true;
      mensaje = err instanceof Error ? err.message : String(err);
    }

    const after = await prisma.examSession.findUniqueOrThrow({
      where: { id: diag.session.id },
      select: { status: true },
    });

    record(
      'T1-diagnostico-rechaza-respuesta-tardia',
      'con 50 min reales transcurridos (límite 45), submitAnswer RECHAZA la respuesta',
      rechazado,
      rechazado ? `rechazado: ${mensaje}` : '❌ PERMITIDO: la respuesta se guardó como si el examen siguiera vivo'
    );
    record(
      'T2-diagnostico-se-autocierra',
      'la sesión de diagnóstico quedó COMPLETED_BY_TIMEOUT, no IN_PROGRESS',
      after.status === 'COMPLETED_BY_TIMEOUT',
      `status final: ${after.status}`
    );
  } else {
    record('T1-diagnostico-rechaza-respuesta-tardia', 'no se pudo montar la sonda', false, JSON.stringify(diag));
  }

  // ── 2. SIMULACRO: el camino REAL es recordSimulatorSync (sendBeacon) ─────
  const sim = await simulatorDb.startSimulation(PROBE_PROFILE_ID);
  if (sim.ok) {
    const firstQuestionId = sim.payload.questions[0].id;
    const examDurationSecs = sim.payload.timeLimitSecs;

    // "Reloj congelado": en la base ya pasó más que la duración completa del
    // examen (p. ej. 180 min de la UNAM) — exactamente lo que un cronómetro
    // manipulado en el navegador nunca reflejaría.
    await backdate(sim.payload.sessionId, examDurationSecs + 5 * 60);

    const syncResult = await simulatorDb.recordSimulatorSync({
      userProfileId: PROBE_PROFILE_ID,
      sessionId: sim.payload.sessionId,
      answers: [{ questionId: firstQuestionId, selectedOption: 'A', position: 0, timeSpentSecs: 1 }],
      integrity: { tabBlurCount: 0, rightClickAttempts: 0, keyboardShortcutAttempts: 0 },
      suspicionEvents: [],
      completedFullscreen: false,
    });

    const afterSim = await prisma.examSession.findUniqueOrThrow({
      where: { id: sim.payload.sessionId },
      select: { status: true },
    });

    record(
      'T3-simulacro-rechaza-sync-tardio',
      'con el tiempo del examen ya agotado, recordSimulatorSync (el camino real del beacon) RECHAZA el lote',
      syncResult.ok === false && syncResult.code === 'NOT_IN_PROGRESS',
      `resultado: ${JSON.stringify(syncResult)}`
    );
    record(
      'T4-simulacro-se-autocierra',
      'la sesión de simulacro quedó COMPLETED_BY_TIMEOUT, no IN_PROGRESS',
      afterSim.status === 'COMPLETED_BY_TIMEOUT',
      `status final: ${afterSim.status}`
    );
  } else {
    record('T3-simulacro-rechaza-sync-tardio', 'no se pudo montar la sonda', false, JSON.stringify(sim));
  }

  console.log('┌─ Resultado ──────────────────────────────────────────────────');
  for (const c of checks) {
    console.log(`│ ${c.ok ? '✅' : '❌'} ${c.id.padEnd(32)} ${c.descripcion}`);
    console.log(`│      ↳ ${c.detalle}`);
  }
  console.log('└──────────────────────────────────────────────────────────────');
  const fallos = checks.filter((c) => !c.ok);
  console.log(`\n${checks.length - fallos.length}/${checks.length} en verde.`);
  if (fallos.length > 0) process.exitCode = 1;

  await cleanup();
}

main()
  .catch(async (err) => {
    console.error(err);
    await cleanup().catch(() => {});
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
