/**
 * scripts/content-audit-resolve.ts — Resuelve el muestreo de auditoría 5%
 * (tercera pasada, G17)
 *
 * Segunda mitad del mecanismo reparado en G17 (ver scripts/content-audit-sample.ts
 * para el diagnóstico: `sampleForAudit` y `Question.verification.audit`
 * existían y estaban testeados, pero ningún script los conectaba a una
 * ejecución real — cero reactivos habían pasado nunca por la tercera
 * pasada).
 *
 * Lee un archivo de respuestas con la MISMA forma que
 * scripts/content-resolve-verification.ts (ver ahí el formato exacto),
 * producidas por una sesión que resolvió a ciegas el lote de
 * `content-blind-batch.ts --ids <muestra de content-audit-sample.ts>`.
 *
 * A diferencia del resolve normal:
 *   - Compara el veredicto de esta TERCERA pasada contra `generatorOption`
 *     (igual que la segunda), reusando `resolveVerdict` sin cambios — la
 *     regla de aprobación es la misma, solo cambia QUIÉN la aplica.
 *   - El resultado se escribe en `verification.audit` (no reemplaza el
 *     veredicto de la segunda pasada, que se preserva tal cual para
 *     auditoría de todo el pipeline).
 *   - Si la tercera pasada NO aprueba (`degraded=true`), el reactivo se
 *     DESPUBLICA (isVerified → false) y cae en la cola "Muestreo degradado"
 *     del panel F3 (src/lib/admin/verification.ts: classifyReviewQueue). Si
 *     confirma, isVerified permanece true — ya lo estaba.
 *
 * GUARDRAIL DE PROCESO: la sesión que produjo el archivo de respuestas debe
 * ser distinta de la que compuso el reactivo Y de la que lo verificó la
 * primera vez (ver scripts/content-audit-sample.ts). Este script no puede
 * verificar eso — es responsabilidad de quien lo invoca.
 *
 * Uso:
 *   npx tsx scripts/content-audit-resolve.ts --file <respuestas.json> [--dry-run]
 *
 * GUARDRAIL: cero llamadas a red o a la API de Anthropic.
 */
import './lib/env';
import { readFileSync } from 'node:fs';

import {
  translateChosenOption,
  VerifierAnswersFileSchema,
  type VerifierAnswer,
} from './lib/blind-verification';
import { resolveVerdict, type VerificationRecord } from './lib/resolution';
import { loadQuestionForAudit, applyVerification, disconnect } from './lib/content-db';

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

async function auditOne(answer: VerifierAnswer): Promise<'confirmed' | 'degraded' | 'skipped'> {
  const question = await loadQuestionForAudit(answer.questionId);
  if (!question) {
    console.log(`   ⚠️ ${answer.questionId}: no existe en la DB — se omite`);
    return 'skipped';
  }
  const existing = question.verification as unknown as VerificationRecord | null;
  if (!existing || existing.audit) {
    console.log(
      `   ⚠️ ${answer.questionId}: sin veredicto previo o ya auditado — se omite (no es candidato de auditoría)`,
    );
    return 'skipped';
  }

  const options = question.options as unknown as StoredOption[];
  const chosenOriginalId = translateChosenOption(answer.questionId, options, answer.chosenOption);

  const auditVerdict = {
    chosenOption: chosenOriginalId as 'A' | 'B' | 'C' | 'D',
    confidence: answer.confidence,
    reasoning: answer.reasoning,
    problems: answer.problems,
    model: answer.model,
    usedCalculation: answer.usedCalculation,
    usage: { inputTokens: 0, outputTokens: 0 },
    verifiedAt: new Date().toISOString(),
  };

  const resolution = resolveVerdict({
    generatorOption: existing.generatorOption as 'A' | 'B' | 'C' | 'D',
    verdict: auditVerdict,
  });
  const degraded = resolution.decision !== 'AUTO_APPROVED';

  const record: VerificationRecord = {
    ...existing,
    audit: { verdict: auditVerdict, decision: resolution.decision, reasons: resolution.reasons, degraded },
  };

  console.log(
    `   ${degraded ? '⚠️ DEGRADADO' : '✔ confirmado'} ${answer.questionId}: auditor=${chosenOriginalId} vs generador=${existing.generatorOption}${degraded ? ` · ${resolution.reasons[0]}` : ''}`,
  );

  await applyVerification(answer.questionId, record, !degraded);
  return degraded ? 'degraded' : 'confirmed';
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  console.log('─'.repeat(60));
  console.log('🦉 YaEntre — Resolviendo muestreo de auditoría 5% (G2, 3ª pasada)');
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

  let confirmed = 0;
  let degraded = 0;
  let skipped = 0;
  for (const answer of parsed.data) {
    const outcome = await auditOne(answer);
    if (outcome === 'confirmed') confirmed++;
    else if (outcome === 'degraded') degraded++;
    else skipped++;
  }

  console.log('─'.repeat(60));
  console.log(
    `✅ Confirmados: ${confirmed}   ⚠️ Degradados (despublicados): ${degraded}   ⏭️ Omitidos: ${skipped}`,
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
