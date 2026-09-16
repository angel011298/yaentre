/**
 * scripts/g96/length-recheck.ts — Re-medición de LENGTH_BIAS tras la corrección (G96)
 *
 * G95 corrigió editorialmente 6 reactivos de Comprensión lectora
 * (pool UNAM:ESPANOL) cuya clave era la opción más larga con una
 * concentración estadísticamente improbable (6/8 = 75 %, p = 0.42 %),
 * y los devolvió a `isVerified=false`. G96 los resolvió a ciegas y los
 * republicó; esta sonda comprueba, POR EFECTO contra la base, que el
 * subgrupo dejó de estar concentrado.
 *
 * Mide igual que `scripts/lib/lot-validation.ts`: la clave cuenta solo si es
 * ESTRICTAMENTE la más larga (los empates no cuentan — lección de G79), y la
 * significancia sale de la cola superior binomial exacta contra azar 25 %,
 * con los mismos umbrales de G95 (advertencia < 5 %, rechazo < 1 %).
 *
 * Uso: npx tsx scripts/g96/length-recheck.ts
 */
import '../lib/env';
import { PrismaClient } from '@prisma/client';

const CHANCE = 0.25;
const WARN = 0.05;
const REJECT = 0.01;

/** Cola superior binomial exacta, sin factoriales (igual que G95). */
function binomialUpperTail(k: number, n: number, p: number): number {
  let sum = 0;
  for (let i = k; i <= n; i++) {
    let c = 1;
    for (let j = 0; j < i; j++) c = (c * (n - j)) / (j + 1);
    sum += c * Math.pow(p, i) * Math.pow(1 - p, n - i);
  }
  return sum;
}

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    const questions = await prisma.question.findMany({
      where: { topic: { name: { contains: 'Comprensión lectora' } } },
      select: {
        id: true,
        isVerified: true,
        options: true,
        topic: { select: { name: true, subject: { select: { name: true, sharedContentKey: true } } } },
      },
    });

    interface RawOption { text?: string; isCorrect?: boolean }
    const rows = questions
      .map((q) => ({ ...q, opts: (Array.isArray(q.options) ? q.options : []) as RawOption[] }))
      .filter((q) => q.opts.length === 4 && q.opts.some((o) => o.isCorrect === true));

    if (rows.length === 0) {
      console.log('⚠️  Sin reactivos de Comprensión lectora con 4 opciones.');
      return;
    }

    const byPool = new Map<string, typeof rows>();
    for (const q of rows) {
      const pool = q.topic.subject.sharedContentKey ?? q.topic.subject.name;
      const bucket = byPool.get(pool) ?? [];
      bucket.push(q);
      byPool.set(pool, bucket);
    }

    console.log('─'.repeat(64));
    console.log('🦉 YaEntre — LENGTH_BIAS del subgrupo «Comprensión lectora» (G96)');
    console.log('─'.repeat(64));

    let worst = 1;
    for (const [pool, bucket] of [...byPool.entries()].sort()) {
      let strict = 0;
      let tied = 0;
      const ranks: number[] = [];
      for (const q of bucket) {
        const lens = q.opts.map((o) => ({ ok: o.isCorrect === true, n: (o.text ?? '').length }));
        const key = lens.find((x) => x.ok)!;
        const longer = lens.filter((x) => x.n > key.n).length;
        const equal = lens.filter((x) => x.n === key.n).length - 1;
        if (longer === 0 && equal === 0) strict++;
        else if (longer === 0) tied++;
        ranks.push(longer + 1);
      }
      const share = strict / bucket.length;
      const p = binomialUpperTail(strict, bucket.length, CHANCE);
      const meanRank = ranks.reduce((a, b) => a + b, 0) / ranks.length;
      const verdict = p < REJECT ? '❌ RECHAZO' : p < WARN ? '⚠️  ADVERTENCIA' : '✅ SANO';
      worst = Math.min(worst, p);
      console.log(`pool ${pool}`);
      console.log(`  reactivos (4 opciones):    ${bucket.length}  ·  verificados: ${bucket.filter((r) => r.isVerified).length}`);
      console.log(`  clave estrictamente larga: ${strict}/${bucket.length} = ${(share * 100).toFixed(1)} %`);
      console.log(`  empates en el máximo:      ${tied}`);
      console.log(`  rango medio de la clave:   ${meanRank.toFixed(2)}  (azar = 2.50; 1 = más larga)`);
      console.log(`  P(≥${strict} de ${bucket.length} | azar 25 %):   ${(p * 100).toFixed(2)} %`);
      console.log(`  veredicto:                 ${verdict}`);
    }
    console.log('─'.repeat(64));
    console.log(`umbrales G95:               advertencia < ${WARN * 100} %, rechazo < ${REJECT * 100} %`);
    console.log('referencia G95 (antes):     UNAM:ESPANOL 6/8 = 75.0 %, p = 0.42 % → ❌ RECHAZO');
    console.log('─'.repeat(64));
    const p = worst;
    if (p < WARN) process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void main();
