/**
 * scripts/content-blind-batch.ts — Exporta un LOTE CIEGO para verificación (G2)
 *
 * Reemplaza la llamada al verificador vía API (`verify-questions.ts`,
 * retirado). Produce un archivo JSON con SOLO lo que un sustentante vería:
 * enunciado + opciones MEZCLADAS (etiquetadas A/B/C/D en un orden distinto al
 * original, semilla determinista = id del reactivo) — NUNCA `isCorrect` ni
 * `explanations`. Ver garantía estructural en scripts/lib/blind-verification.ts
 * (`buildBlindItem`) y su test (tests/scripts/blind-verification.test.ts).
 *
 * Flujo:
 *   1. pnpm content:blind-batch --topic <id>   → genera el archivo
 *   2. Pega el archivo en una sesión de Claude Code o de chat NUEVA e
 *      INDEPENDIENTE de la que compuso los reactivos (aislamiento de sesión,
 *      no de código — esa es la garantía que reemplaza al "segundo modelo").
 *      Pídele que resuelva cada reactivo DESDE CERO (ejecutando cálculo real
 *      cuando `requiresCalculation` sea true) y que te devuelva un JSON con
 *      la forma que espera scripts/content-resolve-verification.ts:
 *      [{ "questionId": "...", "chosenOption": "A", "confidence": 0.95,
 *         "reasoning": "...", "problems": [] }, ...]
 *   3. pnpm content:resolve --file <respuestas.json>
 *
 * Reusable para el muestreo de auditoría (5%, tercera pasada con un tier de
 * modelo distinto): pásale --ids con los ids ya aprobados que arroja
 * `sampleForAudit` (scripts/lib/resolution.ts) en vez de --topic.
 *
 * Uso:
 *   npx tsx scripts/content-blind-batch.ts --topic <topicId> [--limit <n>] [--out <path>]
 *   npx tsx scripts/content-blind-batch.ts --ids <id1,id2,...> [--out <path>]
 *   npx tsx scripts/content-blind-batch.ts --all [--limit <n>] [--out <path>]
 */
import './lib/env';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { buildBlindItem, type BlindBatchItem } from './lib/blind-verification';
import {
  loadPendingQuestionsWithContext,
  loadQuestionsByIds,
  disconnect,
  type QuestionWithBlindContext,
} from './lib/content-db';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXPORT_DIR = join(__dirname, 'content-exports');

interface CliArgs {
  topicId?: string;
  ids?: string[];
  all: boolean;
  limit: number;
  out?: string;
}

function parseArgs(argv: string[]): CliArgs {
  const args: Partial<CliArgs> = { all: false, limit: 50 };
  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case '--topic':
        args.topicId = argv[++i];
        break;
      case '--ids':
        args.ids = argv[++i].split(',').map((s) => s.trim()).filter(Boolean);
        break;
      case '--all':
        args.all = true;
        break;
      case '--limit':
        args.limit = Number(argv[++i]);
        break;
      case '--out':
        args.out = argv[++i];
        break;
      default:
        if (argv[i].startsWith('--')) console.warn(`⚠️  Flag desconocido: ${argv[i]}`);
    }
  }
  if (!args.topicId && !args.ids && !args.all) {
    throw new Error('Falta uno de: --topic <topicId> | --ids <id1,id2,...> | --all');
  }
  return args as CliArgs;
}

interface StoredOption {
  id: string;
  text: string;
  isCorrect: boolean;
  imageUrl?: string | null;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  console.log('─'.repeat(60));
  console.log('🦉 YaEntre — Exportando lote ciego para verificación (G2)');
  console.log('─'.repeat(60));

  let questions: QuestionWithBlindContext[];
  if (args.ids) {
    questions = await loadQuestionsByIds(args.ids);
    console.log(`🎯 Lote dirigido: ${questions.length}/${args.ids.length} id(s) encontrados`);
  } else {
    questions = await loadPendingQuestionsWithContext({ topicId: args.topicId, limit: args.limit });
    console.log(
      `🔍 ${questions.length} reactivo(s) pendiente(s)${args.topicId ? ` en el tema "${args.topicId}"` : ' (todos los temas)'}`,
    );
  }

  if (questions.length === 0) {
    console.log('Nada que exportar.');
    return;
  }

  const items: BlindBatchItem[] = questions.map((q) =>
    buildBlindItem(
      { id: q.id, stem: q.stem, options: q.options as unknown as StoredOption[], format: q.format, passageContent: q.passageContent },
      { subject: q.subject, topic: q.topic, institution: q.institution },
    ),
  );

  mkdirSync(EXPORT_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outPath = args.out ?? join(EXPORT_DIR, `blind-batch-${stamp}.json`);
  writeFileSync(outPath, JSON.stringify(items, null, 2), 'utf8');

  const calcCount = items.filter((i) => i.requiresCalculation).length;
  console.log(`📄 Lote ciego escrito en: ${outPath}`);
  console.log(`   ${items.length} reactivo(s) · ${calcCount} requieren cálculo ejecutado`);
  console.log('─'.repeat(60));
  console.log('SIGUIENTE PASO (manual): abre una sesión de Claude Code o chat');
  console.log('NUEVA e independiente de la que compuso estos reactivos. Pégale');
  console.log(`el contenido de ${outPath} y pídele que resuelva cada uno DESDE`);
  console.log('CERO (ejecutando cálculo real donde requiresCalculation=true), y');
  console.log('que te devuelva un JSON con esta forma exacta:');
  console.log(
    JSON.stringify(
      [
        {
          questionId: '<questionId del ítem>',
          chosenOption: 'A',
          confidence: 0.95,
          reasoning: '<breve>',
          problems: [],
        },
      ],
      null,
      2,
    ),
  );
  console.log('Guarda esa respuesta en un archivo y corre:');
  console.log('   pnpm content:resolve --file <respuestas.json>');
  console.log('─'.repeat(60));
}

main()
  .catch((err) => {
    console.error(`\n❌ Error: ${(err as Error).message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnect();
  });
