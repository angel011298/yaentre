/**
 * scripts/audit-content.ts — Auditoría real del banco de reactivos (G1).
 *
 * Reporta, contra la base de datos real (nunca contra lo documentado):
 *   1. Total de reactivos isVerified=true + usage=SERVABLE.
 *   2. Desglose por institución → área/rama → materia.
 *   3. Desglose de groundingStatus (SOURCED vs TEMARIO_ONLY) dentro de ese set.
 *   4. Temas del temario con 0 reactivos servibles/verificados.
 *
 * Uso: pnpm exec tsx scripts/audit-content.ts
 */
import './lib/env';
import { prisma } from '../src/lib/db/prisma';

async function main() {
  console.log('🔍 AUDITORÍA REAL DE CONTENIDO — YaEntre\n');

  const servableVerified = await prisma.question.findMany({
    where: { isVerified: true, usage: 'SERVABLE' },
    select: {
      groundingStatus: true,
      topic: {
        select: {
          id: true,
          name: true,
          subject: {
            select: {
              id: true,
              name: true,
              area: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  exam: {
                    select: {
                      level: {
                        select: {
                          institution: { select: { code: true, name: true } },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  const total = servableVerified.length;
  console.log(`1) TOTAL isVerified=true + usage=SERVABLE: ${total}\n`);

  // 2) Desglose institución → área → materia
  type Key = string;
  const bySubject = new Map<Key, { institution: string; area: string; subject: string; count: number }>();
  const byArea = new Map<Key, { institution: string; area: string; count: number }>();
  const byInstitution = new Map<string, number>();
  let sourced = 0;
  let temarioOnly = 0;

  for (const q of servableVerified) {
    const institution = q.topic.subject.area.exam.level.institution.code;
    const area = q.topic.subject.area.name;
    const subject = q.topic.subject.name;

    const subjectKey = `${institution}|${area}|${subject}`;
    const areaKey = `${institution}|${area}`;

    bySubject.set(subjectKey, {
      institution,
      area,
      subject,
      count: (bySubject.get(subjectKey)?.count ?? 0) + 1,
    });
    byArea.set(areaKey, {
      institution,
      area,
      count: (byArea.get(areaKey)?.count ?? 0) + 1,
    });
    byInstitution.set(institution, (byInstitution.get(institution) ?? 0) + 1);

    if (q.groundingStatus === 'SOURCED') sourced++;
    else temarioOnly++;
  }

  console.log('2) DESGLOSE POR INSTITUCIÓN → ÁREA/RAMA → MATERIA:\n');
  console.log('   Por institución:');
  for (const [inst, count] of [...byInstitution.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`     ${inst}: ${count}`);
  }
  console.log('\n   Por área/rama:');
  for (const { institution, area, count } of [...byArea.values()].sort((a, b) => b.count - a.count)) {
    console.log(`     ${institution} / ${area}: ${count}`);
  }
  console.log('\n   Por materia (detalle completo):');
  for (const { institution, area, subject, count } of [...bySubject.values()].sort(
    (a, b) => a.institution.localeCompare(b.institution) || a.area.localeCompare(b.area) || b.count - a.count
  )) {
    console.log(`     ${institution} / ${area} / ${subject}: ${count}`);
  }

  console.log('\n3) GROUNDING STATUS (dentro de isVerified=true + usage=SERVABLE):');
  console.log(`   SOURCED: ${sourced}`);
  console.log(`   TEMARIO_ONLY: ${temarioOnly}`);
  console.log(`   Total: ${sourced + temarioOnly} (debe coincidir con el total de arriba: ${total})`);

  // 4) Temas sin ningún reactivo servible/verificado
  const allTopics = await prisma.topic.findMany({
    select: {
      id: true,
      name: true,
      subject: {
        select: {
          name: true,
          area: {
            select: {
              name: true,
              exam: { select: { level: { select: { institution: { select: { code: true } } } } } },
            },
          },
        },
      },
    },
  });

  const topicsWithContent = new Set(servableVerified.map((q) => q.topic.id));
  const emptyTopics = allTopics.filter((t) => !topicsWithContent.has(t.id));

  console.log(`\n4) TEMAS DEL TEMARIO SIN NINGÚN REACTIVO SERVIBLE/VERIFICADO:`);
  console.log(`   Total temas en el temario: ${allTopics.length}`);
  console.log(`   Temas SIN contenido: ${emptyTopics.length}`);
  console.log(`   Temas CON contenido: ${allTopics.length - emptyTopics.length}`);

  // Agrupar temas vacíos por institución/área para contexto
  const emptyByArea = new Map<string, number>();
  for (const t of emptyTopics) {
    const inst = t.subject.area.exam.level.institution.code;
    const key = `${inst} / ${t.subject.area.name}`;
    emptyByArea.set(key, (emptyByArea.get(key) ?? 0) + 1);
  }
  console.log('\n   Temas vacíos por institución/área:');
  for (const [key, count] of [...emptyByArea.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`     ${key}: ${count} temas sin contenido`);
  }

  console.log('\n✅ Auditoría completada contra la base de datos real.\n');

  // Salida JSON estructurada para uso programático (tabla de brecha)
  console.log('---JSON_START---');
  console.log(
    JSON.stringify(
      {
        total,
        sourced,
        temarioOnly,
        byInstitution: Object.fromEntries(byInstitution),
        byArea: [...byArea.values()],
        bySubject: [...bySubject.values()],
        totalTopics: allTopics.length,
        emptyTopics: emptyTopics.length,
        emptyByArea: Object.fromEntries(emptyByArea),
      },
      null,
      2
    )
  );
  console.log('---JSON_END---');
}

main()
  .catch((err) => {
    console.error('❌ Error en auditoría:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
