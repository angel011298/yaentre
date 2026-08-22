/**
 * scripts/classify-chunks-apply.ts — Aplica las clasificaciones de una sesión (G2)
 *
 * Lee el archivo de respuestas producido por una sesión de Claude Code/chat a
 * partir del lote de scripts/classify-chunks-export.ts y las persiste en
 * `SourceChunk.topicId/subjectId/classifiedAt`.
 *
 * Uso:
 *   npx tsx scripts/classify-chunks-apply.ts --file <respuestas.json> [--dry-run]
 *
 * GUARDRAIL: cero llamadas a red o a la API de Anthropic.
 */
import './lib/env';
import { readFileSync } from 'node:fs';

import { ClassificationResultSchema, applyClassificationResults } from './lib/chunk-classifier';
import { loadTaxonomyTopics, applyChunkClassifications, disconnect } from './lib/content-db';

function parseArgs(argv: string[]): { file: string; dryRun: boolean } {
  const args: { file?: string; dryRun: boolean } = { dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--file') args.file = argv[++i];
    else if (argv[i] === '--dry-run') args.dryRun = true;
  }
  if (!args.file) throw new Error('Falta --file <respuestas.json>');
  return args as { file: string; dryRun: boolean };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  console.log('─'.repeat(60));
  console.log('🦉 YaEntre — Aplicando clasificación de fragmentos (G2)');
  console.log(`   file=${args.file} dryRun=${args.dryRun}`);
  console.log('─'.repeat(60));

  const raw = readFileSync(args.file, 'utf8');
  const parsed = ClassificationResultSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    console.error('❌ El archivo no cumple el formato esperado:');
    for (const issue of parsed.error.issues) {
      console.error(`   • ${issue.path.join('.')}: ${issue.message}`);
    }
    process.exitCode = 1;
    return;
  }
  console.log(`📄 ${parsed.data.length} clasificación(es) leída(s) de ${args.file}`);

  const topics = await loadTaxonomyTopics();
  const assignments = applyClassificationResults(parsed.data, topics);
  const toTopic = assignments.filter((a) => a.topicId !== null).length;
  const outOfSyllabus = assignments.length - toTopic;
  console.log(`   ${toTopic} a tema · ${outOfSyllabus} fuera de temario ("ninguno")`);

  if (args.dryRun) {
    console.log('🚫 --dry-run: no se escribe en la DB.');
    return;
  }

  await applyChunkClassifications(assignments);
  console.log(`💾 ${assignments.length} fragmento(s) clasificado(s).`);
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
