import type { ConfidenceLevel, Prisma, PrismaClient } from '@prisma/client';
import {
  CATALOG_SOURCES,
  RETIRED_CAREER_NAMES,
  catalogForArea,
  type CatalogAreaCode,
} from '../../src/lib/content/career-catalog';
import {
  planCareerSync,
  type CareerSyncPlan,
  type ExistingCareer,
} from '../../src/lib/content/career-sync';

export interface CareerSource {
  url: string;
  label: string;
}

/** Carrera ancla: una carrera del catálogo CON aciertos mínimos documentados. */
export interface CareerSeed {
  name: string;
  minAciertos: number;
  year: number;
  confidence: ConfidenceLevel;
  sources: CareerSource[];
}

/**
 * G101 — carreras de un área = catálogo oficial completo + aciertos mínimos
 * de las anclas. Lo usan los seeds (base nueva) y `pnpm content:careers`
 * (base existente, con vista previa).
 */
export async function readAreaCareers(
  prisma: PrismaClient,
  areaId: string
): Promise<ExistingCareer[]> {
  const rows = await prisma.career.findMany({
    where: { areaId },
    select: { id: true, name: true, _count: { select: { targetedBy: true } } },
  });
  return rows.map((r) => ({ id: r.id, name: r.name, targetedBy: r._count.targetedBy }));
}

export function planForArea(areaCode: CatalogAreaCode, existing: ExistingCareer[]): CareerSyncPlan {
  const catalog = catalogForArea(areaCode);
  if (!catalog) throw new Error(`No hay catálogo para el área ${areaCode}.`);
  return planCareerSync({ existing, catalog, retired: RETIRED_CAREER_NAMES[areaCode] ?? [] });
}

/**
 * Aplica el plan en UNA transacción: o queda el área completa o no cambia
 * nada. El borrado de retiradas vuelve a exigir «sin alumnos» en el propio
 * `WHERE`, por si alguien eligió esa carrera entre el plan y la escritura.
 */
export async function applyCareerPlan(
  prisma: PrismaClient,
  areaId: string,
  areaCode: CatalogAreaCode,
  plan: CareerSyncPlan
): Promise<void> {
  const source = areaCode.startsWith('IPN_') ? CATALOG_SOURCES.IPN : CATALOG_SOURCES.UNAM;
  const sources = [
    { url: source.url, label: `${source.label} · consultada ${source.retrievedAt}` },
  ] as unknown as Prisma.InputJsonValue;

  await prisma.$transaction(async (tx) => {
    for (const r of plan.renames) {
      await tx.career.update({ where: { id: r.id }, data: { name: r.to } });
    }
    if (plan.creates.length > 0) {
      await tx.career.createMany({
        data: plan.creates.map((name) => ({ areaId, name, sources })),
        skipDuplicates: true,
      });
    }
    if (plan.retires.length > 0) {
      await tx.career.deleteMany({
        where: { id: { in: plan.retires.map((r) => r.id) }, targetedBy: { none: {} } },
      });
    }
  });
}

export async function syncCatalogCareers(
  prisma: PrismaClient,
  areaId: string,
  areaCode: CatalogAreaCode
): Promise<CareerSyncPlan> {
  const plan = planForArea(areaCode, await readAreaCareers(prisma, areaId));
  await applyCareerPlan(prisma, areaId, areaCode, plan);
  return plan;
}

/**
 * Aciertos mínimos de las anclas, por nombre OFICIAL. Una ancla cuyo nombre
 * no esté en el catálogo es un error del seed, no algo que se cree aparte: así
 * no vuelve a colarse una carrera que la institución no ofrece.
 */
export async function seedCareerTargets(
  prisma: PrismaClient,
  areaId: string,
  areaCode: CatalogAreaCode,
  anchors: CareerSeed[]
): Promise<void> {
  const catalog = catalogForArea(areaCode) ?? [];
  for (const anchor of anchors) {
    if (!catalog.some((c) => c.name === anchor.name)) {
      throw new Error(`Carrera ancla fuera del catálogo oficial (${areaCode}): ${anchor.name}`);
    }
    await prisma.career.update({
      where: { areaId_name: { areaId, name: anchor.name } },
      data: {
        minAciertos: anchor.minAciertos,
        minAciertosYear: anchor.year,
        minAciertosConfidence: anchor.confidence,
        sources: anchor.sources as unknown as Prisma.InputJsonValue,
      },
    });
  }
}
