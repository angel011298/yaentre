/**
 * Reutilización de contenido entre áreas (G26). Módulo PURO y determinista:
 * sin Prisma, sin red, sin IA. La capa DB pasa la lista de materias; este
 * módulo resuelve los grupos de equivalencia.
 *
 * ── El problema ──
 * Varias áreas de un MISMO examen evalúan la misma materia con el mismo
 * temario oficial — solo cambia cuántos reactivos de esa materia trae el
 * examen (`Subject.questionWeight`), no QUÉ se evalúa:
 *   · UNAM: Español (Áreas 1-4), Inglés (1-3), Química (1-2).
 *   · IPN : Español/Lectura y Inglés (3 ramas), Química (2), Matemáticas (2 —
 *           el bloque de "conocimientos generales" es común a las ramas).
 * El seed las modela como filas `Subject` distintas, una por área. Sin este
 * módulo, un reactivo compuesto para "Español · Área 1" NO sirve a un alumno
 * de Área 3 aunque el temario sea idéntico — se re-generaría el mismo
 * contenido varias veces.
 *
 * ── La solución ──
 * `Subject.sharedContentKey`: filas `Subject` del mismo examen con la misma
 * clave (no nula) son equivalentes en contenido. Un reactivo verificado y
 * servible bajo cualquiera de ellas es elegible para un alumno que apunta a
 * cualquiera de esas áreas. La equivalencia se declara en el seed (taxonomía
 * = data, principio S2) y NUNCA cruza instituciones (guías, profundidad y
 * formato distintos — por eso la clave lleva el código de institución).
 *
 * ── Grano de la reutilización ──
 * Se comparte a nivel de MATERIA, no de tema. Los temarios por área del seed
 * usan nombres y granularidad distintos ("Ortografía" vs "Ortografía y
 * puntuación"), así que un match por nombre de tema sería frágil. Cada
 * reactivo conserva su `topicId` de origen; para el motor adaptativo eso
 * sigue resolviendo a la materia correcta vía `sharedContentKey`.
 */

/** Materia con su clave de contenido compartido (o null si no comparte). */
export interface SubjectSharing {
  subjectId: string;
  sharedContentKey: string | null;
}

/**
 * Dado el universo de materias de UN examen, devuelve para cada materia el
 * conjunto de ids de materias con contenido equivalente, incluyéndose a sí
 * misma. Una materia sin `sharedContentKey` mapea solo a `{ sí misma }`.
 *
 * Determinista: el orden de entrada no afecta el resultado (son conjuntos).
 */
export function resolveSharedSubjectGroups(
  subjects: readonly SubjectSharing[],
): Map<string, Set<string>> {
  const idsByKey = new Map<string, string[]>();
  for (const s of subjects) {
    if (s.sharedContentKey === null) continue;
    const arr = idsByKey.get(s.sharedContentKey);
    if (arr) arr.push(s.subjectId);
    else idsByKey.set(s.sharedContentKey, [s.subjectId]);
  }

  const groups = new Map<string, Set<string>>();
  for (const s of subjects) {
    const peers =
      s.sharedContentKey !== null ? idsByKey.get(s.sharedContentKey) : undefined;
    groups.set(s.subjectId, new Set(peers ?? [s.subjectId]));
  }
  return groups;
}

/**
 * Expande un conjunto de materias "propias" (las de un área) al conjunto
 * ampliado que incluye toda materia con contenido equivalente en el examen.
 * Es el pool de MATERIAS del que se leen los reactivos servibles de un área.
 */
export function expandToSharedSubjectIds(
  ownSubjectIds: Iterable<string>,
  groups: Map<string, Set<string>>,
): Set<string> {
  const out = new Set<string>();
  for (const id of ownSubjectIds) {
    const grp = groups.get(id);
    if (grp) for (const g of grp) out.add(g);
    else out.add(id);
  }
  return out;
}

/**
 * Clave canónica de una materia para AGRUPAR respuestas del alumno: su
 * `sharedContentKey` si la tiene, o su propio id. Dos respuestas a materias
 * hermanas (misma clave, distinta área) caen en la misma clave canónica → el
 * predictor las suma como una sola materia del área del alumno.
 */
export function canonicalSubjectKey(
  subjectId: string,
  keyBySubjectId: ReadonlyMap<string, string | null>,
): string {
  return keyBySubjectId.get(subjectId) ?? subjectId;
}

// ─────────────────────────── Agregación para el Entrómetro ───────────────────────────

/** Respuesta histórica ya puntuada, con la materia de origen del reactivo. */
export interface SubjectAnswer {
  subjectId: string;
  isCorrect: boolean;
}

/** Materia del área del alumno, con su peso y su clave de contenido compartido. */
export interface AreaSubject {
  subjectId: string;
  weight: number;
  sharedContentKey: string | null;
}

/** Aciertos e intentos acumulados de una materia del área del alumno. */
export interface AggregatedSubjectPerformance {
  subjectId: string;
  weight: number;
  correct: number;
  attempts: number;
}

/**
 * Agrupa las respuestas del alumno por la materia EQUIVALENTE de su área. Una
 * respuesta a una materia hermana (mismo `sharedContentKey`, otra área) cuenta
 * para la materia correspondiente del área del alumno; una respuesta a una
 * materia que no pertenece a su área (ni directamente ni por clave compartida)
 * se ignora — igual que hoy, esa materia entra al predictor con 0 intentos y
 * cae al default pesimista.
 *
 * Devuelve una fila por cada materia del área (en el mismo orden), lista para
 * `predictScore` de `@/lib/adaptive/predictor`.
 */
export function aggregateSharedSubjectPerformance(
  answers: readonly SubjectAnswer[],
  areaSubjects: readonly AreaSubject[],
  keyBySubjectId: ReadonlyMap<string, string | null>,
): AggregatedSubjectPerformance[] {
  // clave canónica del área → materia del área (para mapear la respuesta de
  // vuelta a "la materia del alumno").
  const areaByCanonical = new Map<string, AreaSubject>();
  for (const s of areaSubjects) {
    areaByCanonical.set(s.sharedContentKey ?? s.subjectId, s);
  }

  const agg = new Map<string, { correct: number; attempts: number }>();
  for (const a of answers) {
    const canonical = keyBySubjectId.get(a.subjectId) ?? a.subjectId;
    if (!areaByCanonical.has(canonical)) continue; // materia ajena al área
    const prev = agg.get(canonical) ?? { correct: 0, attempts: 0 };
    agg.set(canonical, {
      correct: prev.correct + (a.isCorrect ? 1 : 0),
      attempts: prev.attempts + 1,
    });
  }

  return areaSubjects.map((s) => {
    const a = agg.get(s.sharedContentKey ?? s.subjectId) ?? { correct: 0, attempts: 0 };
    return { subjectId: s.subjectId, weight: s.weight, correct: a.correct, attempts: a.attempts };
  });
}
