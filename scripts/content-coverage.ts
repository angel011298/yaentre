/**
 * scripts/content-coverage.ts — Reporte de cobertura de reactivos (CC-05 / F2)
 *
 * Imprime, por área y materia:
 *   - reactivos verificados/servibles vs pendientes de resolución,
 *   - la TASA DE AUTO-APROBACIÓN del pipeline adversarial (F2).
 *
 * La tasa de auto-aprobación es la métrica de SALUD del pipeline: si cae
 * debajo de ~75%, el problema está en el GENERADOR (mejorar su system prompt),
 * no en revisar a mano en volumen — no hay revisión humana en este proyecto.
 *
 * Uso:
 *   pnpm content:coverage [--exam <examId>]
 */
import './lib/env';
import { getPrisma, disconnect } from './lib/content-db';

const GOAL_VERIFIED = 1500;

/** Umbral de salud del pipeline: por debajo, el generador necesita mejora. */
const HEALTHY_AUTO_APPROVAL = 0.75;

interface SubjectRow {
  subject: string;
  verified: number;
  pendingResolution: number; // sin veredicto aún (no han pasado por F2)
  unpublished: number; // veredicto adverso: quedaron sin publicar
  autoApproved: number; // decision AUTO_APPROVED en verification
  sourced: number; // F2b: anclados en fragmento fuente real
  temarioOnly: number; // F2b: generados solo con el temario
  topicsWithChunks: number; // F2b: temas de la materia con ≥1 SourceChunk
  topicsTotal: number;
}
interface AreaRow {
  area: string;
  subjects: SubjectRow[];
}

function bar(verified: number, total: number, width = 20): string {
  if (total === 0) return '░'.repeat(width);
  const filled = Math.round((verified / total) * width);
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

function parseExamFilter(argv: string[]): string | undefined {
  const idx = argv.indexOf('--exam');
  return idx !== -1 ? argv[idx + 1] : undefined;
}

interface VerificationShape {
  decision?: string;
}

async function main() {
  const examId = parseExamFilter(process.argv.slice(2));
  const prisma = getPrisma();

  const areas = await prisma.area.findMany({
    where: examId ? { examId } : undefined,
    include: {
      exam: { include: { level: { include: { institution: true } } } },
      subjects: {
        include: {
          topics: {
            include: {
              questions: {
                select: {
                  isVerified: true,
                  verification: true,
                  usage: true,
                  groundingStatus: true,
                },
              },
              _count: { select: { sourceChunks: true } },
            },
          },
        },
        orderBy: { position: 'asc' },
      },
    },
    orderBy: { position: 'asc' },
  });

  console.log('═'.repeat(72));
  console.log('🦉 YaEntre — Cobertura de reactivos y salud del pipeline adversarial');
  console.log('═'.repeat(72));

  if (areas.length === 0) {
    console.log('\n(No hay áreas en la DB todavía. Siembra la taxonomía con pnpm prisma:seed.)\n');
    return;
  }

  let totalVerified = 0;
  let totalPending = 0;
  let totalAutoApproved = 0;
  let totalResolved = 0;
  let totalSourced = 0;
  let totalTemarioOnly = 0;
  let totalTopicsWithChunks = 0;
  let totalTopics = 0;
  const report: AreaRow[] = [];

  for (const area of areas) {
    const subjectRows: SubjectRow[] = [];
    for (const subject of area.subjects) {
      const row: SubjectRow = {
        subject: subject.name,
        verified: 0,
        pendingResolution: 0,
        unpublished: 0,
        autoApproved: 0,
        sourced: 0,
        temarioOnly: 0,
        topicsWithChunks: 0,
        topicsTotal: subject.topics.length,
      };
      for (const topic of subject.topics) {
        if (topic._count.sourceChunks > 0) row.topicsWithChunks++;
        for (const q of topic.questions) {
          if (q.isVerified) row.verified++;
          if (q.groundingStatus === 'SOURCED') row.sourced++;
          else row.temarioOnly++;
          const v = q.verification as VerificationShape | null;
          if (!v) {
            if (!q.isVerified) row.pendingResolution++;
          } else if (v.decision === 'AUTO_APPROVED') {
            row.autoApproved++;
          } else {
            row.unpublished++;
          }
        }
      }
      subjectRows.push(row);
      totalVerified += row.verified;
      totalPending += row.pendingResolution;
      totalAutoApproved += row.autoApproved;
      totalResolved += row.autoApproved + row.unpublished;
      totalSourced += row.sourced;
      totalTemarioOnly += row.temarioOnly;
      totalTopicsWithChunks += row.topicsWithChunks;
      totalTopics += row.topicsTotal;
    }
    report.push({ area: area.name, subjects: subjectRows });
  }

  for (const areaRow of report) {
    console.log(`\n▸ ${areaRow.area}`);
    for (const s of areaRow.subjects) {
      const total = s.verified + s.pendingResolution + s.unpublished;
      const resolved = s.autoApproved + s.unpublished;
      const rateStr =
        resolved > 0
          ? `${Math.round((s.autoApproved / resolved) * 100)}% auto-aprob.`
          : '— sin corridas';
      const grounding =
        s.sourced + s.temarioOnly > 0 ? ` · ⚓${s.sourced}/${s.temarioOnly}` : '';
      console.log(
        `   ${s.subject.padEnd(26)} ${bar(s.verified, Math.max(total, 1))} ` +
          `${String(s.verified).padStart(4)}✓ ${String(s.pendingResolution).padStart(4)}⧗ ${String(s.unpublished).padStart(3)}✋  ${rateStr}${grounding} · fuentes ${s.topicsWithChunks}/${s.topicsTotal} temas`,
      );
    }
  }

  const grandTotal = totalVerified + totalPending;
  const goalPct = Math.round((totalVerified / GOAL_VERIFIED) * 100);
  const globalRate = totalResolved > 0 ? totalAutoApproved / totalResolved : null;

  console.log('\n' + '═'.repeat(72));
  console.log(
    `TOTAL: ${totalVerified} servibles · ${totalPending} pendientes de resolución · ${grandTotal} en banco`,
  );
  if (globalRate !== null) {
    const warn =
      globalRate < HEALTHY_AUTO_APPROVAL
        ? `  ⚠️ <${HEALTHY_AUTO_APPROVAL * 100}%: el problema está en el GENERADOR — mejorar su system prompt`
        : '  ✅ pipeline sano';
    console.log(
      `TASA DE AUTO-APROBACIÓN GLOBAL: ${(globalRate * 100).toFixed(1)}% (${totalAutoApproved}/${totalResolved})${warn}`,
    );
  } else {
    console.log('TASA DE AUTO-APROBACIÓN: sin corridas del pipeline adversarial todavía.');
  }
  const totalGrounded = totalSourced + totalTemarioOnly;
  if (totalGrounded > 0) {
    console.log(
      `ANCLAJE EN FUENTES (F2b): ${totalSourced} SOURCED (${Math.round((totalSourced / totalGrounded) * 100)}%) · ${totalTemarioOnly} TEMARIO_ONLY`,
    );
  }
  console.log(
    `TEMARIO CON FRAGMENTOS FUENTE: ${totalTopicsWithChunks}/${totalTopics} temas · ${totalTopics - totalTopicsWithChunks} aún sin fuente (correr pnpm content:scan-sources tras agregar material)`,
  );
  console.log(`META 1,500 servibles: ${bar(totalVerified, GOAL_VERIFIED, 30)} ${goalPct}%`);
  console.log('═'.repeat(72));
}

main()
  .catch((err) => {
    console.error(`\n❌ Error: ${(err as Error).message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnect();
  });
