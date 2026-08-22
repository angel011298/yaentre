/**
 * scripts/classify-chunks-export.ts — Exporta fragmentos sin clasificar (G2)
 *
 * Reemplaza la clasificación vía API que antes vivía dentro de
 * `scan-and-ingest.ts` (llamaba a `classifyChunks`, retirado). Produce un
 * archivo JSON con los fragmentos pendientes + la lista numerada de temas del
 * temario, para que una sesión de Claude Code o de chat los clasifique.
 *
 * Flujo:
 *   1. pnpm content:classify-export         → genera el archivo
 *   2. Pega el archivo en una sesión de Claude Code/chat, pídele que decida
 *      el tema MÁS específico de cada fragmento (o null si no corresponde a
 *      ninguno) y que devuelva:
 *      [{ "chunkId": "...", "topicIndex": 7 }, { "chunkId": "...", "topicIndex": null }]
 *   3. pnpm content:classify-apply --file <respuestas.json>
 *
 * GUARDRAIL: cero llamadas a red o a la API de Anthropic.
 */
import './lib/env';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { buildClassificationBatch } from './lib/chunk-classifier';
import { loadUnclassifiedChunks, loadTaxonomyTopics, disconnect } from './lib/content-db';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXPORT_DIR = join(__dirname, 'content-exports');

function parseArgs(argv: string[]): { limit: number; out?: string } {
  const args: { limit: number; out?: string } = { limit: 5000 };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--limit') args.limit = Number(argv[++i]);
    else if (argv[i] === '--out') args.out = argv[++i];
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  console.log('─'.repeat(60));
  console.log('🦉 YaEntre — Exportando fragmentos sin clasificar (G2)');
  console.log('─'.repeat(60));

  const pending = await loadUnclassifiedChunks(args.limit);
  console.log(`🔍 ${pending.length} fragmento(s) sin clasificar`);
  if (pending.length === 0) {
    console.log('Nada que exportar.');
    return;
  }

  const topics = await loadTaxonomyTopics();
  const batch = buildClassificationBatch(pending, topics);

  mkdirSync(EXPORT_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outPath = args.out ?? join(EXPORT_DIR, `classify-batch-${stamp}.json`);
  writeFileSync(outPath, JSON.stringify(batch, null, 2), 'utf8');

  console.log(`📄 Lote escrito en: ${outPath}`);
  console.log(`   ${batch.chunks.length} fragmento(s) · ${batch.topics.length} tema(s) en la lista`);
  console.log('─'.repeat(60));
  console.log('SIGUIENTE PASO (manual): pega el contenido del archivo en una');
  console.log('sesión de Claude Code o chat. Pídele que, para cada fragmento,');
  console.log('elija el tema MÁS específico de la lista `topics` (por su');
  console.log('`index`) o `null` si no corresponde a ninguno, y que devuelva:');
  console.log(
    JSON.stringify([{ chunkId: '<chunkId del fragmento>', topicIndex: 7 }], null, 2),
  );
  console.log('Guarda esa respuesta en un archivo y corre:');
  console.log('   pnpm content:classify-apply --file <respuestas.json>');
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
