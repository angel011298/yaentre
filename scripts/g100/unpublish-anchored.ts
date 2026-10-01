/**
 * scripts/g100/unpublish-anchored.ts — DESPUBLICA los reactivos anclados a CENEVAL, con compuerta (G100).
 *
 * Paso 5 de las instrucciones CLO. REGLA DE ORO: un anclado solo se despublica
 * si YA hay un reemplazo PUBLICADO y LIMPIO del mismo tema que lo cubra, y cada
 * reemplazo cubre UN solo anclado (ver `planReplacements`, probado en
 * tests/scripts/g100-plan.test.ts). El resto se queda publicado y se reporta
 * como PENDIENTE.
 *
 *  · NUNCA borra: solo `isVerified = false` (despublicar), porque un reactivo con
 *    respuestas históricas no se elimina (CLAUDE.md, capa de datos).
 *  · «Reemplazo limpio» = isVerified=true, NO está en la lista de anclados y NO
 *    está ligado a ninguna fuente restringida; se reconoce por el enunciado de
 *    los lotes de `docs/content-batches/g100-ceneval/*` (tema + enunciado).
 *  · La cobertura de cada pool compartido debe quedar ≥ 90 % de su tamaño
 *    original (`poolCoverage`); si no, aborta sin escribir.
 *  · Es un ENSAYO salvo `--apply`. La auditoría final cuenta, contra la base
 *    VIVA y no contra la lista, cuántos reactivos publicados siguen ligados a
 *    una fuente restringida.
 *
 * Uso: npx tsx scripts/g100/unpublish-anchored.ts [--apply]
 */
import '../lib/env';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { getPrisma, disconnect } from '../lib/content-db';
import { isRestrictedGroundingSource } from '../lib/grounding';
import { normalizeStem } from '../lib/question-draft-schema';
import { planReplacements, poolCoverage, type QuestionRef } from './plan';

const LOT_ROOT = resolve('docs/content-batches/g100-ceneval');

async function main() {
  const apply = process.argv.includes('--apply');
  const prisma = getPrisma();

  const anchoredIds: string[] = (
    JSON.parse(readFileSync(join(LOT_ROOT, 'anchored-70.json'), 'utf8')) as { questions: { id: string }[] }
  ).questions.map((q) => q.id);
  const anchoredSet = new Set(anchoredIds);

  const select = {
    id: true,
    stem: true,
    topicId: true,
    format: true,
    difficulty: true,
    isVerified: true,
    topic: { select: { subject: { select: { id: true, sharedContentKey: true } } } },
    sourceChunks: { select: { sourceChunk: { select: { contentSource: { select: { name: true, institution: true, fileRef: true } } } } } },
  } as const;

  const anchoredRows = await prisma.question.findMany({ where: { id: { in: anchoredIds } }, select });
  const anchored: QuestionRef[] = anchoredRows
    .filter((q) => q.isVerified)
    .map((q) => ({ id: q.id, topicId: q.topicId, format: q.format, difficulty: q.difficulty }));
  console.log(`Anclados de la lista: ${anchoredIds.length} · hoy publicados: ${anchored.length}`);

  // Reemplazos: los reactivos de los lotes que YA están publicados y limpios.
  const replacements: QuestionRef[] = [];
  for (const lot of readdirSync(LOT_ROOT, { withFileTypes: true }).filter((d) => d.isDirectory())) {
    const dir = join(LOT_ROOT, lot.name);
    const { TOPICS } = (await import(pathToFileURL(join(dir, 'build-data.mjs')).href)) as {
      TOPICS: { id: string; file: string }[];
    };
    for (const t of TOPICS) {
      const stems = new Set(
        (JSON.parse(readFileSync(join(dir, t.file), 'utf8')) as { stem: string }[]).map((d) => normalizeStem(d.stem)),
      );
      const rows = await prisma.question.findMany({ where: { topicId: t.id, isVerified: true }, select });
      for (const r of rows) {
        if (anchoredSet.has(r.id) || !stems.has(normalizeStem(r.stem))) continue;
        if (r.sourceChunks.some((l) => isRestrictedGroundingSource(l.sourceChunk.contentSource))) continue;
        replacements.push({ id: r.id, topicId: r.topicId, format: r.format, difficulty: r.difficulty });
      }
    }
  }
  console.log(`Reemplazos publicados y limpios encontrados: ${replacements.length}`);

  const plan = planReplacements(anchored, replacements);

  // Cobertura por pool (clave canónica G26: sharedContentKey ?? subjectId).
  const topics = await prisma.topic.findMany({
    select: { id: true, subject: { select: { id: true, sharedContentKey: true } } },
  });
  const poolOfTopic = new Map(topics.map((t) => [t.id, t.subject.sharedContentKey ?? t.subject.id]));
  const servable = await prisma.question.findMany({ where: { isVerified: true }, select: { topicId: true } });
  const servableByPool = new Map<string, number>();
  for (const q of servable) {
    const pool = poolOfTopic.get(q.topicId)!;
    servableByPool.set(pool, (servableByPool.get(pool) ?? 0) + 1);
  }
  const bump = (m: Map<string, number>, topicId: string) => m.set(poolOfTopic.get(topicId)!, (m.get(poolOfTopic.get(topicId)!) ?? 0) + 1);
  const unpublishedByPool = new Map<string, number>();
  for (const p of plan.pairs) bump(unpublishedByPool, p.topicId);
  const replacementsByPool = new Map<string, number>();
  for (const r of replacements) bump(replacementsByPool, r.topicId);
  const coverage = poolCoverage(servableByPool, unpublishedByPool, replacementsByPool).filter(
    (c) => unpublishedByPool.has(c.pool) || replacementsByPool.has(c.pool),
  );
  for (const c of coverage) {
    console.log(`  pool ${c.pool}: tamaño original ${c.baseline} → tras despublicar ${c.after} (${(c.ratio * 100).toFixed(1)} %) ${c.ok ? '✓' : '✗'}`);
  }
  if (coverage.some((c) => !c.ok)) {
    console.error('❌ Un pool quedaría bajo 90 %: no se despublica nada.');
    process.exitCode = 1;
    return;
  }

  console.log(`Plan: despublicar ${plan.pairs.length} · PENDIENTES (sin reemplazo): ${plan.pending.length}`);
  if (!apply) {
    console.log('Ensayo: no se escribió nada. Repite con --apply.');
  } else if (plan.pairs.length > 0) {
    const res = await prisma.question.updateMany({
      where: { id: { in: plan.pairs.map((p) => p.anchoredId) }, isVerified: true },
      data: { isVerified: false }, // despublicar: NUNCA borrar
    });
    console.log(`Despublicados (isVerified=false): ${res.count}`);
  }

  // Auditoría contra la base VIVA.
  const live = await prisma.question.findMany({
    where: { isVerified: true, sourceChunks: { some: {} } },
    select: { id: true, sourceChunks: { select: { sourceChunk: { select: { contentSource: { select: { name: true, institution: true, fileRef: true } } } } } } },
  });
  const stillAnchored = live.filter((q) => q.sourceChunks.some((l) => isRestrictedGroundingSource(l.sourceChunk.contentSource)));
  console.log(`Auditoría: reactivos PUBLICADOS aún ligados a CENEVAL/EXANI = ${stillAnchored.length} (meta: 0)`);
  if (stillAnchored.length > 0 && apply && plan.pending.length === 0) process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error(`\n❌ Error: ${(err as Error).message}`);
    process.exitCode = 1;
  })
  .finally(disconnect);
