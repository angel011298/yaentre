/**
 * scripts/content-audit-sample.ts — Selecciona el muestreo de auditoría 5%
 * (tercera pasada, G17)
 *
 * Repara el mecanismo que quedó definido pero nunca ejecutado: `sampleForAudit`
 * (scripts/lib/resolution.ts) y el campo `Question.verification.audit`
 * existían y estaban testeados desde el pipeline original, pero ningún
 * script los invocaba — cero reactivos habían pasado nunca por la tercera
 * pasada. Ver docs/ESTADO.md G17 para el diagnóstico completo.
 *
 * Qué hace:
 *   1. Consulta los reactivos auto-aprobados (isVerified=true) cuyo
 *      `verification.audit` sigue en null (nunca auditados).
 *   2. Aplica `sampleForAudit` (5% por defecto, Math.random real — NO
 *      determinista, a propósito: es una auditoría real, no un test).
 *   3. Exporta los ids elegidos a un archivo, listos para
 *      `content-blind-batch.ts --ids <...>`.
 *
 * GUARDRAIL DE PROCESO (igual que el de la verificación ciega normal, ver
 * scripts/content-blind-batch.ts): la sesión que resuelva este lote debe ser
 * DISTINTA de la que lo compuso Y de la que lo verificó por primera vez —
 * de lo contrario no es una tercera pasada independiente, es la misma
 * mirada dos veces. Este script NO resuelve nada; solo selecciona la
 * muestra. La resolución va en scripts/content-audit-resolve.ts.
 *
 * Uso:
 *   npx tsx scripts/content-audit-sample.ts [--rate 0.05] [--limit 2000] [--out <path>]
 */
import './lib/env';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { sampleForAudit, AUDIT_RATE } from './lib/resolution';
import { loadApprovedQuestionsForAudit, disconnect } from './lib/content-db';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXPORT_DIR = join(__dirname, 'content-exports');

interface CliArgs {
  rate: number;
  limit: number;
  out?: string;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { rate: AUDIT_RATE, limit: 2000 };
  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case '--rate':
        args.rate = Number(argv[++i]);
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
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  console.log('─'.repeat(60));
  console.log('🦉 YaEntre — Muestreo de auditoría 5% (G2, tercera pasada)');
  console.log('─'.repeat(60));

  const pool = await loadApprovedQuestionsForAudit(args.limit);
  console.log(`🔍 Pool elegible (isVerified=true, nunca auditado): ${pool.length}`);

  if (pool.length === 0) {
    console.log('Nada que auditar: o no hay aprobados, o ya se auditó todo el pool actual.');
    return;
  }

  const sample = sampleForAudit(pool, args.rate);
  const ids = sample.map((q) => q.id);
  console.log(`🎯 Muestra (${(args.rate * 100).toFixed(0)}%): ${ids.length} reactivo(s)`);

  mkdirSync(EXPORT_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outPath = args.out ?? join(EXPORT_DIR, `audit-sample-${stamp}.json`);
  writeFileSync(outPath, JSON.stringify(ids, null, 2), 'utf8');

  console.log(`📄 Ids escritos en: ${outPath}`);
  console.log('─'.repeat(60));
  console.log('SIGUIENTE PASO: generar el lote ciego de esta muestra con');
  console.log(`   pnpm content:blind-batch --ids "${ids.slice(0, 3).join(',')}${ids.length > 3 ? ',...' : ''}"`);
  console.log('(usa el contenido completo de este archivo para --ids, no solo');
  console.log('el ejemplo truncado de arriba). Pégalo en una sesión NUEVA e');
  console.log('independiente — distinta de la que compuso Y de la que verificó');
  console.log('estos reactivos la primera vez — y resuelve con:');
  console.log('   pnpm content:audit-resolve --file <respuestas.json>');
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
