/**
 * scripts/content-run.ts — Orquestador del pipeline adversarial (F2)
 *
 * genera (Sonnet) → valida (Zod) → verifica (Fable 5, sin la respuesta) →
 * resuelve (coincidencia + confianza ≥0.85 + cero problemas) → inserta →
 * muestreo de control 5% (tercera pasada con Opus 4.8, puede degradar).
 *
 * CERO revisores humanos: la coincidencia de dos modelos independientes es la
 * única vía de publicación. Discrepancia → queda sin publicar con el veredicto
 * completo adjunto (Question.verification) para el panel de F3.
 *
 * Uso:
 *   npx tsx scripts/content-run.ts --topic <id> --count <n> [--dry-run] [--mock] [--keep-mock]
 *
 * GUARDRAIL: solo offline. La API de Anthropic jamás se llama en runtime.
 */
import './lib/env';

import { buildSystemPrompt, buildUserPrompt } from './lib/prompt-loader';
import { parseModelOutput } from './lib/parse-model-output';
import {
  validateDraft,
  normalizeStem,
  type QuestionDraft,
} from './lib/question-draft-schema';
import { mockGenerate } from './lib/mock-generator';
import { callAnthropicMeta, GENERATION_MODEL } from './lib/anthropic-client';
import {
  buildVerifierPayload,
  runVerification,
  mockVerify,
  estimateCostUsd,
  VERIFIER_MODEL,
  AUDIT_MODEL,
  type VerifierVerdict,
} from './lib/verifier';
import {
  resolveVerdict,
  sampleForAudit,
  AUDIT_RATE,
  type VerificationRecord,
} from './lib/resolution';
import {
  loadTopicContext,
  loadExistingStems,
  insertQuestion,
  applyVerification,
  deleteQuestionsWithoutAnswers,
  disconnect,
} from './lib/content-db';

interface CliArgs {
  topicId: string;
  count: number;
  dryRun: boolean;
  mock: boolean;
  keepMock: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const args: Partial<CliArgs> = { dryRun: false, mock: false, keepMock: false };
  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
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
      case '--keep-mock':
        args.keepMock = true;
        break;
      default:
        if (argv[i].startsWith('--')) console.warn(`⚠️  Flag desconocido: ${argv[i]}`);
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
  return /placeholder|your-api-key|FALTA|^sk-ant-your/i.test(key) || key.length < 25;
}

function correctOptionOf(draft: QuestionDraft): 'A' | 'B' | 'C' | 'D' {
  const correct = draft.options.find((o) => o.isCorrect);
  if (!correct) throw new Error('Draft sin opción correcta (Zod debió rechazarlo)');
  return correct.id;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const useMock = args.mock;

  if (!useMock && isPlaceholderKey(apiKey)) {
    throw new Error(
      'ANTHROPIC_API_KEY no está configurada. Corre con --mock o pon una key real en .env.local.',
    );
  }

  console.log('═'.repeat(64));
  console.log('🦉 Acierta — Pipeline adversarial de contenido (F2)');
  console.log(
    `   generador=${GENERATION_MODEL} · verificador=${useMock ? 'mock' : VERIFIER_MODEL} · auditor=${useMock ? 'mock' : AUDIT_MODEL}`,
  );
  console.log(`   topic=${args.topicId} count=${args.count} dryRun=${args.dryRun} mock=${useMock}`);
  console.log('═'.repeat(64));

  // ── Contexto taxonómico ──
  const ctx = await loadTopicContext(args.topicId);
  if (!ctx) throw new Error(`El tema "${args.topicId}" no existe en la DB.`);
  console.log(`📚 ${ctx.institution} · ${ctx.area} · ${ctx.subject} · ${ctx.topic}`);
  const existingStems = await loadExistingStems(args.topicId);

  let totalCostUsd = 0;

  // ── Etapa 1: generación ──
  let items: unknown[];
  if (useMock) {
    items = mockGenerate(ctx, args.count);
    console.log(`🤖 [MOCK] ${items.length} reactivo(s) generado(s)`);
  } else {
    const { system } = buildSystemPrompt(ctx);
    const user = buildUserPrompt(ctx, args.count);
    const gen = await callAnthropicMeta({ apiKey: apiKey as string, system, user });
    totalCostUsd += estimateCostUsd(GENERATION_MODEL, gen.usage);
    const parsed = parseModelOutput(gen.text);
    if (!parsed.ok) throw new Error(`Salida del generador no parseable: ${parsed.error}`);
    items = parsed.items;
    console.log(`🤖 ${items.length} reactivo(s) recibidos de ${GENERATION_MODEL}`);
  }

  // ── Etapa 2: validación Zod + dedupe ──
  const valid: QuestionDraft[] = [];
  let rejectedFormat = 0;
  const seen = new Set(existingStems.map(normalizeStem));
  for (const item of items) {
    const result = validateDraft(item);
    if (!result.ok) {
      rejectedFormat++;
      console.log(`   ✗ descartado (formato): ${result.errors[0]}`);
      continue;
    }
    const key = normalizeStem(result.draft.stem);
    if (seen.has(key)) {
      rejectedFormat++;
      console.log('   ✗ descartado (duplicado)');
      continue;
    }
    seen.add(key);
    valid.push(result.draft);
  }
  console.log(`✅ Válidos: ${valid.length} · ❌ Descartados por formato/duplicado: ${rejectedFormat}`);

  // ── Etapas 3-4: verificación adversarial + resolución ──
  interface Processed {
    draft: QuestionDraft;
    record: VerificationRecord;
    questionId?: string;
  }
  const approved: Processed[] = [];
  const unpublished: Processed[] = [];

  for (const [i, draft] of valid.entries()) {
    const generatorOption = correctOptionOf(draft);
    const payload = buildVerifierPayload(
      { stem: draft.stem, options: draft.options, format: draft.format },
      { subject: ctx.subject, topic: ctx.topic, institution: ctx.institution },
    );

    let verdict: VerifierVerdict;
    if (useMock) {
      verdict = mockVerify(payload, generatorOption);
    } else {
      verdict = await runVerification(payload, { apiKey: apiKey as string });
      totalCostUsd += estimateCostUsd(verdict.model, verdict.usage);
    }

    const resolution = resolveVerdict({ generatorOption, verdict });
    const record: VerificationRecord = {
      pipeline: 'adversarial-v1',
      generatorModel: useMock ? `${GENERATION_MODEL} (mock)` : GENERATION_MODEL,
      generatorOption,
      verdict,
      decision: resolution.decision,
      reasons: resolution.reasons,
      audit: null,
    };

    const status =
      resolution.decision === 'AUTO_APPROVED'
        ? '✔ auto-aprobado'
        : `✋ sin publicar (${resolution.reasons[0]})`;
    console.log(`   [${i + 1}/${valid.length}] ${verdict.chosenOption} vs ${generatorOption} · conf=${verdict.confidence.toFixed(2)} → ${status}`);

    const entry: Processed = { draft, record };
    (resolution.decision === 'AUTO_APPROVED' ? approved : unpublished).push(entry);
  }

  // ── Inserción ──
  if (!args.dryRun) {
    for (const entry of [...approved, ...unpublished]) {
      const id = await insertQuestion(args.topicId, {
        stem: entry.draft.stem,
        options: entry.draft.options,
        difficulty: entry.draft.difficulty,
        format: entry.draft.format,
        explanations: entry.draft.explanations.map((e) => ({
          layer: e.layer,
          title: e.title,
          content: e.content,
          latexContent: e.latexContent ?? null,
        })),
      });
      entry.questionId = id;
      await applyVerification(id, entry.record, entry.record.decision === 'AUTO_APPROVED');
    }
    console.log(`💾 Insertados ${approved.length + unpublished.length} reactivos con veredicto adjunto.`);
  } else {
    console.log('🚫 --dry-run: no se escribe en la DB.');
  }

  // ── Etapa 5: muestreo de control (tercera pasada, modelo DISTINTO) ──
  let degraded = 0;
  const auditSample = sampleForAudit(approved);
  if (auditSample.length > 0) {
    console.log(`🔍 Muestreo de control: ${auditSample.length}/${approved.length} auto-aprobados (${AUDIT_RATE * 100}%) → tercera pasada con ${useMock ? 'mock' : AUDIT_MODEL}`);
    for (const entry of auditSample) {
      const generatorOption = correctOptionOf(entry.draft);
      const payload = buildVerifierPayload(
        { stem: entry.draft.stem, options: entry.draft.options, format: entry.draft.format },
        { subject: ctx.subject, topic: ctx.topic, institution: ctx.institution },
      );
      let auditVerdict: VerifierVerdict;
      if (useMock) {
        auditVerdict = mockVerify(payload, generatorOption, AUDIT_MODEL);
      } else {
        auditVerdict = await runVerification(payload, {
          apiKey: apiKey as string,
          model: AUDIT_MODEL,
        });
        totalCostUsd += estimateCostUsd(AUDIT_MODEL, auditVerdict.usage);
      }
      const auditResolution = resolveVerdict({ generatorOption, verdict: auditVerdict });
      const degrade = auditResolution.decision === 'UNPUBLISHED';
      entry.record.audit = {
        verdict: auditVerdict,
        decision: auditResolution.decision,
        reasons: auditResolution.reasons,
        degraded: degrade,
      };
      if (degrade) {
        degraded++;
        entry.record.decision = 'UNPUBLISHED';
        entry.record.reasons = [...entry.record.reasons, ...auditResolution.reasons.map((r) => `AUDITORÍA: ${r}`)];
        console.log(`   ⛔ degradado por auditoría: ${auditResolution.reasons[0]}`);
      } else {
        console.log('   ✔ auditoría coincide');
      }
      if (!args.dryRun && entry.questionId) {
        await applyVerification(entry.questionId, entry.record, !degrade);
      }
    }
  }

  // ── Resumen ──
  const finalApproved = approved.length - degraded;
  const finalUnpublished = unpublished.length + degraded;
  const rate = valid.length > 0 ? finalApproved / valid.length : 0;
  console.log('═'.repeat(64));
  console.log('📊 RESUMEN DE LA CORRIDA');
  console.log(`   Auto-aprobados (servibles):   ${finalApproved}`);
  console.log(`   Sin publicar (con veredicto): ${finalUnpublished}${degraded > 0 ? ` (${degraded} degradados por auditoría)` : ''}`);
  console.log(`   Descartados por formato:      ${rejectedFormat}`);
  console.log(`   Tasa de auto-aprobación:      ${(rate * 100).toFixed(1)}%${rate < 0.75 && valid.length > 0 ? '  ⚠️ <75%: mejorar el system prompt del GENERADOR' : ''}`);
  console.log(`   Costo estimado:               $${totalCostUsd.toFixed(4)} USD`);
  console.log('═'.repeat(64));

  // ── Limpieza de corridas mock (los reactivos [MOCK] no son contenido real) ──
  if (useMock && !args.dryRun && !args.keepMock) {
    const ids = [...approved, ...unpublished]
      .map((e) => e.questionId)
      .filter((id): id is string => Boolean(id));
    const deleted = await deleteQuestionsWithoutAnswers(ids);
    console.log(`🧹 Limpieza mock: ${deleted} reactivo(s) de prueba eliminados (sin respuestas históricas). Usa --keep-mock para conservarlos.`);
  }
}

main()
  .catch((err) => {
    console.error(`\n❌ Error: ${(err as Error).message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnect();
  });
