import type { CatalogCareer } from './career-catalog';

/**
 * G101 — plan para llevar las carreras de UN área de la base al catálogo
 * oficial (`career-catalog.ts`). Puro: recibe lo que hay y devuelve qué
 * hacer, sin tocar la base. Lo ejecutan los seeds y `pnpm content:careers`
 * (que además lo imprime antes de aplicarlo).
 *
 * Reglas, en orden:
 *  1. Una carrera del catálogo que ya existe con su nombre oficial: nada.
 *  2. Si no existe pero hay una fila con uno de sus `formerNames`: se
 *     RENOMBRA esa fila. Se conserva el id, así la meta de cada alumno, sus
 *     aciertos mínimos y sus fuentes siguen intactos.
 *  3. Si no existe de ninguna forma: se CREA, sin aciertos mínimos (el
 *     Entrómetro dice «sin dato» en vez de inventar un número).
 *  4. Una fila retirada (no está en la oferta oficial) se BORRA solo si nadie
 *     la tiene como meta; si alguien la tiene, se reporta y se deja.
 *  5. Cualquier otra fila que no reconozca el catálogo se reporta y NO se
 *     toca: borrarla en automático podría quitarle la meta a un alumno por un
 *     error de catálogo.
 */

export interface ExistingCareer {
  id: string;
  name: string;
  /** Cuántos perfiles la tienen como carrera meta. */
  targetedBy: number;
}

export interface CareerSyncPlan {
  renames: Array<{ id: string; from: string; to: string }>;
  creates: string[];
  retires: Array<{ id: string; name: string }>;
  /** Retiradas que no se pueden borrar porque alguien las tiene de meta. */
  blockedRetires: Array<{ id: string; name: string; targetedBy: number }>;
  /** El nombre oficial y un nombre anterior existen a la vez: no se fusionan solos. */
  conflicts: Array<{ official: string; former: string }>;
  /** Filas que el catálogo no reconoce y no están retiradas. */
  unknown: string[];
}

export function planCareerSync(input: {
  existing: readonly ExistingCareer[];
  catalog: readonly CatalogCareer[];
  retired?: readonly string[];
}): CareerSyncPlan {
  const byName = new Map(input.existing.map((c) => [c.name, c]));
  const claimed = new Set<string>();
  const plan: CareerSyncPlan = {
    renames: [],
    creates: [],
    retires: [],
    blockedRetires: [],
    conflicts: [],
    unknown: [],
  };

  const officialNames = new Set(input.catalog.map((c) => c.name));
  if (officialNames.size !== input.catalog.length) {
    throw new Error('El catálogo repite un nombre de carrera dentro de la misma área.');
  }

  for (const career of input.catalog) {
    const formers = (career.formerNames ?? []).filter((f) => byName.has(f));

    if (byName.has(career.name)) {
      claimed.add(career.name);
      for (const former of formers) {
        plan.conflicts.push({ official: career.name, former });
        claimed.add(former);
      }
      continue;
    }

    if (formers.length > 0) {
      const [first, ...rest] = formers;
      const row = byName.get(first)!;
      plan.renames.push({ id: row.id, from: first, to: career.name });
      claimed.add(first);
      for (const former of rest) {
        plan.conflicts.push({ official: career.name, former });
        claimed.add(former);
      }
      continue;
    }

    plan.creates.push(career.name);
  }

  for (const name of input.retired ?? []) {
    const row = byName.get(name);
    if (!row || claimed.has(name)) continue;
    claimed.add(name);
    if (row.targetedBy > 0) {
      plan.blockedRetires.push({ id: row.id, name, targetedBy: row.targetedBy });
    } else {
      plan.retires.push({ id: row.id, name });
    }
  }

  for (const row of input.existing) {
    if (!claimed.has(row.name)) plan.unknown.push(row.name);
  }

  return plan;
}

/** ¿El plan cambia algo en la base? */
export function planHasChanges(plan: CareerSyncPlan): boolean {
  return plan.renames.length + plan.creates.length + plan.retires.length > 0;
}
