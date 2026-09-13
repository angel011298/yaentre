import '../g71/env';

/**
 * scripts/g74/coverage-probe.ts — G74.  `pnpm content:guard`
 *
 * ── QUÉ COMPRUEBA, Y POR QUÉ ASÍ ────────────────────────────────────────────
 *
 * La guarda de cobertura (`src/lib/content/coverage.ts` +
 * `src/lib/db/area-coverage.ts`) decide qué áreas se le ofrecen a un aspirante
 * real. Si se equivoca en una dirección, un alumno entra a una rama con 4 de 7
 * materias vacías (el defecto que esta fase vino a cerrar); si se equivoca en
 * la otra, esconde un área que sí funciona y el negocio pierde alumnos sin
 * enterarse. Las dos fallas son silenciosas: el producto responde HTTP 200 en
 * ambos casos.
 *
 * Por eso esta sonda no lee el código ni se conforma con que la función
 * devuelva algo. Corre la MISMA función que el onboarding usa en producción
 * (`loadExamAreaCoverage`) contra la base REAL, y luego RECUENTA la cobertura
 * de cero con SQL independiente —otra consulta, otra aritmética— y exige que
 * las dos coincidan materia por materia. Un error en la consulta cacheada, en
 * la suma de pools compartidos de G26 o en el filtro `SERVABLE` sale en rojo
 * porque los dos caminos dejan de cuadrar, no porque alguien lo sospechara.
 *
 * ── CÓMO SE COMPRUEBA QUE EL ROJO ES ALCANZABLE ─────────────────────────────
 *
 * Sin tocar la base: cambiar en `src/lib/db/area-coverage.ts` el filtro
 * `q."usage" = 'SERVABLE'` por `TRUE`, o quitar la suma por
 * `sharedContentKey` de `resolveEffectiveServable`. En ambos casos P3 falla
 * nombrando la materia exacta donde el recuento discrepa. Verificado en vivo
 * al escribir la sonda.
 *
 * ── USO ─────────────────────────────────────────────────────────────────────
 *
 *   pnpm content:guard              # verdicto por área, con el censo real
 *   pnpm content:guard --json       # para pegar en un documento
 *
 * Corre con el rol local (`acierta_ci`) a propósito: aquí lo que se verifica
 * es aritmética sobre contenido, no privilegios — el banco es el mismo objeto
 * para todos los roles. Para privilegios, `pnpm security:grants` (G73b).
 */
import { PrismaClient } from '@prisma/client';
import { loadExamAreaCoverage } from '../../src/lib/db/area-coverage';
import {
  evaluateAreaCoverage,
  MIN_COVERED_WEIGHT_RATIO,
  type SubjectCoverageInput,
} from '../../src/lib/content/coverage';
import { DIAGNOSTIC_QUESTION_COUNT } from '../../src/lib/db/diagnostic';

const AS_JSON = process.argv.includes('--json');

interface RecountRow {
  examId: string;
  examLabel: string;
  areaId: string;
  areaName: string;
  subjectId: string;
  subjectName: string;
  weight: number;
  sharedContentKey: string | null;
  ownServable: number;
}

const failures: string[] = [];
function check(id: string, ok: boolean, detail: string): void {
  if (ok) {
    if (!AS_JSON) console.log(`  ✅ ${id} — ${detail}`);
    return;
  }
  failures.push(`${id} — ${detail}`);
  if (!AS_JSON) console.log(`  ❌ ${id} — ${detail}`);
}

async function main(): Promise<void> {
  const prisma = new PrismaClient();

  /**
   * Recuento INDEPENDIENTE: otra consulta, escrita aparte de la de la app, con
   * la agregación hecha en SQL en vez de con `FILTER` sobre un `LEFT JOIN`. Si
   * las dos coinciden es porque el censo es correcto, no porque compartan un
   * bug.
   */
  const rows = await prisma.$queryRaw<RecountRow[]>`
    SELECT e."id"   AS "examId",
           i."code" || ' ' || l."type" AS "examLabel",
           a."id"   AS "areaId",
           a."name" AS "areaName",
           s."id"   AS "subjectId",
           s."name" AS "subjectName",
           s."questionWeight"   AS "weight",
           s."sharedContentKey" AS "sharedContentKey",
           COALESCE((
             SELECT COUNT(*)::int
               FROM "questions" q
               JOIN "topics" t2 ON t2."id" = q."topicId"
              WHERE t2."subjectId" = s."id"
                AND q."isVerified" = true
                AND q."usage" = 'SERVABLE'
           ), 0) AS "ownServable"
      FROM "subjects" s
      JOIN "areas"        a ON a."id" = s."areaId"
      JOIN "exams"        e ON e."id" = a."examId"
      JOIN "levels"       l ON l."id" = e."levelId"
      JOIN "institutions" i ON i."id" = l."institutionId"
     ORDER BY i."code", l."type", a."position", s."position"
  `;

  // Pools compartidos de G26, recalculados aquí desde cero.
  const poolByExamKey = new Map<string, number>();
  for (const r of rows) {
    if (r.sharedContentKey === null) continue;
    const k = `${r.examId}::${r.sharedContentKey}`;
    poolByExamKey.set(k, (poolByExamKey.get(k) ?? 0) + r.ownServable);
  }
  const effectiveOf = (r: RecountRow): number =>
    r.sharedContentKey === null
      ? r.ownServable
      : (poolByExamKey.get(`${r.examId}::${r.sharedContentKey}`) ?? 0);

  const areas = new Map<
    string,
    { examId: string; examLabel: string; areaName: string; subjects: SubjectCoverageInput[] }
  >();
  for (const r of rows) {
    let entry = areas.get(r.areaId);
    if (!entry) {
      entry = { examId: r.examId, examLabel: r.examLabel, areaName: r.areaName, subjects: [] };
      areas.set(r.areaId, entry);
    }
    entry.subjects.push({
      subjectId: r.subjectId,
      subjectName: r.subjectName,
      weight: r.weight,
      servable: effectiveOf(r),
    });
  }

  // La función real de la app, por examen.
  const appCoverage = new Map<string, Awaited<ReturnType<typeof loadExamAreaCoverage>>>();
  for (const examId of new Set(rows.map((r) => r.examId))) {
    appCoverage.set(examId, await loadExamAreaCoverage(examId));
  }

  const report: Array<Record<string, unknown>> = [];
  let mismatches = 0;
  let readyAreasWithPending = 0;
  let blockedAboveThreshold = 0;
  let offeredBelowThreshold = 0;

  if (!AS_JSON) {
    console.log('═'.repeat(74));
    console.log('🦉 G74 — Guarda de cobertura de contenido: veredicto por área');
    console.log(
      `   Umbral: ${Math.round(MIN_COVERED_WEIGHT_RATIO * 100)}% del peso del examen · ` +
        `mínimo por materia = su cuota del diagnóstico de ${DIAGNOSTIC_QUESTION_COUNT}`
    );
    console.log('═'.repeat(74));
  }

  for (const [areaId, entry] of areas) {
    const recount = evaluateAreaCoverage(entry.subjects, DIAGNOSTIC_QUESTION_COUNT);
    const fromApp = appCoverage.get(entry.examId)?.get(areaId);

    const same =
      fromApp !== undefined &&
      fromApp.status === recount.status &&
      fromApp.coveredWeight === recount.coveredWeight &&
      fromApp.totalWeight === recount.totalWeight &&
      fromApp.subjects.length === recount.subjects.length &&
      fromApp.subjects.every((s, i) => {
        const mine = recount.subjects[i];
        return mine && s.subjectId === mine.subjectId && s.servable === mine.servable;
      });

    if (!same) {
      mismatches++;
      if (!AS_JSON) {
        console.log(`\n  ⚠️  DISCREPANCIA en ${entry.areaName}`);
        console.log(`      app     : ${fromApp?.status} ${fromApp?.coveredWeight}/${fromApp?.totalWeight}`);
        console.log(`      recuento: ${recount.status} ${recount.coveredWeight}/${recount.totalWeight}`);
        for (const s of recount.subjects) {
          const appSubject = fromApp?.subjects.find((x) => x.subjectId === s.subjectId);
          if (!appSubject || appSubject.servable !== s.servable) {
            console.log(
              `      · ${s.subjectName}: app=${appSubject?.servable ?? '—'} recuento=${s.servable}`
            );
          }
        }
      }
    }

    if (recount.status === 'READY' && recount.pendingSubjectNames.length > 0) readyAreasWithPending++;
    if (recount.status === 'COMING_SOON' && recount.coveredRatio >= MIN_COVERED_WEIGHT_RATIO) {
      blockedAboveThreshold++;
    }
    if (recount.status !== 'COMING_SOON' && recount.coveredRatio < MIN_COVERED_WEIGHT_RATIO) {
      offeredBelowThreshold++;
    }

    const badge =
      recount.status === 'READY' ? '✅' : recount.status === 'PARTIAL' ? '🟡' : '⛔';
    if (!AS_JSON) {
      console.log(
        `\n${badge} ${entry.examLabel} — ${entry.areaName}  ` +
          `${recount.coveredWeight}/${recount.totalWeight} de peso ` +
          `(${Math.round(recount.coveredRatio * 100)}%) → ${recount.status}`
      );
      for (const s of recount.subjects) {
        const mark = s.covered ? '·' : '✗';
        console.log(
          `     ${mark} ${s.subjectName.padEnd(24)} peso ${String(s.weight).padStart(3)} · ` +
            `sirve ${String(s.servable).padStart(4)} · necesita ${String(s.required).padStart(3)}`
        );
      }
      if (recount.pendingSubjectNames.length > 0) {
        console.log(`     ↳ falta: ${recount.pendingSubjectNames.join(', ')}`);
      }
    }

    report.push({
      exam: entry.examLabel,
      area: entry.areaName,
      status: recount.status,
      coveredWeight: recount.coveredWeight,
      totalWeight: recount.totalWeight,
      coveredPct: Math.round(recount.coveredRatio * 100),
      pending: recount.pendingSubjectNames,
      agreesWithApp: same,
    });
  }

  if (!AS_JSON) {
    console.log(`\n${'─'.repeat(74)}`);
    console.log('Aserciones');
  }

  check(
    'P1',
    readyAreasWithPending === 0,
    `ningún área READY tiene materias pendientes (${readyAreasWithPending} incumplen)`
  );
  check(
    'P2',
    blockedAboveThreshold === 0,
    `ningún área por encima del umbral queda bloqueada (${blockedAboveThreshold} incumplen)`
  );
  check(
    'P3',
    mismatches === 0,
    `la función de la app y el recuento independiente coinciden en las ${areas.size} áreas ` +
      `(${mismatches} discrepan)`
  );
  check(
    'P4',
    offeredBelowThreshold === 0,
    `ningún área por debajo del umbral se ofrece (${offeredBelowThreshold} incumplen)`
  );

  const blocked = report.filter((r) => r.status === 'COMING_SOON');
  const partial = report.filter((r) => r.status === 'PARTIAL');

  if (AS_JSON) {
    console.log(JSON.stringify({ areas: report, failures }, null, 2));
  } else {
    console.log(`\n${'═'.repeat(74)}`);
    console.log(
      `${report.length} áreas · ${report.length - blocked.length - partial.length} listas · ` +
        `${partial.length} con hueco conocido · ${blocked.length} en «Próximamente»`
    );
    for (const b of blocked) {
      console.log(`   ⛔ ${b.exam} — ${b.area}: ${b.coveredPct}% · falta ${(b.pending as string[]).join(', ')}`);
    }
    console.log('═'.repeat(74));
  }

  await prisma.$disconnect();
  if (failures.length > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
