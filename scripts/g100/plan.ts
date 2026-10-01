/**
 * scripts/g100/plan.ts — lógica PURA del reemplazo de reactivos anclados a CENEVAL (G100).
 *
 * Aquí vive la regla de oro, separada de la base para poder enumerarla en un test:
 *
 *   NUNCA se despublica un reactivo anclado sin que ya exista, PUBLICADO y
 *   LIMPIO, un reemplazo que lo cubra — y cada reemplazo cubre UN SOLO anclado.
 *
 * Quien despublica (`unpublish-anchored.ts`) solo ejecuta el plan que este módulo
 * devuelve; si el plan no alcanza para todos, el resto se queda PUBLICADO y se
 * reporta como pendiente. Pendiente, nunca roto.
 */

export interface QuestionRef {
  id: string;
  topicId: string;
  format: string;
  difficulty: string;
}

export interface Pair {
  anchoredId: string;
  replacementId: string;
  topicId: string;
}

export interface Plan {
  pairs: Pair[];
  /** Anclados SIN reemplazo disponible: se quedan publicados. */
  pending: QuestionRef[];
}

const byStableKey = (a: QuestionRef, b: QuestionRef) =>
  a.format.localeCompare(b.format) || a.difficulty.localeCompare(b.difficulty) || a.id.localeCompare(b.id);

/**
 * Empareja cada anclado con UN reemplazo DEL MISMO TEMA (el reemplazo sirve al
 * mismo pool y a las mismas áreas que el original). Prefiere mismo formato y
 * dificultad, luego mismo formato, luego cualquiera del tema; un reemplazo se
 * usa una sola vez. Determinista: mismo insumo, mismo plan.
 */
export function planReplacements(anchored: QuestionRef[], replacements: QuestionRef[]): Plan {
  const free = new Map<string, QuestionRef[]>();
  for (const r of [...replacements].sort(byStableKey)) {
    (free.get(r.topicId) ?? free.set(r.topicId, []).get(r.topicId)!).push(r);
  }
  const pairs: Pair[] = [];
  const pending: QuestionRef[] = [];
  for (const a of [...anchored].sort(byStableKey)) {
    const candidates = free.get(a.topicId) ?? [];
    const idx =
      candidates.findIndex((r) => r.format === a.format && r.difficulty === a.difficulty) >= 0
        ? candidates.findIndex((r) => r.format === a.format && r.difficulty === a.difficulty)
        : candidates.findIndex((r) => r.format === a.format) >= 0
          ? candidates.findIndex((r) => r.format === a.format)
          : candidates.length > 0
            ? 0
            : -1;
    if (idx < 0) {
      pending.push(a);
      continue;
    }
    const [rep] = candidates.splice(idx, 1);
    pairs.push({ anchoredId: a.id, replacementId: rep.id, topicId: a.topicId });
  }
  return { pairs, pending };
}

export const MIN_POOL_COVERAGE = 0.9;

export interface PoolCoverage {
  pool: string;
  /** Tamaño del pool ANTES de este reemplazo: servibles hoy menos los reemplazos ya publicados. */
  baseline: number;
  /** Servibles tras despublicar los anclados emparejados. */
  after: number;
  ratio: number;
  ok: boolean;
}

/**
 * Cobertura del pool tras despublicar (instrucciones CLO §5.5: «el pool mantiene
 * cobertura ≥ 90 %»). Se mide contra lo que el pool OFRECÍA antes del reemplazo
 * (`servibles − reemplazos`), no contra el total que ya incluye a los reemplazos:
 * lo segundo castigaría un reemplazo perfecto uno-a-uno (68 → 40 = 59 %) cuando
 * el pool vuelve exactamente a su tamaño original (40 → 40 = 100 %).
 */
export function poolCoverage(
  servableByPool: Map<string, number>,
  unpublishedByPool: Map<string, number>,
  replacementsByPool: Map<string, number>,
  min: number = MIN_POOL_COVERAGE,
): PoolCoverage[] {
  return [...servableByPool.entries()].map(([pool, servable]) => {
    const baseline = servable - (replacementsByPool.get(pool) ?? 0);
    const after = servable - (unpublishedByPool.get(pool) ?? 0);
    const ratio = baseline <= 0 ? 1 : after / baseline;
    return { pool, baseline, after, ratio, ok: ratio >= min };
  });
}
