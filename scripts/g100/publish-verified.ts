/**
 * scripts/g100/publish-verified.ts — PUBLICA los reemplazos aprobados a ciegas (G100).
 *
 * Paso 3→4 del proceso de reemplazo (instrucciones CLO §5):
 *
 *   1. `pnpm content:insert --topic <id> --file <tema.json> --lot-dir <lote>`
 *      inserta cada archivo del lote con isVerified=false (TEMARIO_ONLY: sin
 *      fragmentos de guía — ver `isRestrictedGroundingSource`).
 *   2. (este script) toma el INFORME de la verificación ciega que se hizo sobre
 *      los mismos archivos (`blind-lot.ts check`) y pasa a isVerified=true SOLO
 *      los reactivos que ese informe APROBÓ, con el mismo registro `verification`
 *      que deja el pipeline de sesión (`pipeline: 'session-v1'`).
 *   3. `pnpm backup:export` y commit del respaldo.
 *
 * Quién es quién: un reactivo se localiza por (tema, enunciado normalizado) —el
 * mismo criterio de duplicados de `content:insert`— y se REHÚSA publicar si
 *   · no existe (no se insertó),
 *   · está ligado a cualquier fragmento de una fuente restringida (CENEVAL/EXANI),
 *   · su enunciado coincide con más de una fila.
 * Nada se borra y nada se despublica aquí.
 *
 * Uso:
 *   npx tsx scripts/g100/publish-verified.ts --lot <carpeta> --report <informe.json> [--apply]
 * Sin `--apply` es un ensayo: lista lo que haría y no escribe.
 *
 * GUARDRAIL: cero llamadas a red o a la API de Anthropic.
 */
import '../lib/env';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { getPrisma, disconnect } from '../lib/content-db';
import { isRestrictedGroundingSource } from '../lib/grounding';
import { normalizeStem } from '../lib/question-draft-schema';
import { lotHash } from './blind-lot';

interface Args {
  lot: string;
  report: string;
  apply: boolean;
}

function parseArgs(argv: string[]): Args {
  const a: Partial<Args> = { apply: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--lot') a.lot = argv[++i];
    else if (argv[i] === '--report') a.report = argv[++i];
    else if (argv[i] === '--apply') a.apply = true;
    else if (argv[i].startsWith('--')) console.warn(`⚠️  Flag desconocido: ${argv[i]}`);
  }
  if (!a.lot || !a.report) throw new Error('Uso: --lot <carpeta> --report <informe.json> [--apply]');
  return a as Args;
}

interface ReportRow {
  hash: string;
  file: string;
  status: string;
  confidence?: number;
  model?: string | null;
  usedCalculation?: boolean;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const lotDir = resolve(args.lot);
  const { TOPICS } = (await import(pathToFileURL(join(lotDir, 'build-data.mjs')).href)) as {
    TOPICS: { id: string; file: string; name: string }[];
  };
  const report = JSON.parse(readFileSync(args.report, 'utf8')) as { rows: ReportRow[] };
  const prisma = getPrisma();

  let toPublish = 0;
  const problems: string[] = [];
  for (const topic of TOPICS) {
    const drafts = JSON.parse(readFileSync(join(lotDir, topic.file), 'utf8')) as {
      stem: string;
      passage: { ref: string } | null;
    }[];
    const rows = await prisma.question.findMany({
      where: { topicId: topic.id },
      select: {
        id: true,
        stem: true,
        options: true,
        isVerified: true,
        sourceChunks: { select: { sourceChunk: { select: { contentSource: { select: { name: true, institution: true, fileRef: true } } } } } },
      },
    });
    for (const d of drafts) {
      const verdict = report.rows.find((r) => r.hash === lotHash(d));
      if (!verdict || verdict.status !== 'APROBADO') {
        problems.push(`${topic.name}: "${d.stem.slice(0, 50)}…" no está APROBADO en el informe — no se publica.`);
        continue;
      }
      const matches = rows.filter((r) => normalizeStem(r.stem) === normalizeStem(d.stem));
      if (matches.length !== 1) {
        problems.push(`${topic.name}: "${d.stem.slice(0, 50)}…" coincide con ${matches.length} fila(s) (¿falta content:insert?).`);
        continue;
      }
      const row = matches[0];
      if (row.sourceChunks.some((l) => isRestrictedGroundingSource(l.sourceChunk.contentSource))) {
        problems.push(`${topic.name}: "${d.stem.slice(0, 50)}…" está LIGADO a una fuente CENEVAL/EXANI — no se publica.`);
        continue;
      }
      if (row.isVerified) continue; // ya publicado: idempotente
      toPublish++;
      console.log(`${args.apply ? '＋ publica' : '· publicaría'} ${row.id} (${topic.name}, confianza ${verdict.confidence})`);
      // El veredicto aprobó la CLAVE, así que la opción elegida es la correcta de la fila.
      const keyId = (row.options as { id: string; isCorrect: boolean }[]).find((o) => o.isCorrect)?.id;
      if (!keyId) {
        problems.push(`${topic.name}: ${row.id} no tiene opción correcta en la base — no se publica.`);
        toPublish--;
        continue;
      }
      if (args.apply) {
        await prisma.question.update({
          where: { id: row.id },
          data: {
            isVerified: true,
            verification: {
              audit: null,
              reasons: [],
              verdict: {
                model: verdict.model ?? 'subagente de Claude Code',
                usage: { inputTokens: 0, outputTokens: 0 },
                problems: [],
                reasoning: 'Verificación ciega G100 (sesión independiente, sin el prompt de generación); informe en docs/content-batches/g100-ceneval/.',
                confidence: verdict.confidence ?? 0,
                verifiedAt: new Date().toISOString(),
                chosenOption: keyId,
                usedCalculation: verdict.usedCalculation ?? false,
              },
              decision: 'AUTO_APPROVED',
              pipeline: 'session-v1',
              generatorModel: 'claude-code-session',
              generatorOption: keyId,
              batch: 'g100-ceneval',
            },
          },
        });
      }
    }
  }
  console.log('─'.repeat(60));
  console.log(`${args.apply ? 'Publicados' : 'Se publicarían'}: ${toPublish}`);
  if (problems.length > 0) {
    console.error(`❌ ${problems.length} problema(s):`);
    for (const p of problems) console.error('   ' + p);
    process.exitCode = 1;
  }
  if (!args.apply) console.log('Ensayo: no se escribió nada. Repite con --apply.');
}

main()
  .catch((err) => {
    console.error(`\n❌ Error: ${(err as Error).message}`);
    process.exitCode = 1;
  })
  .finally(disconnect);
