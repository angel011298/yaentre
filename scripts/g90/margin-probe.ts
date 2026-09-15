/**
 * scripts/g90/margin-probe.ts — El margen de Early Bird, medido por EFECTO (G90)
 *
 * `docs/VEREDICTO_LANZAMIENTO.md` fijó en **300** el mínimo de reactivos
 * propios de UNAM Área 1 para abrir Early Bird, y G89 (§7 de `ESTADO.md`)
 * recalculó ese número a mano contra la DB. Un número que se recalcula a mano
 * en cada fase es un número que se desincroniza: esta sonda lo mide con SQL
 * crudo, sin pasar por `content-coverage.ts` ni por `content:guard`, para que
 * el dato del documento y el de la base no puedan separarse.
 *
 * Qué cuenta y por qué:
 *   · SOLO las filas `Subject` PROPIAS del área (`areas.code = 'AREA_1'`).
 *     NO suma el pool compartido completo de G26 (`sharedContentKey`): el
 *     mínimo de Early Bird se fijó sobre contenido propio, y contar el pool
 *     entero inflaría Química/Español/Inglés con reactivos que también
 *     sostienen a las otras tres áreas UNAM.
 *   · Servible = `isVerified = true AND usage = 'SERVABLE'` — el mismo criterio
 *     que `content-coverage.ts` usa para su total, incluida la exclusión de los
 *     retirados de G40 (verificados pero no servibles).
 *
 * Uso:
 *   pnpm content:margin
 */
import '../lib/env';
import { PrismaClient } from '@prisma/client';

/** Mínimo de reactivos propios de Área 1 fijado en docs/VEREDICTO_LANZAMIENTO.md. */
const EARLY_BIRD_MIN = 300;
/** Meta de banco del PRD §8. */
const BANK_GOAL = 1500;

const prisma = new PrismaClient();

async function main() {
  console.log('─'.repeat(66));
  console.log('🦉 G90 — Margen de Early Bird de UNAM Área 1 (recuento SQL directo)');
  console.log('─'.repeat(66));

  const rows = await prisma.$queryRaw<{ subject: string; n: bigint }[]>`
    SELECT s.name AS subject, COUNT(q.id) AS n
    FROM "questions" q
    JOIN "topics" t       ON t.id = q."topicId"
    JOIN "subjects" s     ON s.id = t."subjectId"
    JOIN "areas" a        ON a.id = s."areaId"
    JOIN "exams" e        ON e.id = a."examId"
    JOIN "levels" l       ON l.id = e."levelId"
    JOIN "institutions" i ON i.id = l."institutionId"
    WHERE q."isVerified" = true
      AND q."usage" = 'SERVABLE'
      AND i.code = 'UNAM'
      AND a.code = 'AREA_1'
    GROUP BY s.name
    ORDER BY n DESC;
  `;

  let propio = 0;
  for (const r of rows) {
    const n = Number(r.n);
    propio += n;
    console.log(`   · ${r.subject.padEnd(16)} ${String(n).padStart(4)}`);
  }

  const margen = propio - EARLY_BIRD_MIN;
  const signo = margen >= 0 ? '+' : '';
  console.log(
    `   TOTAL propio: ${propio}  ·  mínimo Early Bird: ${EARLY_BIRD_MIN}  ·  MARGEN: ${signo}${margen}`,
  );

  // Mismas tres cubetas que `content-coverage.ts`, para que las dos cuentas no
  // puedan discrepar: servible; en COLA de resolución (sin veredicto todavía);
  // y con veredicto pero sin publicar — discrepancia de F3 o retiro de G40
  // (`verification.manualReview`), ambos con `isVerified = false`.
  const banco = (
    await prisma.$queryRaw<
      { servibles: bigint; encola: bigint; converedicto: bigint; filas: bigint }[]
    >`
      SELECT COUNT(*) FILTER (WHERE "isVerified" = true AND "usage" = 'SERVABLE')          AS servibles,
             COUNT(*) FILTER (WHERE "isVerified" = false AND "verification" IS NULL)       AS encola,
             COUNT(*) FILTER (WHERE "isVerified" = false AND "verification" IS NOT NULL)   AS converedicto,
             COUNT(*)                                                                      AS filas
      FROM "questions";
    `
  )[0];

  const servibles = Number(banco.servibles);
  console.log('─'.repeat(66));
  console.log(
    `Banco: ${servibles} servibles · ${Number(banco.encola)} en cola de resolución · ` +
      `${Number(banco.converedicto)} con veredicto sin publicar (discrepancias F3 + retirados G40) · ` +
      `${Number(banco.filas)} filas`,
  );
  console.log(`Brecha contra la meta de ${BANK_GOAL.toLocaleString('es-MX')}: ${BANK_GOAL - servibles}`);
  console.log('─'.repeat(66));

  if (margen < 0) {
    console.error(`❌ Área 1 está POR DEBAJO del mínimo de Early Bird por ${-margen} reactivos.`);
    process.exitCode = 1;
  } else {
    console.log('✅ Área 1 cumple el mínimo de Early Bird.');
  }
}

main()
  .catch((err) => {
    console.error(`\n❌ Error: ${(err as Error).message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
