/**
 * scripts/g94/pool-deficit.ts — ¿DÓNDE queda la brecha de la meta EFECTIVA? (G94)
 *
 * `content:coverage` reporta dos metas y es fácil confundirlas:
 *
 *   META 1,500 (por celda)   → VOLUMEN: ¿cuántos reactivos servibles hay en
 *                              total? Cada reactivo se cuenta UNA vez (vive en
 *                              un solo `Subject`). En G94: 1502 → cumplida.
 *   META 1222 (efectiva, G26) → DISTRIBUCIÓN: la meta de cada pool compartido
 *                              es la de su celda de mayor peso, y la cobertura
 *                              se TOPA en `min(poolHave, poolTarget)`, así que
 *                              el excedente de un pool NO tapa el hueco de
 *                              otro. Su «brecha 106» no dice que falten 106
 *                              reactivos para 1,500: dice que 106 de los 1222
 *                              caen en pools que siguen por debajo de su
 *                              propio objetivo.
 *
 * Este script imprime esa brecha pool por pool para que la cifra sea accionable
 * en vez de un número suelto al pie del reporte. Réplica de `computeSharedGoal`
 * (scripts/content-coverage.ts), reusando el MISMO agrupador de G26 para no
 * crear una segunda definición que se desincronice (lección de G74: nunca una
 * constante paralela).
 *
 * Uso: npx tsx scripts/g94/pool-deficit.ts
 */
import '../lib/env';
import { PrismaClient } from '@prisma/client';

import { resolveSharedSubjectGroups } from '../../src/lib/content/shared-subjects';

const GOAL_VERIFIED = 1500;

async function main() {
  const prisma = new PrismaClient();
  try {
    const subjects = await prisma.subject.findMany({
      select: {
        id: true,
        name: true,
        questionWeight: true,
        sharedContentKey: true,
        area: {
          select: {
            name: true,
            examId: true,
            exam: { select: { level: { select: { institution: { select: { code: true } } } } } },
          },
        },
        topics: { select: { questions: { select: { isVerified: true } } } },
      },
    });

    const rows = subjects.map((s) => ({
      id: s.id,
      label: `${s.area.exam.level.institution.code} ${s.area.name} · ${s.name}`,
      name: s.name,
      examId: s.area.examId,
      weight: s.questionWeight,
      sharedContentKey: s.sharedContentKey,
      verified: s.topics.reduce(
        (a, t) => a + t.questions.filter((q) => q.isVerified).length,
        0,
      ),
    }));

    const totalWeight = rows.reduce((a, s) => a + s.weight, 0);
    const density = GOAL_VERIFIED / totalWeight;
    const byId = new Map(rows.map((s) => [s.id, s]));

    let goalNew = 0;
    let covered = 0;
    const pools: { label: string; target: number; have: number; deficit: number }[] = [];

    for (const examId of new Set(rows.map((s) => s.examId))) {
      const examSubjects = rows.filter((s) => s.examId === examId);
      const groups = resolveSharedSubjectGroups(
        examSubjects.map((s) => ({ subjectId: s.id, sharedContentKey: s.sharedContentKey })),
      );
      const seen = new Set<string>();
      for (const s of examSubjects) {
        const memberIds = [...(groups.get(s.id) ?? new Set([s.id]))].sort();
        const poolId = memberIds.join('+');
        if (seen.has(poolId)) continue;
        seen.add(poolId);
        const members = memberIds.map((id) => byId.get(id)!);
        const target = Math.max(...members.map((m) => Math.round(m.weight * density)));
        const have = members.reduce((a, m) => a + m.verified, 0);
        goalNew += target;
        covered += Math.min(have, target);
        const label =
          members.length > 1
            ? `${members[0].label.split(' · ')[0].split(' ')[0]} [pool ${members[0].sharedContentKey}] ${members[0].name}`
            : members[0].label;
        pools.push({ label, target, have, deficit: Math.max(0, target - have) });
      }
    }

    const line = '─'.repeat(78);
    console.log(line);
    console.log('🦉 G94 — ¿Dónde queda la brecha de la META EFECTIVA (G26)?');
    console.log(line);
    const totalVerified = rows.reduce((a, s) => a + s.verified, 0);
    console.log(`VOLUMEN  · servibles en banco: ${totalVerified}  vs meta 1,500  →  ` +
      (totalVerified >= GOAL_VERIFIED
        ? `CUMPLIDA, excedente +${totalVerified - GOAL_VERIFIED}`
        : `FALTAN ${GOAL_VERIFIED - totalVerified}`));
    console.log(`EFECTIVA · meta ${goalNew} · cubierto ${covered} · brecha ${goalNew - covered}`);
    console.log(line);

    const short = pools.filter((p) => p.deficit > 0).sort((a, b) => b.deficit - a.deficit);
    if (short.length === 0) {
      console.log('Ningún pool por debajo de su objetivo.');
    } else {
      console.log(`${short.length} pool(s) por debajo de su objetivo (suman la brecha):\n`);
      for (const p of short) {
        console.log(
          `  −${String(p.deficit).padStart(3)}  ${String(p.have).padStart(4)}/${String(p.target).padEnd(4)}  ${p.label}`,
        );
      }
      console.log(`\n  brecha total: ${short.reduce((a, p) => a + p.deficit, 0)}`);
    }

    const over = pools.filter((p) => p.have > p.target);
    const surplus = over.reduce((a, p) => a + (p.have - p.target), 0);
    console.log(line);
    console.log(
      `Excedente NO transferible: ${surplus} reactivos en ${over.length} pool(s) por encima de su objetivo.`,
    );
    console.log('Por eso el banco puede pasar de 1,500 en VOLUMEN y la métrica EFECTIVA seguir con brecha:');
    console.log('son dos preguntas distintas (cuánto hay / dónde está).');
    console.log(line);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
