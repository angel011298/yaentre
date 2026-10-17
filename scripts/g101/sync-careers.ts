/**
 * scripts/g101/sync-careers.ts — G101. Lleva las carreras de la base al
 * catálogo oficial (`src/lib/content/career-catalog.ts`).
 *
 *   pnpm content:careers            # vista previa: qué haría, sin escribir
 *   pnpm content:careers --apply    # aplica, un área por transacción
 *
 * Solo toca `careers`: renombra (conservando id, metas de alumnos y aciertos
 * mínimos), crea las que faltan sin aciertos mínimos, y retira únicamente las
 * listadas en `RETIRED_CAREER_NAMES` que nadie tenga como meta. Lo que no
 * reconoce lo REPORTA y lo deja. No corre el seed completo a propósito: el
 * seed también reescribe materias y temas, y eso no es parte de esta tarea.
 *
 * Usa `DATABASE_URL` de `.env.local` (vía `../g71/env`), con el rol de la app.
 */
import '../g71/env';
import { PrismaClient } from '@prisma/client';
import type { CatalogAreaCode } from '../../src/lib/content/career-catalog';
import { catalogForArea } from '../../src/lib/content/career-catalog';
import { planHasChanges } from '../../src/lib/content/career-sync';
import { applyCareerPlan, planForArea, readAreaCareers } from '../../prisma/seed/careers';

const AREA_CODES: CatalogAreaCode[] = [
  'AREA_1',
  'AREA_2',
  'AREA_3',
  'AREA_4',
  'IPN_FISMAT',
  'IPN_MEDBIO',
  'IPN_SOCADM',
];

const apply = process.argv.includes('--apply');
const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });

async function main(): Promise<void> {
  console.log(`G101 — carreras contra el catálogo oficial (${apply ? 'APLICANDO' : 'vista previa'})`);
  let attention = 0;

  for (const code of AREA_CODES) {
    const areas = await prisma.area.findMany({ where: { code }, select: { id: true, name: true } });
    if (areas.length !== 1) {
      console.log(`\n✖ ${code}: se esperaba 1 área con ese código y hay ${areas.length}.`);
      attention++;
      continue;
    }
    const area = areas[0];
    const before = await readAreaCareers(prisma, area.id);
    const plan = planForArea(code, before);

    console.log(`\n· ${code} — ${area.name}: ${before.length} en la base, ${catalogForArea(code)?.length} en el catálogo`);
    for (const r of plan.renames) console.log(`    renombrar  «${r.from}» → «${r.to}»`);
    if (plan.creates.length) console.log(`    crear      ${plan.creates.length}: ${plan.creates.join(' · ')}`);
    for (const r of plan.retires) console.log(`    retirar    «${r.name}» (sin alumnos)`);
    for (const r of plan.blockedRetires) {
      console.log(`    ⚠ NO se retira «${r.name}»: ${r.targetedBy} alumno(s) la tienen de meta`);
      attention++;
    }
    for (const c of plan.conflicts) {
      console.log(`    ⚠ conflicto: existen «${c.official}» y «${c.former}» a la vez — revisar a mano`);
      attention++;
    }
    for (const u of plan.unknown) {
      console.log(`    ⚠ fuera del catálogo y no retirada: «${u}» — se deja`);
      attention++;
    }
    if (!planHasChanges(plan)) console.log('    (sin cambios)');

    if (apply && planHasChanges(plan)) {
      await applyCareerPlan(prisma, area.id, code, plan);
      const after = await readAreaCareers(prisma, area.id);
      const names = new Set(after.map((c) => c.name));
      const missing = (catalogForArea(code) ?? []).filter((c) => !names.has(c.name));
      const targetsBefore = before.reduce((n, c) => n + c.targetedBy, 0);
      const targetsAfter = after.reduce((n, c) => n + c.targetedBy, 0);
      console.log(
        `    ✔ aplicado: ${after.length} en la base · faltan ${missing.length} · metas de alumnos ${targetsBefore} → ${targetsAfter}`
      );
      if (missing.length > 0 || targetsAfter !== targetsBefore) attention++;
    }
  }

  console.log(attention === 0 ? '\nTodo en orden.' : `\n${attention} punto(s) requieren atención.`);
  if (attention > 0) process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
