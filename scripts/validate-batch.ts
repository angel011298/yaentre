/**
 * scripts/validate-batch.ts — Validación de LOTE completo antes de insertar (G3c)
 *
 * G3a compuso 35 reactivos de IPN FISMAT Matemáticas repartidos en 12 archivos
 * (uno por tema, insertados con 12 llamadas a `content:insert`). La
 * verificación ciega de G2 opera reactivo por reactivo y no detectó que, EN
 * CONJUNTO, la respuesta correcta cayó en la posición "A" el 100% de las
 * veces — un defecto del LOTE, invisible archivo por archivo.
 *
 * Este script corre `analyzeLot` (scripts/lib/lot-validation.ts) sobre TODOS
 * los archivos de un lote a la vez (una materia completa, no un tema) —
 * ANTES de insertar nada — y rechaza el lote completo con un mensaje claro si
 * falla. Es el paso que la sesión que compone el lote debe correr después de
 * escribir sus N archivos por tema y antes de llamar a `content:insert` N
 * veces.
 *
 * Uso:
 *   npx tsx scripts/validate-batch.ts --dir <carpeta-con-*.json>
 *   npx tsx scripts/validate-batch.ts --files <a.json,b.json,...>
 *
 * Cada archivo debe tener la MISMA forma que consume `content:insert`: un
 * array de objetos `QuestionDraftSchema` (scripts/lib/question-draft-schema.ts).
 *
 * GUARDRAIL: cero llamadas a red o a la API de Anthropic; no toca la DB.
 */
import './lib/env';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { parseModelOutput } from './lib/parse-model-output';
import { validateDraft } from './lib/question-draft-schema';
import { analyzeLot, formatLotReport, type LotItem } from './lib/lot-validation';

interface CliArgs {
  files: string[];
}

function parseArgs(argv: string[]): CliArgs {
  let dir: string | undefined;
  let filesArg: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case '--dir':
        dir = argv[++i];
        break;
      case '--files':
        filesArg = argv[++i];
        break;
      default:
        if (argv[i].startsWith('--')) console.warn(`⚠️  Flag desconocido: ${argv[i]}`);
    }
  }
  if (!dir && !filesArg) throw new Error('Falta uno de: --dir <carpeta> | --files <a.json,b.json,...>');

  const files: string[] = [];
  if (dir) {
    for (const name of readdirSync(dir)) {
      if (name.endsWith('.json')) files.push(join(dir, name));
    }
  }
  if (filesArg) {
    files.push(...filesArg.split(',').map((s) => s.trim()).filter(Boolean));
  }
  if (files.length === 0) throw new Error('No se encontraron archivos .json para validar.');
  return { files };
}

function loadItemsFromFile(path: string): { items: LotItem[]; rejected: number } {
  const raw = readFileSync(path, 'utf8');
  const parsed = parseModelOutput(raw);
  if (!parsed.ok) {
    throw new Error(`${path}: no contiene un array JSON válido — ${parsed.error}`);
  }
  const items: LotItem[] = [];
  let rejected = 0;
  for (const candidate of parsed.items) {
    const result = validateDraft(candidate);
    if (!result.ok) {
      rejected++;
      continue;
    }
    items.push({
      options: result.draft.options,
      format: result.draft.format,
      difficulty: result.draft.difficulty,
      explanations: result.draft.explanations,
    });
  }
  return { items, rejected };
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  console.log('─'.repeat(60));
  console.log('🦉 Acierta — Validación de LOTE completo (G3c)');
  console.log(`   ${args.files.length} archivo(s)`);
  console.log('─'.repeat(60));

  const allItems: LotItem[] = [];
  let totalRejected = 0;
  for (const file of args.files) {
    const { items, rejected } = loadItemsFromFile(file);
    console.log(`   ${file}: ${items.length} válido(s), ${rejected} rechazado(s) por formato`);
    allItems.push(...items);
    totalRejected += rejected;
  }

  console.log('─'.repeat(60));
  if (totalRejected > 0) {
    console.log(`⚠️  ${totalRejected} ítem(s) rechazados por formato (Zod/KaTeX) — no cuentan en el análisis de lote.`);
  }

  const report = analyzeLot(allItems);
  console.log(formatLotReport(report));
  console.log('─'.repeat(60));

  if (!report.ok) {
    console.error('❌ LOTE RECHAZADO. Corrige las violaciones arriba antes de correr content:insert.');
    process.exitCode = 1;
    return;
  }

  console.log('✅ LOTE APROBADO para inserción (pnpm content:insert --topic <id> --file <archivo>, uno por tema).');
}

main();
