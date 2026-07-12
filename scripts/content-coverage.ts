/**
 * scripts/content-coverage.ts — Reporte de cobertura de reactivos (CC-05)
 *
 * Imprime, por área y materia, cuántos reactivos hay verificados vs. pendientes,
 * y el progreso hacia la meta de 1,500 reactivos verificados (PRD §8).
 *
 * Uso:
 *   pnpm content:coverage [--exam <examId>]
 */
import 'dotenv/config';
import { getPrisma, disconnect } from './lib/content-db';

const GOAL_VERIFIED = 1500;

interface SubjectRow {
  subject: string;
  verified: number;
  pending: number;
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

async function main() {
  const examId = parseExamFilter(process.argv.slice(2));
  const prisma = getPrisma();

  // Trae la taxonomía con el conteo de reactivos por tema, agrupado.
  const areas = await prisma.area.findMany({
    where: examId ? { examId } : undefined,
    include: {
      exam: { include: { level: { include: { institution: true } } } },
      subjects: {
        include: {
          topics: {
            include: {
              _count: { select: { questions: true } },
              questions: { select: { isVerified: true } },
            },
          },
        },
        orderBy: { position: 'asc' },
      },
    },
    orderBy: { position: 'asc' },
  });

  console.log('═'.repeat(64));
  console.log('🦉 Acierta — Cobertura de reactivos por área y materia');
  console.log('═'.repeat(64));

  if (areas.length === 0) {
    console.log(
      '\n(No hay áreas en la DB todavía. Siembra la taxonomía con pnpm prisma:seed.)\n',
    );
    return;
  }

  let totalVerified = 0;
  let totalPending = 0;
  const report: AreaRow[] = [];

  for (const area of areas) {
    const subjectRows: SubjectRow[] = [];
    for (const subject of area.subjects) {
      let verified = 0;
      let pending = 0;
      for (const topic of subject.topics) {
        for (const q of topic.questions) {
          if (q.isVerified) verified++;
          else pending++;
        }
      }
      subjectRows.push({ subject: subject.name, verified, pending });
      totalVerified += verified;
      totalPending += pending;
    }
    report.push({ area: area.name, subjects: subjectRows });
  }

  for (const areaRow of report) {
    console.log(`\n▸ ${areaRow.area}`);
    for (const s of areaRow.subjects) {
      const total = s.verified + s.pending;
      const pct = total === 0 ? 0 : Math.round((s.verified / total) * 100);
      console.log(
        `   ${s.subject.padEnd(28)} ${bar(s.verified, total)} ` +
          `${String(s.verified).padStart(4)}✓ / ${String(s.pending).padStart(4)}⧗  (${pct}%)`,
      );
    }
  }

  const grandTotal = totalVerified + totalPending;
  const goalPct = Math.round((totalVerified / GOAL_VERIFIED) * 100);

  console.log('\n' + '═'.repeat(64));
  console.log(
    `TOTAL: ${totalVerified} verificados · ${totalPending} pendientes · ${grandTotal} en banco`,
  );
  console.log(
    `META 1,500 verificados: ${bar(totalVerified, GOAL_VERIFIED, 30)} ${goalPct}%`,
  );
  console.log('═'.repeat(64));
}

main()
  .catch((err) => {
    console.error(`\n❌ Error: ${(err as Error).message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnect();
  });
