import { readFileSync } from 'node:fs';

/**
 * Tipos y validación de los artefactos de extracción de guías oficiales (CC-09).
 *
 * Un artefacto es el resultado de leer UNA guía oficial con visión (render del
 * PDF a imagen → lectura fiel) y transcribir con certeza: taxonomía (temario,
 * pesos derivados del conteo real), y reactivos del examen muestra emparejados
 * con su clave oficial. La extracción es un paso offline humano+Claude; este
 * módulo solo consume el JSON resultante. NINGÚN dato se infiere aquí.
 */

export interface SourceMeta {
  externalRef: string;
  name: string;
  institution: string;
  coInstitution?: string;
  type: string;
  year: number;
  /**
   * URL pública oficial directa (https://..., embebible/enlazable — ver
   * CC-25) si se confirmó una, o un path local (docs/guias/..., no
   * servible desde la app en producción) mientras no se confirme una.
   */
  fileRef?: string;
  license: string;
}

export interface ExamMeta {
  institutionCode: string;
  level: 'MEDIA_SUPERIOR' | 'SUPERIOR';
  levelName: string;
  year: number;
  name: string;
  durationMins: number;
  totalQuestions: number;
  examDate?: string;
  note?: string;
  /**
   * true cuando el artefacto solo cubre UNA área/división de un examen que
   * tiene varias fuentes distintas (p. ej. UAM: 4 guías, una por división,
   * todas apuntando al mismo Exam). En ese caso no se exige que la suma de
   * questionWeight de este artefacto cierre con exam.totalQuestions — esa
   * suma solo es verificable cuando UN artefacto trae el examen completo
   * (como ECOEMS, una sola guía con las 10 asignaturas).
   */
  partialCoverage?: boolean;
}

export interface SubjectSpec {
  name: string;
  questionWeight: number;
  iconEmoji?: string;
  position: number;
}

export interface AreaSpec {
  code: string;
  name: string;
  colorHex: string;
  iconEmoji?: string;
  position: number;
  subjects?: SubjectSpec[];
  careers?: string[];
}

export interface TaxonomyArtifact {
  source: SourceMeta;
  exam: ExamMeta;
  areas: AreaSpec[];
  topics?: Record<string, string[]>;
  /**
   * Presente cuando questionWeight es un PLACEHOLDER (no derivado de un
   * conteo real de examen muestra, como sí lo es en ECOEMS). El CLI de
   * ingesta lo usa para no reportar "pesos oficiales" cuando en realidad
   * son marcador de posición sin verificar.
   */
  weightsNote?: string;
}

export interface OptionSpec {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface PassageSpec {
  ref: string;
  title?: string;
  sourceRef?: string;
  content: string;
}

export interface QuestionSpec {
  ref: string;
  subject: string;
  topicName?: string;
  temaCode?: string;
  areaCode?: string;
  format: string;
  stem: string;
  options: OptionSpec[];
  passageRef?: string;
  imageNote?: string;
}

export interface QuestionsArtifact {
  _meta: { sourceExternalRef: string; usage: string; source: string; extraction?: string };
  passages?: PassageSpec[];
  questions: QuestionSpec[];
}

const VALID_FORMATS = new Set([
  'MULTIPLE_CHOICE',
  'READING_COMPREHENSION',
  'IMAGE_OPTIONS',
  'CHART_TABLE',
  'MATCHING',
]);

export function loadJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf-8')) as T;
}

/** Valida la taxonomía: pesos > 0, suma coherente con totalQuestions (si hay subjects). */
export function validateTaxonomy(art: TaxonomyArtifact): string[] {
  const errors: string[] = [];
  if (!art.source?.externalRef) errors.push('source.externalRef requerido');
  if (!art.exam?.totalQuestions) errors.push('exam.totalQuestions requerido');

  let weightSum = 0;
  let hasSubjects = false;
  for (const area of art.areas) {
    if (!area.code) errors.push('area.code requerido');
    for (const s of area.subjects ?? []) {
      hasSubjects = true;
      if (s.questionWeight <= 0) {
        errors.push(`Materia "${s.name}": questionWeight debe ser > 0`);
      }
      weightSum += s.questionWeight;
    }
  }

  // Si el artefacto declara pesos por materia Y cubre el examen completo
  // (no partialCoverage), deben sumar el total oficial. Con partialCoverage
  // (p. ej. una guía por división de un examen con varias fuentes) esta
  // suma no es verificable desde un solo artefacto.
  if (hasSubjects && !art.exam.partialCoverage && weightSum !== art.exam.totalQuestions) {
    errors.push(
      `Suma de questionWeight (${weightSum}) != exam.totalQuestions (${art.exam.totalQuestions})`,
    );
  }
  return errors;
}

/** Valida reactivos oficiales: 4 opciones, exactamente 1 correcta, formato conocido. */
export function validateQuestions(art: QuestionsArtifact): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();

  for (const q of art.questions) {
    if (!q.ref) {
      errors.push('Reactivo sin ref');
      continue;
    }
    if (seen.has(q.ref)) errors.push(`ref duplicado: ${q.ref}`);
    seen.add(q.ref);

    if (!VALID_FORMATS.has(q.format)) {
      errors.push(`${q.ref}: formato desconocido "${q.format}"`);
    }
    if (q.options.length !== 4) {
      errors.push(`${q.ref}: se esperan 4 opciones, hay ${q.options.length}`);
    }
    const correct = q.options.filter((o) => o.isCorrect);
    if (correct.length !== 1) {
      errors.push(`${q.ref}: debe haber exactamente 1 opción correcta, hay ${correct.length}`);
    }
    const ids = q.options.map((o) => o.id);
    if (new Set(ids).size !== ids.length) {
      errors.push(`${q.ref}: ids de opción duplicados`);
    }
    if (q.format === 'READING_COMPREHENSION' && !q.passageRef) {
      errors.push(`${q.ref}: READING_COMPREHENSION requiere passageRef`);
    }
    if (q.passageRef && !(art.passages ?? []).some((p) => p.ref === q.passageRef)) {
      errors.push(`${q.ref}: passageRef "${q.passageRef}" no existe en passages[]`);
    }
  }
  return errors;
}
