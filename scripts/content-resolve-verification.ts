/**
 * scripts/content-resolve-verification.ts — Resuelve un lote de respuestas de
 * verificación (G2)
 *
 * Reemplaza la Etapa 3 (comparar veredicto vs. generador) de
 * `verify-questions.ts` (retirado). Lee un archivo con las respuestas que una
 * sesión de Claude Code o de chat produjo al resolver un lote ciego
 * (scripts/content-blind-batch.ts), las traduce de vuelta a los ids
 * ORIGINALES de opción (el lote ciego mezcla A/B/C/D — ver
 * scripts/lib/blind-verification.ts), y aplica la MISMA lógica de resolución
 * de siempre (scripts/lib/resolution.ts, sin cambios):
 *
 *   coincide con el generador + confianza ≥0.85 + cero problemas
 *     → isVerified=true
 *   cualquier otra cosa
 *     → queda sin publicar, con el veredicto completo adjunto
 *       (Question.verification) para el panel de discrepancias (F3)
 *
 * Formato esperado del archivo de respuestas (lo que la sesión verificadora
 * produce a partir del lote ciego):
 * [
 *   { "questionId": "...", "chosenOption": "A", "confidence": 0.95,
 *     "reasoning": "...", "problems": [] }
 * ]
 *
 * Uso:
 *   npx tsx scripts/content-resolve-verification.ts --file <respuestas.json> [--dry-run]
 *
 * GUARDRAIL: cero llamadas a red o a la API de Anthropic.
 */
import './lib/env';
import { readFileSync } from 'node:fs';

import {
  translateChosenOption,
  VerifierAnswersFileSchema,
  VERIFIER_MODEL_TIER,
  type VerifierAnswer,
} from './lib/blind-verification';
import { resolveVerdict, type VerificationRecord } from './lib/resolution';
import { loadQuestionForResolution, applyVerification, disconnect } from './lib/content-db';

interface CliArgs {
  file: string;
  dryRun: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const args: Partial<CliArgs> = { dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case '--file':
        args.file = argv[++i];
        break;
      case '--dry-run':
        args.dryRun = true;
        break;
      default:
        if (argv[i].startsWith('--')) console.warn(`⚠️  Flag desconocido: ${argv[i]}`);
    }
  }
  if (!args.file) throw new Error('Falta --file <respuestas.json>');
  return args as CliArgs;
}

interface StoredOption {
  id: string;
  text: string;
  isCorrect: boolean;
  imageUrl?: string | null;
}

async function resolveOne(answer: VerifierAnswer): Promise<'approved' | 'unpublished' | 'skipped'> {
  const question = await loadQuestionForResolution(answer.questionId);
  if (!question) {
    console.log(`   ⚠️ ${answer.questionId}: no existe en la DB — se omite`);
    return 'skipped';
  }
  const options = question.options as unknown as StoredOption[];
  const generatorOption = options.find((o) => o.isCorrect)?.id;
  if (!generatorOption) {
    console.log(`   ⚠️ ${answer.questionId}: sin opción correcta marcada en la DB — se omite`);
    return 'skipped';
  }

  const chosenOriginalId = translateChosenOption(answer.questionId, options, answer.chosenOption);

  const verdict = {
    chosenOption: chosenOriginalId as 'A' | 'B' | 'C' | 'D',
    confidence: answer.confidence,
    reasoning: answer.reasoning,
    problems: answer.problems,
    model: VERIFIER_MODEL_TIER,
    usedCalculation: false,
    usage: { inputTokens: 0, outputTokens: 0 },
    verifiedAt: new Date().toISOString(),
  };

  const resolution = resolveVerdict({
    generatorOption: generatorOption as 'A' | 'B' | 'C' | 'D',
    verdict,
  });

  const record: VerificationRecord = {
    pipeline: 'session-v1',
    generatorModel: 'claude-code-session',
    generatorOption,
    verdict,
    decision: resolution.decision,
    reasons: resolution.reasons,
    audit: null,
  };

  const approved = resolution.decision === 'AUTO_APPROVED';
  console.log(
    `   ${approved ? '✔' : '✋'} ${answer.questionId}: ${chosenOriginalId} vs ${generatorOption} · conf=${answer.confidence.toFixed(2)}${approved ? '' : ` · ${resolution.reasons[0]}`}`,
  );

  await applyVerification(answer.questionId, record, approved);
  return approved ? 'approved' : 'unpublished';
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  console.log('─'.repeat(60));
  console.log('🦉 Acierta — Resolviendo lote de verificación (G2)');
  console.log(`   file=${args.file} dryRun=${args.dryRun}`);
  console.log('─'.repeat(60));

  const raw = readFileSync(args.file, 'utf8');
  const json = JSON.parse(raw);
  const parsed = VerifierAnswersFileSchema.safeParse(json);
  if (!parsed.success) {
    console.error('❌ El archivo no cumple el formato esperado:');
    for (const issue of parsed.error.issues) {
      console.error(`   • ${issue.path.join('.')}: ${issue.message}`);
    }
    process.exitCode = 1;
    return;
  }
  console.log(`📄 ${parsed.data.length} respuesta(s) leída(s) de ${args.file}`);

  if (args.dryRun) {
    console.log('🚫 --dry-run: no se escribe en la DB.');
    return;
  }

  let approved = 0;
  let unpublished = 0;
  let skipped = 0;
  for (const answer of parsed.data) {
    const outcome = await resolveOne(answer);
    if (outcome === 'approved') approved++;
    else if (outcome === 'unpublished') unpublished++;
    else skipped++;
  }

  console.log('─'.repeat(60));
  console.log(
    `✅ Auto-aprobados: ${approved}   ✋ Sin publicar: ${unpublished}   ⚠️ Omitidos: ${skipped}`,
  );
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
