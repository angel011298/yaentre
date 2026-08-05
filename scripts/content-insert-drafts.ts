/**
 * scripts/content-insert-drafts.ts — Inserta reactivos YA COMPUESTOS (G2)
 *
 * Reemplaza la Etapa 1 (generación vía API) de `generate-questions.ts`
 * (retirado): la composición del reactivo ahora ocurre DENTRO de una sesión
 * de Claude Code o del chat de Claude (usando la suscripción existente,
 * NUNCA la API de pago) — esa sesión escribe un archivo JSON con el mismo
 * formato exacto de `QuestionDraftSchema` (scripts/lib/question-draft-schema.ts)
 * y este script lo valida e inserta, igual que antes.
 *
 * Formato esperado del archivo (array de reactivos del MISMO tema):
 * [
 *   {
 *     "stem": "¿Cuánto es $2+2$?",
 *     "options": [
 *       { "id": "A", "text": "3", "isCorrect": false },
 *       { "id": "B", "text": "4", "isCorrect": true },
 *       { "id": "C", "text": "5", "isCorrect": false },
 *       { "id": "D", "text": "6", "isCorrect": false }
 *     ],
 *     "difficulty": "BASIC",
 *     "format": "MULTIPLE_CHOICE",
 *     "sourceChunks": [1],
 *     "explanations": [
 *       { "layer": 1, "title": "...", "content": "..." },
 *       { "layer": 2, "title": "...", "content": "..." },
 *       { "layer": 3, "title": "...", "content": "..." }
 *     ]
 *   }
 * ]
 *
 * `sourceChunks` son índices 1-based sobre los fragmentos fuente del tema
 * (mostrados por este script si los hay) — mismo anclaje F2b de siempre.
 *
 * Uso:
 *   npx tsx scripts/content-insert-drafts.ts --topic <topicId> --file <path.json> [--dry-run]
 *   npx tsx scripts/content-insert-drafts.ts --topic <topicId> --file <path.json> --lot-dir <carpeta> [--dry-run]
 *
 * VALIDACIÓN DE LOTE (G3c, obligatoria — ver scripts/lib/lot-validation.ts):
 * antes de tocar la DB, este script SIEMPRE corre `analyzeLot` sobre los
 * reactivos que va a insertar. Si el lote real abarca VARIOS archivos (un
 * archivo por tema, como en G3a: 12 archivos = 1 materia = 1 lote), pásale
 * `--lot-dir` apuntando a la carpeta que los contiene — el chequeo de sesgo
 * de posición (15%-40% por letra) necesita ver el CONJUNTO completo para
 * tener muestra suficiente, no solo el archivo de este tema. Sin `--lot-dir`
 * igual se valida el archivo de este tema por su cuenta (las reglas de
 * "cita por letra" y "opciones mal formadas" aplican sin importar el
 * tamaño). Cualquier violación aborta la inserción completa, incluso en
 * modo no-dry-run: no se escribe nada en la DB.
 *
 * GUARDRAIL: cero llamadas a red o a la API de Anthropic. Solo valida
 * (Zod + KaTeX + lote) e inserta con isVerified=false — la verificación
 * adversarial (scripts/content-blind-batch.ts + content-resolve-verification.ts)
 * decide si se publica.
 */
import './lib/env';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { parseModelOutput } from './lib/parse-model-output';
import { validateDraft, normalizeStem, type QuestionDraft } from './lib/question-draft-schema';
import { resolveCitations, type GroundingChunk } from './lib/grounding';
import { analyzeLot, formatLotReport, type LotItem } from './lib/lot-validation';
import {
  loadTopicContext,
  loadExistingStems,
  loadTopicChunks,
  insertQuestion,
  disconnect,
  type InsertableDraft,
} from './lib/content-db';

interface CliArgs {
  topicId: string;
  file: string;
  dryRun: boolean;
  lotDir?: string;
}

function parseArgs(argv: string[]): CliArgs {
  const args: Partial<CliArgs> = { dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case '--topic':
        args.topicId = argv[++i];
        break;
      case '--file':
        args.file = argv[++i];
        break;
      case '--dry-run':
        args.dryRun = true;
        break;
      case '--lot-dir':
        args.lotDir = argv[++i];
        break;
      default:
        if (argv[i].startsWith('--')) console.warn(`⚠️  Flag desconocido: ${argv[i]}`);
    }
  }
  if (!args.topicId) throw new Error('Falta --topic <topicId>');
  if (!args.file) throw new Error('Falta --file <path.json>');
  return args as CliArgs;
}

/** Lee un archivo de drafts y devuelve solo los que pasan Zod/KaTeX (forma
 *  QuestionDraftSchema), listos para `analyzeLot`. Usado tanto para el propio
 *  archivo de este tema como para los archivos hermanos de `--lot-dir`. */
function loadValidItemsForLotCheck(path: string): LotItem[] {
  const raw = readFileSync(path, 'utf8');
  const parsed = parseModelOutput(raw);
  if (!parsed.ok) return [];
  const items: LotItem[] = [];
  for (const candidate of parsed.items) {
    const result = validateDraft(candidate);
    if (!result.ok) continue;
    items.push({
      options: result.draft.options,
      format: result.draft.format,
      difficulty: result.draft.difficulty,
      explanations: result.draft.explanations,
    });
  }
  return items;
}

function toInsertable(draft: QuestionDraft, sourceChunkIds: string[]): InsertableDraft {
  return {
    stem: draft.stem,
    options: draft.options,
    difficulty: draft.difficulty,
    format: draft.format,
    sourceChunkIds,
    explanations: draft.explanations.map((e) => ({
      layer: e.layer,
      title: e.title,
      content: e.content,
      latexContent: e.latexContent ?? null,
    })),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  console.log('─'.repeat(60));
  console.log('🦉 Acierta — Inserción de reactivos compuestos en sesión (G2)');
  console.log(`   topic=${args.topicId} file=${args.file} dryRun=${args.dryRun}`);
  console.log('─'.repeat(60));

  const ctx = await loadTopicContext(args.topicId);
  if (!ctx) throw new Error(`El tema "${args.topicId}" no existe en la DB.`);
  console.log(`📚 Contexto: ${ctx.institution} · ${ctx.area} · ${ctx.subject} · ${ctx.topic}`);

  const existingStems = await loadExistingStems(args.topicId);
  const groundingChunks: GroundingChunk[] = await loadTopicChunks(args.topicId);
  console.log(
    groundingChunks.length > 0
      ? `⚓ Anclaje: ${groundingChunks.length} fragmento(s) fuente — cita OBLIGATORIA en "sourceChunks"`
      : '⚓ Sin fragmentos fuente para este tema → groundingStatus=TEMARIO_ONLY (no bloquea)',
  );

  const raw = readFileSync(args.file, 'utf8');
  const parsed = parseModelOutput(raw);
  if (!parsed.ok) {
    throw new Error(`El archivo no contiene un array JSON válido: ${parsed.error}`);
  }
  console.log(`📄 ${parsed.items.length} reactivo(s) leído(s) de ${args.file}`);

  const valid: { draft: QuestionDraft; chunkIds: string[] }[] = [];
  const rejected: { errors: string[] }[] = [];
  const seenStems = new Set(existingStems.map(normalizeStem));

  for (const item of parsed.items) {
    const result = validateDraft(item);
    if (!result.ok) {
      rejected.push({ errors: result.errors });
      console.log(`   ✗ descartado (formato): ${result.errors[0]}`);
      continue;
    }
    const citations = resolveCitations(result.draft.sourceChunks, groundingChunks);
    if (!citations.ok) {
      rejected.push({ errors: [`Anclaje: ${citations.error}`] });
      console.log(`   ✗ descartado (anclaje): ${citations.error}`);
      continue;
    }
    const key = normalizeStem(result.draft.stem);
    if (seenStems.has(key)) {
      rejected.push({ errors: ['Duplicado: ya existe un reactivo con este enunciado'] });
      console.log('   ✗ descartado (duplicado)');
      continue;
    }
    seenStems.add(key);
    valid.push({ draft: result.draft, chunkIds: citations.chunkIds });
  }

  console.log('─'.repeat(60));
  console.log(`✅ Válidos: ${valid.length}   ❌ Rechazados: ${rejected.length}`);

  // ── Validación de LOTE (G3c) — OBLIGATORIA, corre siempre, incluso en --dry-run ──
  console.log('─'.repeat(60));
  let lotItems: LotItem[] = valid.map(({ draft }) => ({
    options: draft.options,
    format: draft.format,
    difficulty: draft.difficulty,
    explanations: draft.explanations,
  }));
  if (args.lotDir) {
    lotItems = [];
    const siblingFiles = readdirSync(args.lotDir)
      .filter((name) => name.endsWith('.json'))
      .map((name) => join(args.lotDir!, name));
    console.log(`🔎 Validación de lote sobre ${siblingFiles.length} archivo(s) en ${args.lotDir}`);
    for (const f of siblingFiles) lotItems.push(...loadValidItemsForLotCheck(f));
  } else {
    console.log('🔎 Validación de lote sobre el archivo de este tema (sin --lot-dir: el chequeo de sesgo de posición no aplica si hay <20 reactivos aquí).');
  }
  const lotReport = analyzeLot(lotItems);
  console.log(formatLotReport(lotReport));
  console.log('─'.repeat(60));
  if (!lotReport.ok) {
    console.error('❌ LOTE RECHAZADO por validación de conjunto — NO se inserta nada en la DB.');
    console.error('   Corrige las violaciones (ver arriba) y vuelve a correr content:insert.');
    process.exitCode = 1;
    return;
  }
  console.log('✅ Lote aprobado.');

  if (args.dryRun) {
    console.log(`🚫 --dry-run: no se escribe en la DB (se habrían insertado ${valid.length}).`);
    return;
  }

  let inserted = 0;
  for (const { draft, chunkIds } of valid) {
    const id = await insertQuestion(args.topicId, toInsertable(draft, chunkIds));
    inserted++;
    const grounding = chunkIds.length > 0 ? `SOURCED (${chunkIds.length} fuente(s))` : 'TEMARIO_ONLY';
    console.log(`   + ${id} (isVerified=false, ${grounding})`);
  }
  console.log(`💾 Insertados ${inserted} reactivo(s) en la cola de verificación.`);
  console.log('─'.repeat(60));
  console.log('Siguiente: pnpm content:blind-batch --topic ' + args.topicId);
}

main()
  .catch((err) => {
    console.error(`\n❌ Error: ${(err as Error).message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnect();
  });
