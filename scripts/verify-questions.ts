/**
 * scripts/verify-questions.ts — Verificación adversarial de reactivos YA
 * insertados (F2). Procesa la cola de reactivos GENERATED con isVerified=false
 * y sin veredicto (los que CC-05 dejaba a revisión humana — ese camino ya no
 * existe: esta verificación lo sustituye por completo).
 *
 * El verificador (claude-fable-5, distinto del generador) recibe cada reactivo
 * SIN la respuesta marcada y SIN explicaciones (garantía estructural de
 * buildVerifierPayload), lo resuelve desde cero —ejecutando código para
 * cálculo— y el reactivo se publica solo si coincide con confianza ≥0.85 y
 * cero problemas. Si no: queda sin publicar con el veredicto adjunto.
 *
 * Uso:
 *   npx tsx scripts/verify-questions.ts --topic <id> [--limit <n>] [--mock]
 */
import './lib/env';

import {
  buildVerifierPayload,
  runVerification,
  mockVerify,
  estimateCostUsd,
  VERIFIER_MODEL,
  type VerifierVerdict,
} from './lib/verifier';
import { resolveVerdict, type VerificationRecord } from './lib/resolution';
import {
  loadTopicContext,
  loadPendingQuestions,
  applyVerification,
  disconnect,
} from './lib/content-db';
import { GENERATION_MODEL } from './lib/anthropic-client';

interface CliArgs {
  topicId: string;
  limit: number;
  mock: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const args: Partial<CliArgs> = { limit: 50, mock: false };
  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case '--topic':
        args.topicId = argv[++i];
        break;
      case '--limit':
        args.limit = Number(argv[++i]);
        break;
      case '--mock':
        args.mock = true;
        break;
    }
  }
  if (!args.topicId) throw new Error('Falta --topic <topicId>');
  return args as CliArgs;
}

interface StoredOption {
  id: 'A' | 'B' | 'C' | 'D';
  text: string;
  isCorrect: boolean;
  imageUrl?: string | null;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!args.mock && (!apiKey || /placeholder|FALTA/i.test(apiKey))) {
    throw new Error('ANTHROPIC_API_KEY no configurada. Corre con --mock o ponla en .env.local.');
  }

  const ctx = await loadTopicContext(args.topicId);
  if (!ctx) throw new Error(`El tema "${args.topicId}" no existe.`);

  const pending = await loadPendingQuestions(args.topicId, args.limit);
  console.log(`🔍 ${pending.length} reactivo(s) pendientes de verificación en "${ctx.topic}"`);

  let approvedCount = 0;
  let cost = 0;
  for (const q of pending) {
    const options = q.options as unknown as StoredOption[];
    const generatorOption = options.find((o) => o.isCorrect)?.id;
    if (!generatorOption) {
      console.log(`   ⚠️ ${q.id}: sin opción correcta marcada — se omite`);
      continue;
    }
    const payload = buildVerifierPayload(
      { stem: q.stem, options, format: q.format },
      { subject: ctx.subject, topic: ctx.topic, institution: ctx.institution },
    );
    let verdict: VerifierVerdict;
    if (args.mock) {
      verdict = mockVerify(payload, generatorOption);
    } else {
      verdict = await runVerification(payload, { apiKey: apiKey as string });
      cost += estimateCostUsd(verdict.model, verdict.usage);
    }
    const resolution = resolveVerdict({ generatorOption, verdict });
    const record: VerificationRecord = {
      pipeline: 'adversarial-v1',
      generatorModel: GENERATION_MODEL,
      generatorOption,
      verdict,
      decision: resolution.decision,
      reasons: resolution.reasons,
      audit: null,
    };
    const approved = resolution.decision === 'AUTO_APPROVED';
    await applyVerification(q.id, record, approved);
    if (approved) approvedCount++;
    console.log(
      `   ${approved ? '✔' : '✋'} ${q.id}: ${verdict.chosenOption} vs ${generatorOption} · conf=${verdict.confidence.toFixed(2)}${approved ? '' : ` · ${resolution.reasons[0]}`}`,
    );
  }

  console.log('─'.repeat(60));
  console.log(
    `✅ Auto-aprobados: ${approvedCount}/${pending.length} · sin publicar: ${pending.length - approvedCount} · verificador: ${args.mock ? 'mock' : VERIFIER_MODEL} · costo ~$${cost.toFixed(4)} USD`,
  );
}

main()
  .catch((err) => {
    console.error(`\n❌ Error: ${(err as Error).message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnect();
  });
