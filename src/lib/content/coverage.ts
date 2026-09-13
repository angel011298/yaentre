import { apportionByWeight, type SubjectWeight } from '@/lib/diagnostic/distribution';

/**
 * G74 — GUARDA DE COBERTURA DE CONTENIDO. Módulo PURO y determinista: sin
 * Prisma, sin red, sin IA. La capa DB (`@/lib/db/area-coverage`) le pasa el
 * censo real de reactivos servibles; este módulo decide si un área se puede
 * ofrecer y con qué aviso.
 *
 * ── El problema que resuelve ────────────────────────────────────────────────
 *
 * `docs/VEREDICTO_LANZAMIENTO.md §12 riesgo 4`: el onboarding ofrecía la rama
 * IPN «Ciencias Sociales y Administrativas» exactamente igual que FISMAT o
 * MEDBIO, teniendo 4 de sus 7 materias en CERO reactivos. Un aspirante real
 * podía elegirla, llegar al diagnóstico y recibir un examen recortado al 32%
 * de su temario, con un Entrómetro construido casi entero sobre el default
 * pesimista del predictor — todo ello sin un solo aviso. El motor no revienta
 * (`capToAvailability` recorta con gracia), y ese es justo el problema: el
 * producto se ve sano mientras entrega algo que no sirve. Es la misma firma
 * de los fallos silenciosos de G73b, ahora del lado del contenido.
 *
 * ── La unidad de medida: PESO, no número de reactivos ───────────────────────
 *
 * `Subject.questionWeight` es, por definición del schema, cuántos reactivos de
 * esa materia trae el examen REAL. Así que la fracción del peso del área que
 * sí tiene contenido es, literalmente, «qué parte del examen que vas a
 * presentar podemos prepararte». Contar reactivos crudos mentiría en las dos
 * direcciones: 300 reactivos repartidos en 2 de 7 materias no preparan a
 * nadie, y 35 reactivos en una materia de peso 3 sí la cubren de sobra.
 *
 * ── Cuándo una materia cuenta como cubierta ─────────────────────────────────
 *
 * No basta con «≥1 reactivo». El umbral por materia es EXACTAMENTE el número
 * de reactivos que el diagnóstico le pediría a esa materia — se calcula con la
 * misma función que el diagnóstico usa de verdad (`apportionByWeight`, F7), no
 * con una constante paralela que se desincronizaría. Si una materia no puede
 * llenar ni su cuota del diagnóstico inicial, el alumno no queda MEDIDO en
 * ella: entra al predictor con 0 intentos y cae al default pesimista.
 *
 * Reusar la función real es deliberado: si mañana el diagnóstico cambia de 30
 * a 40 reactivos, o el seed cambia un peso, el umbral se mueve solo.
 *
 * ── Los tres estados y por qué el corte está en 70% ─────────────────────────
 *
 *  · READY        — 100% del peso cubierto. Se ofrece sin aviso.
 *  · PARTIAL      — ≥70% del peso cubierto. Se ofrece, es elegible, y se dice
 *                   por su nombre qué materias faltan. Es un producto útil con
 *                   un hueco conocido, no un producto roto.
 *  · COMING_SOON  — <70% del peso cubierto. NO es elegible.
 *
 * El 70% no es un número redondo elegido al azar: es el punto donde la promesa
 * central del producto deja de sostenerse. El Entrómetro predice aciertos
 * sumando el desempeño medido de cada materia ponderado por su peso; una
 * materia sin contenido nunca se mide y entra con el default pesimista. Con
 * más del 30% del peso sin cubrir, la MAYORÍA ponderada de la predicción deja
 * de ser medición y pasa a ser relleno — y una predicción de relleno es peor
 * que ninguna, porque el alumno la va a creer. Por debajo de ese corte
 * tampoco hay diagnóstico proporcional posible: `capToAvailability` reparte lo
 * que sobra entre las materias que sí tienen pool, así que el alumno recibe 30
 * reactivos de un tercio de su temario y una «ruta personalizada» que apunta a
 * material que no existe.
 *
 * ── Por qué MARCAR y no ESCONDER ────────────────────────────────────────────
 *
 * Un aspirante de IPN SOCADM que no ve su rama en la lista concluye que
 * YaEntre no cubre su examen y se va para siempre; uno que la ve marcada como
 * «Próximamente», con el motivo dicho de frente y un «te avisamos», sigue
 * siendo un usuario. Esconderla además hace el hueco invisible para nosotros:
 * nadie puede reportar lo que no aparece. Decirlo antes cuesta una frase; que
 * lo descubra en su diagnóstico cuesta la confianza.
 *
 * ── Dinámico por construcción ───────────────────────────────────────────────
 *
 * Aquí NO hay ninguna lista de áreas, materias ni instituciones. Todo sale del
 * censo que la capa DB calcula contra la base. Cuando un lote de contenido
 * llene Civismo/Derecho, el área cambia de estado sola, sin tocar código —
 * exactamente la lección de G73: las listas escritas a mano se desincronizan
 * de la realidad y nadie se entera.
 */

/** Fracción mínima del peso del examen que un área debe cubrir para ofrecerse. */
export const MIN_COVERED_WEIGHT_RATIO = 0.7;

/**
 * Tamaño del diagnóstico con el que se calcula el umbral por materia. Lo pasa
 * la capa DB desde `DIAGNOSTIC_QUESTION_COUNT` (src/lib/db/diagnostic.ts); el
 * default existe solo para que este módulo siga siendo puro y usable en
 * pruebas sin arrastrar Prisma.
 */
export const DEFAULT_DIAGNOSTIC_TOTAL = 30;

export type AreaCoverageStatus = 'READY' | 'PARTIAL' | 'COMING_SOON';

/** Censo de una materia: su peso en el examen y su pool servible EFECTIVO. */
export interface SubjectCoverageInput extends SubjectWeight {
  subjectName: string;
  /**
   * Reactivos verificados y SERVABLE que un alumno de esta área puede recibir
   * en esta materia — incluidos los del pool compartido de G26
   * (`Subject.sharedContentKey`), porque para el alumno son la misma materia.
   */
  servable: number;
}

export interface SubjectCoverage extends SubjectCoverageInput {
  /** Reactivos que el diagnóstico le pediría a esta materia (F7, misma función). */
  required: number;
  covered: boolean;
}

export interface AreaCoverage {
  status: AreaCoverageStatus;
  /** Peso del examen con contenido suficiente / peso total. 0 si el área no tiene materias. */
  coveredRatio: number;
  coveredWeight: number;
  totalWeight: number;
  subjects: SubjectCoverage[];
  /** Nombres de las materias sin contenido suficiente, de mayor a menor peso. */
  pendingSubjectNames: string[];
}

/** ¿Se puede elegir esta área? Única fuente de verdad para UI y Server Action. */
export function isAreaSelectable(status: AreaCoverageStatus): boolean {
  return status !== 'COMING_SOON';
}

/** Fila del censo: una materia con sus reactivos servibles PROPIOS. */
export interface SubjectCensusRow {
  subjectId: string;
  sharedContentKey: string | null;
  ownServable: number;
}

/**
 * Pool EFECTIVO por materia: el suyo, o la SUMA de su grupo de contenido
 * compartido (G26). Vive en el módulo puro —y no junto a la consulta— porque
 * es la pieza que más fácil se rompe en silencio: sin ella, tres áreas de la
 * UNAM que funcionan perfectamente se marcarían como rotas (su fila `Subject`
 * de Español tiene 0 reactivos propios; todo su contenido está en la del Área
 * 1), y el error se vería como «el producto es más honesto», no como un bug.
 *
 * Quien llama debe pasar SÓLO filas del mismo examen: `sharedContentKey` nunca
 * cruza instituciones (regla de G26), y aquí no hay forma de comprobarlo.
 */
export function resolveEffectiveServable(
  rows: readonly SubjectCensusRow[]
): Map<string, number> {
  const poolByKey = new Map<string, number>();
  for (const r of rows) {
    if (r.sharedContentKey === null) continue;
    poolByKey.set(r.sharedContentKey, (poolByKey.get(r.sharedContentKey) ?? 0) + r.ownServable);
  }
  return new Map(
    rows.map((r) => [
      r.subjectId,
      r.sharedContentKey === null ? r.ownServable : (poolByKey.get(r.sharedContentKey) ?? 0),
    ])
  );
}

/**
 * Evalúa la cobertura de UN área a partir del censo de sus materias.
 *
 * Un área sin materias sembradas (taxonomía incompleta) es `COMING_SOON`: no
 * se puede prometer un diagnóstico de un temario que todavía no existe.
 */
export function evaluateAreaCoverage(
  subjects: readonly SubjectCoverageInput[],
  diagnosticTotal: number = DEFAULT_DIAGNOSTIC_TOTAL
): AreaCoverage {
  const totalWeight = subjects.reduce((sum, s) => sum + s.weight, 0);

  if (subjects.length === 0 || totalWeight <= 0) {
    return {
      status: 'COMING_SOON',
      coveredRatio: 0,
      coveredWeight: 0,
      totalWeight,
      subjects: [],
      pendingSubjectNames: [],
    };
  }

  // El umbral por materia ES el reparto real del diagnóstico (F7). Se calcula
  // sobre TODAS las materias del área, tengan contenido o no: lo que se
  // pregunta es «¿alcanza para lo que el diagnóstico completo le pediría?», no
  // «¿alcanza para lo que le tocaría ahora que las demás están vacías?» — si
  // no, un área con una sola materia poblada se declararía cubierta sola.
  const required = apportionByWeight(
    subjects.map((s) => ({ subjectId: s.subjectId, weight: s.weight })),
    diagnosticTotal
  );

  const rows: SubjectCoverage[] = subjects.map((s) => {
    const need = Math.max(1, required.get(s.subjectId) ?? 1);
    return { ...s, required: need, covered: s.servable >= need };
  });

  const coveredWeight = rows.reduce((sum, s) => sum + (s.covered ? s.weight : 0), 0);
  const coveredRatio = coveredWeight / totalWeight;

  const status: AreaCoverageStatus =
    coveredRatio >= 1
      ? 'READY'
      : coveredRatio >= MIN_COVERED_WEIGHT_RATIO
        ? 'PARTIAL'
        : 'COMING_SOON';

  return {
    status,
    coveredRatio,
    coveredWeight,
    totalWeight,
    subjects: rows,
    pendingSubjectNames: rows
      .filter((s) => !s.covered)
      .sort((a, b) => b.weight - a.weight || a.subjectName.localeCompare(b.subjectName))
      .map((s) => s.subjectName),
  };
}
