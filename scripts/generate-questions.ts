/**
 * scripts/generate-questions.ts — Pipeline de generación de reactivos (CC-05)
 *
 * Etapa 1 (generación con IA) + Etapa 2 (validación automática) del PRD §8.
 * GUARDRAIL: este script SOLO corre offline (tsx). La API de Anthropic jamás se
 * llama desde el runtime de la app.
 *
 * Uso:
 *   pnpm content:generate --topic <topicId> --count <n> [--dry-run] [--mock]
 *
 * Flags:
 *   --topic <id>       (requerido) id del Topic en la DB
 *   --count <n>        (requerido) número de reactivos a generar
 *   --dry-run          genera y valida, NO escribe en la DB
 *   --mock             usa el generador mock en vez de la API (sin tokens/red)
 *   --inject-invalid   (con --mock) añade un reactivo inválido para probar el rechazo
 */
import 'dotenv/config';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  buildSystemPrompt,
  buildUserPrompt,
  type PromptContext,
} from './lib/prompt-loader';
import { parseModelOutput } from './lib/parse-model-output';
import {
  validateDraft,
  normalizeStem,
  type QuestionDraft,
} from './lib/question-draft-schema';
import { mockGenerate, mockInvalidDraft } from './lib/mock-generator';
import { callAnthropic } from './lib/anthropic-client';
import {
  loadTopicContext,
  loadExistingStems,
  insertQuestion,
  disconnect,
  type InsertableDraft,
} from './lib/content-db';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOG_DIR = join(__dirname, 'logs');

interface CliArgs {
  topicId: string;
  count: number;
  dryRun: boolean;
  mock: boolean;
  injectInvalid: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const args: Partial<CliArgs> = {
    dryRun: false,
    mock: false,
    injectInvalid: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case '--topic':
        args.topicId = argv[++i];
        break;
      case '--count':
        args.count = Number(argv[++i]);
        break;
      case '--dry-run':
        args.dryRun = true;
        break;
      case '--mock':
        args.mock = true;
        break;
      case '--inject-invalid':
        args.injectInvalid = true;
        break;
      default:
        if (arg.startsWith('--')) {
          console.warn(`⚠️  Flag desconocido: ${arg}`);
        }
    }
  }

  if (!args.topicId) throw new Error('Falta --topic <topicId>');
  if (!args.count || Number.isNaN(args.count) || args.count < 1) {
    throw new Error('Falta --count <n> (entero ≥ 1)');
  }
  return args as CliArgs;
}

function isPlaceholderKey(key: string | undefined): boolean {
  if (!key) return true;
  return /your-api-key|placeholder|xxx|^sk-ant-your/i.test(key) || key.length < 25;
}

/** Escribe los reactivos rechazados a un log JSONL para inspección posterior. */
function logRejected(
  topicId: string,
  rejected: { errors: string[]; raw: unknown }[],
): string {
  mkdirSync(LOG_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = join(LOG_DIR, `rejected-${topicId}-${stamp}.jsonl`);
  const lines = rejected
    .map((r) => JSON.stringify({ errors: r.errors, draft: r.raw }))
    .join('\n');
  writeFileSync(file, lines + '\n', 'utf8');
  return file;
}

function toInsertable(draft: QuestionDraft): InsertableDraft {
  return {
    stem: draft.stem,
    options: draft.options,
    difficulty: draft.difficulty,
    explanations: draft.explanations.map((e) => ({
      layer: e.layer,
      title: e.title,
      content: e.content,
      latexContent: e.latexContent ?? null,
    })),
  };
}

/** Contexto sintético para dry-run mockeado cuando la DB no está disponible. */
function syntheticContext(topicId: string): PromptContext {
  return {
    institution: 'UNAM',
    level: 'Superior',
    area: 'Área 1 — Físico-Matemáticas',
    subject: 'Matemáticas',
    topic: `Tema sintético (${topicId})`,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const useMock = args.mock || (args.dryRun && isPlaceholderKey(apiKey));

  console.log('─'.repeat(60));
  console.log('🦉 Acierta — Pipeline de generación de reactivos (CC-05)');
  console.log(
    `   topic=${args.topicId} count=${args.count} dryRun=${args.dryRun} mock=${useMock}`,
  );
  console.log('─'.repeat(60));

  // ── Contexto taxonómico (DB, con degradación a sintético en mock) ──
  let ctx: PromptContext & { topicId?: string };
  let existingStems: string[] = [];
  let dbAvailable = false;

  try {
    const loaded = await loadTopicContext(args.topicId);
    if (loaded) {
      ctx = loaded;
      existingStems = await loadExistingStems(args.topicId);
      dbAvailable = true;
      console.log(
        `📚 Contexto: ${ctx.institution} · ${ctx.area} · ${ctx.subject} · ${ctx.topic}`,
      );
    } else if (useMock) {
      ctx = syntheticContext(args.topicId);
      console.log('📚 Tema no encontrado en DB — usando contexto sintético (mock)');
    } else {
      throw new Error(
        `El tema "${args.topicId}" no existe en la DB. Verifica el id o corre con --mock.`,
      );
    }
  } catch (err) {
    if (useMock) {
      ctx = syntheticContext(args.topicId);
      console.log(
        `📚 DB no disponible (${(err as Error).message.split('\n')[0]}) — contexto sintético (mock)`,
      );
    } else {
      throw err;
    }
  }

  // ── Etapa 1: generación ──
  const { system, subjectFile } = buildSystemPrompt(ctx);
  const user = buildUserPrompt(ctx, args.count);
  console.log(`🧠 Prompt de materia: ${subjectFile}.md`);

  let items: unknown[];
  if (useMock) {
    items = mockGenerate(ctx, args.count);
    if (args.injectInvalid) items.push(mockInvalidDraft(ctx));
    console.log(`🤖 [MOCK] ${items.length} reactivo(s) generado(s)`);
  } else {
    if (isPlaceholderKey(apiKey)) {
      throw new Error(
        'ANTHROPIC_API_KEY no está configurada (placeholder). Configúrala en .env.local o corre con --mock.',
      );
    }
    const raw = await callAnthropic({ apiKey: apiKey as string, system, user });
    const parsed = parseModelOutput(raw);
    if (!parsed.ok) {
      throw new Error(`No se pudo parsear la respuesta del modelo: ${parsed.error}`);
    }
    items = parsed.items;
    console.log(`🤖 ${items.length} reactivo(s) recibido(s) del modelo`);
  }

  // ── Etapa 2: validación + dedupe ──
  const valid: QuestionDraft[] = [];
  const rejected: { errors: string[]; raw: unknown }[] = [];
  const seenStems = new Set(existingStems.map(normalizeStem));

  for (const item of items) {
    const result = validateDraft(item);
    if (!result.ok) {
      rejected.push({ errors: result.errors, raw: result.raw });
      continue;
    }
    const key = normalizeStem(result.draft.stem);
    if (seenStems.has(key)) {
      rejected.push({
        errors: ['Duplicado: ya existe un reactivo con este enunciado'],
        raw: item,
      });
      continue;
    }
    seenStems.add(key);
    valid.push(result.draft);
  }

  console.log('─'.repeat(60));
  console.log(`✅ Válidos: ${valid.length}   ❌ Rechazados: ${rejected.length}`);

  if (rejected.length > 0) {
    const logFile = logRejected(args.topicId, rejected);
    console.log(`📝 Rechazados registrados en: ${logFile}`);
    for (const r of rejected.slice(0, 5)) {
      console.log(`   · ${r.errors.join('; ')}`);
    }
  }

  // ── Inserción (Etapa 1 → cola de revisión con isVerified=false) ──
  if (args.dryRun) {
    console.log('🚫 --dry-run: no se escribe en la DB.');
    console.log(
      `   (Se habrían insertado ${valid.length} reactivo(s) con isVerified=false)`,
    );
  } else if (!dbAvailable) {
    throw new Error(
      'No se puede insertar sin DB disponible. Configura DATABASE_URL o usa --dry-run.',
    );
  } else {
    let inserted = 0;
    for (const draft of valid) {
      const id = await insertQuestion(args.topicId, toInsertable(draft));
      inserted++;
      console.log(`   + ${id} (isVerified=false)`);
    }
    console.log(`💾 Insertados ${inserted} reactivo(s) en la cola de revisión.`);
  }

  console.log('─'.repeat(60));
  console.log('Listo. 🦉');
}

main()
  .catch((err) => {
    console.error(`\n❌ Error: ${(err as Error).message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnect();
  });
