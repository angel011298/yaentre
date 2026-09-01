/**
 * scripts/perf-audit.ts (G59) — Medición real de los flujos críticos contra la
 * base de datos de producción.
 *
 * Qué hace, y por qué así:
 *   1. Instrumenta el cliente Prisma con `log: [{ emit: 'event', level: 'query' }]`
 *      — es la ÚNICA forma de ver el SQL que Prisma realmente emite (las
 *      relaciones anidadas se resuelven con consultas separadas, no con JOIN,
 *      salvo con `relationJoins`). Sin esto, un N+1 es invisible desde el código.
 *   2. Corre cada flujo crítico REAL (los mismos módulos de `src/lib/db/*` que
 *      usa la app, no una reimplementación) y cuenta consultas + latencia.
 *   3. Vuelca el SQL distinto a un archivo para pasarlo por EXPLAIN ANALYZE.
 *
 * `scripts/tsconfig.perf.json` sustituye `next/cache` por un pass-through: lo
 * que se mide es el camino FRÍO (caché vacío), que es el peor caso real.
 *
 * Es de SOLO LECTURA sobre datos de usuario: ningún flujo aquí escribe.
 *
 * Uso:  pnpm perf:audit [--label antes|despues] [--json <ruta>]
 */
import './lib/env';
import { PrismaClient } from '@prisma/client';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

// ─────────────────────────── Instrumentación ───────────────────────────

interface CapturedQuery {
  query: string;
  params: string;
  durationMs: number;
}

const captured: CapturedQuery[] = [];
let capturing = false;

const prisma = new PrismaClient({
  log: [{ emit: 'event', level: 'query' }],
});

prisma.$on('query', (e) => {
  if (!capturing) return;
  captured.push({ query: e.query, params: e.params, durationMs: e.duration });
});

// `src/lib/db/prisma.ts` reutiliza `globalThis.prisma` si ya existe (patrón
// anti-reconexión de Next en dev). Sembrarlo ANTES de importar cualquier
// módulo de `src/lib/db/*` hace que TODA la app use este cliente instrumentado
// — así se mide el código real, no una reimplementación.
(globalThis as unknown as { prisma?: unknown }).prisma = prisma;

export interface FlowResult {
  name: string;
  description: string;
  queries: number;
  dbMs: number;
  wallMs: number;
  statements: CapturedQuery[];
}

const results: FlowResult[] = [];

async function flow(name: string, description: string, fn: () => Promise<unknown>): Promise<void> {
  // Calentamiento: la primera consulta de una conexión paga el arranque del
  // motor de Prisma y el plan en frío — medir eso sería medir el proceso, no
  // la consulta.
  try {
    await fn();
  } catch (err) {
    console.error(`  !! ${name} falló en el calentamiento:`, (err as Error).message);
    results.push({ name, description, queries: -1, dbMs: -1, wallMs: -1, statements: [] });
    return;
  }

  captured.length = 0;
  capturing = true;
  const t0 = performance.now();
  await fn();
  const wallMs = performance.now() - t0;
  capturing = false;

  const statements = [...captured];
  results.push({
    name,
    description,
    queries: statements.length,
    dbMs: statements.reduce((acc, q) => acc + q.durationMs, 0),
    wallMs,
    statements,
  });
}

// ─────────────────────────── Sujeto de prueba ───────────────────────────

async function pickBusiestStudent(): Promise<{ profileId: string; areaId: string; examId: string }> {
  const rows = await prisma.$queryRaw<{ id: string; n: bigint }[]>`
    SELECT up.id,
           (SELECT count(*) FROM session_answers sa
              JOIN exam_sessions s ON s.id = sa."sessionId"
             WHERE s."userProfileId" = up.id) AS n
      FROM user_profiles up
     WHERE up."targetCareerId" IS NOT NULL AND up."targetExamId" IS NOT NULL
     ORDER BY n DESC
     LIMIT 1
  `;
  if (rows.length === 0) throw new Error('No hay ningún perfil con carrera y examen meta.');

  const profile = await prisma.userProfile.findUniqueOrThrow({
    where: { id: rows[0].id },
    select: { id: true, targetExamId: true, targetCareer: { select: { areaId: true } } },
  });
  return {
    profileId: profile.id,
    areaId: profile.targetCareer!.areaId,
    examId: profile.targetExamId!,
  };
}

// ─────────────────────────────── Main ───────────────────────────────

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const label = args[args.indexOf('--label') + 1] ?? 'sin-etiqueta';
  const jsonPath =
    args.includes('--json') ? args[args.indexOf('--json') + 1] : `scripts/logs/perf-${label}.json`;

  const subject = await pickBusiestStudent();
  console.log(`Sujeto: perfil=${subject.profileId} area=${subject.areaId}\n`);

  // Los módulos se importan aquí (no arriba) para que se evalúen DESPUÉS de
  // sembrar `globalThis.prisma` con el cliente instrumentado.
  const dbPrisma = await import('../src/lib/db/prisma');
  if (dbPrisma.prisma !== (prisma as unknown as typeof dbPrisma.prisma)) {
    throw new Error('El singleton de src/lib/db/prisma.ts no tomó el cliente instrumentado.');
  }

  const adaptive = await import('../src/lib/db/adaptive');
  const dashboard = await import('../src/lib/db/dashboard');
  const diagnostic = await import('../src/lib/db/diagnostic');
  const progress = await import('../src/lib/db/progress');
  const simulator = await import('../src/lib/db/simulator');
  const streak = await import('../src/lib/db/streak');
  const paywall = await import('../src/lib/db/paywall');
  const gamification = await import('../src/lib/db/gamification');
  const drill = await import('../src/lib/db/drill');

  const { profileId, areaId, examId } = subject;

  // ── 1. Selector adaptativo (inicio de práctica libre) ──
  await flow(
    'selector-adaptativo',
    'selectNextAdaptiveQuestions(area, 10) — inicio de práctica libre',
    () => adaptive.selectNextAdaptiveQuestions(profileId, areaId, 10)
  );

  // ── 2. Generación del set diagnóstico (y del simulacro: mismo repartidor) ──
  await flow(
    'set-diagnostico',
    'buildDiagnosticQuestionSet(area, 30) — arma el set ponderado por materia',
    () => diagnostic.buildDiagnosticQuestionSet(areaId, 30)
  );

  await flow(
    'set-simulacro-140',
    'buildDiagnosticQuestionSet(area, 140) — set del simulacro completo',
    () => diagnostic.buildDiagnosticQuestionSet(areaId, 140)
  );

  // ── 3. Carga del simulador (reanudación: el payload completo) ──
  await flow(
    'simulador-estado',
    'loadSimulatorState — sesión vigente + 140 reactivos + pasajes',
    () => simulator.loadSimulatorState(profileId)
  );

  const lastFinished = await prisma.examSession.findFirst({
    where: { userProfileId: profileId, status: { in: ['COMPLETED', 'COMPLETED_BY_TIMEOUT'] } },
    orderBy: { finishedAt: 'desc' },
    select: { id: true },
  });

  if (lastFinished) {
    await flow(
      'simulador-resultados',
      'loadSimulatorResult — desglose por materia + percentil + estrategia',
      () => simulator.loadSimulatorResult(profileId, lastFinished.id)
    );
    await flow(
      'simulador-revision',
      'loadSimulatorReview — reactivos fallados con explicación capa 1',
      () => simulator.loadSimulatorReview(profileId, lastFinished.id)
    );
  }

  // ── 4. Entrómetro ──
  await flow(
    'entrometro-recalculo',
    'recomputeLearningProfile — predicción persistida (corre en cada fin de sesión)',
    () => adaptive.recomputeLearningProfile(profileId)
  );
  await flow(
    'entrometro-delta-semanal',
    'computeWeekOverWeekDelta — reconstruye la predicción de hace 7 días',
    () => adaptive.computeWeekOverWeekDelta(profileId)
  );
  await flow(
    'entrometro-percentil',
    'percentil del simulacro — agregación sobre exam_sessions de TODOS los usuarios',
    () =>
      prisma.examSession.findMany({
        where: {
          examId,
          mode: 'FULL_SIMULATION',
          status: { in: ['COMPLETED', 'COMPLETED_BY_TIMEOUT'] },
          score: { not: null },
        },
        select: { score: true },
      })
  );

  // ── 5. Dashboard del alumno (el Promise.all real de app/(app)/app/page.tsx) ──
  await flow('dashboard', 'Dashboard completo — 9 loaders en paralelo', async () => {
    const now = new Date();
    await Promise.all([
      dashboard.loadExamCountdown(profileId, now),
      dashboard.loadWeakestTopics(profileId, 3),
      dashboard.loadRecentSimulations(profileId, 3),
      dashboard.loadHeatmapData(profileId, now),
      dashboard.loadEntrometroAccess(profileId),
      adaptive.computeCareerStrategy(profileId),
      adaptive.computeWeekOverWeekDelta(profileId, now),
      gamification.loadStreakStatus(profileId, now),
      gamification.loadMasteredSubjectBadges(profileId),
    ]);
  });

  // ── 6. Pantalla de progreso ──
  await flow('progreso', 'Progreso completo — 5 loaders en paralelo', async () => {
    await Promise.all([
      dashboard.loadEntrometroAccess(profileId),
      progress.loadEntrometroHistory(profileId),
      progress.loadSubjectMastery(profileId),
      progress.loadSimulationHistory(profileId),
      progress.loadCumulativeStats(profileId),
    ]);
  });

  // ── 7. Panel parental (los mismos loaders, tras el gate) ──
  await flow(
    'panel-parental',
    'loadParentDashboardData tras el gate — 6 loaders sobre el alumno vinculado',
    async () => {
      const now = new Date();
      await Promise.all([
        streak.getStreak(profileId),
        prisma.learningProfile.findUnique({
          where: { userProfileId: profileId },
          select: { predictedScore: true },
        }),
        adaptive.computeWeekOverWeekDelta(profileId, now),
        dashboard.loadExamCountdown(profileId, now),
        dashboard.loadRecentSimulations(profileId, 3),
        dashboard.loadHeatmapData(profileId, now, 7),
      ]);
    }
  );

  // ── 8. Muro suave (se evalúa en casi toda pantalla con contenido) ──
  await flow('muro-suave-drill', 'evaluateDrillGate — pago + reactivos de hoy', () =>
    paywall.evaluateDrillGate(profileId)
  );

  // ── 9. Opciones de práctica ──
  await flow('opciones-practica', 'loadPracticeOptions — materias/temas del área + débiles', () =>
    drill.loadPracticeOptions(profileId)
  );

  // ── 10. Recálculo post-sesión (lo más caro del cierre de un simulacro) ──
  await flow(
    'recalculo-temas-debiles',
    'recomputeWeakTopics — reescribe WeakTopic desde TODO el historial',
    () => adaptive.recomputeWeakTopics(profileId)
  );
  await flow('recalculo-racha', 'recomputeStreak — recorre todas las sesiones terminadas', () =>
    streak.recomputeStreak(profileId)
  );

  // ─────────────────────────── Reporte ───────────────────────────

  console.log(`\n=== PERF ${label.toUpperCase()} ===\n`);
  const pad = (s: string, n: number) => s.padEnd(n);
  console.log(`${pad('flujo', 28)}${pad('consultas', 11)}${pad('db ms', 10)}wall ms`);
  console.log('-'.repeat(60));
  for (const r of results) {
    console.log(
      `${pad(r.name, 28)}${pad(String(r.queries), 11)}${pad(r.dbMs.toFixed(1), 10)}${r.wallMs.toFixed(1)}`
    );
  }

  const totalQueries = results.reduce((a, r) => a + Math.max(0, r.queries), 0);
  console.log('-'.repeat(60));
  console.log(`${pad('TOTAL', 28)}${totalQueries}`);

  mkdirSync(dirname(jsonPath), { recursive: true });
  writeFileSync(jsonPath, JSON.stringify({ label, subject, results }, null, 2), 'utf8');
  console.log(`\nDetalle (SQL emitido por flujo) → ${jsonPath}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
