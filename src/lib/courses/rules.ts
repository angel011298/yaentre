import { COURSE_LIMITS } from './media';
import { validateCoursePrice } from './commission';

/**
 * G103 — reglas de los cursos pregrabados. PURO.
 *
 *  - Validaciones antes de enviar a revisión (spec §2.6, paso 5).
 *  - Progreso del alumno (spec §2.7 «reanudar donde se quedó»).
 *  - Slug a partir del título.
 */

export interface CourseForSubmission {
  title: string;
  description: string;
  shortDescription: string;
  thumbnailPath: string | null;
  priceCents: number;
  isFree: boolean;
  modules: Array<{
    title: string;
    lessons: Array<{
      type: 'VIDEO' | 'TEXT' | 'QUIZ' | 'RESOURCE';
      title: string;
      videoPath: string | null;
      videoDurationSeconds: number | null;
      content: string | null;
      resourcePath: string | null;
      isFreePreview: boolean;
    }>;
  }>;
}

export function validateCourseForSubmission(course: CourseForSubmission): string[] {
  const errors: string[] = [];
  if (course.title.trim().length < 5) errors.push('El curso necesita un título.');
  if (course.description.trim().length < 40) errors.push('Escribe una descripción de al menos 40 caracteres.');
  if (course.shortDescription.trim().length < 10) errors.push('Escribe una descripción corta para la tarjeta del catálogo.');
  if (!course.thumbnailPath) errors.push('Sube una imagen de portada.');
  const price = validateCoursePrice(course.priceCents, course.isFree);
  if (!price.valid) errors.push(price.error ?? 'Revisa el precio.');

  const lessons = course.modules.flatMap((m) => m.lessons);
  if (course.modules.length === 0 || !course.modules.some((m) => m.lessons.length > 0)) {
    errors.push('Agrega al menos un módulo con una lección.');
  }
  const videoSeconds = lessons
    .filter((l) => l.type === 'VIDEO' && l.videoPath)
    .reduce((s, l) => s + (l.videoDurationSeconds ?? 0), 0);
  if (videoSeconds < COURSE_LIMITS.MIN_TOTAL_VIDEO_SECONDS) errors.push('El curso necesita al menos 5 minutos de video en total.');
  if (lessons.filter((l) => l.isFreePreview).length > COURSE_LIMITS.MAX_FREE_PREVIEWS) {
    errors.push('Máximo 3 lecciones de muestra gratuita.');
  }
  for (const l of lessons) {
    if (l.type === 'VIDEO' && !l.videoPath) errors.push(`La lección «${l.title}» no tiene video.`);
    if (l.type === 'TEXT' && !l.content?.trim()) errors.push(`La lección «${l.title}» no tiene texto.`);
    if (l.type === 'RESOURCE' && !l.resourcePath) errors.push(`La lección «${l.title}» no tiene archivo.`);
  }
  return [...new Set(errors)];
}

/** Una lección de video se da por vista al llegar al 90 %. */
export const VIDEO_COMPLETION_RATIO = 0.9;

export function isVideoCompleted(positionSeconds: number, durationSeconds: number | null): boolean {
  if (!durationSeconds || durationSeconds <= 0) return false;
  return positionSeconds >= durationSeconds * VIDEO_COMPLETION_RATIO;
}

export function progressPercent(completedLessons: number, totalLessons: number): number {
  if (totalLessons <= 0) return 0;
  return Math.min(100, Math.round((completedLessons / totalLessons) * 1000) / 10);
}

/** Slug estable y legible: «Álgebra lineal desde cero» → «algebra-lineal-desde-cero». */
export function slugify(title: string): string {
  return (
    title
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/ñ/g, 'n')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60)
      .replace(/-+$/g, '') || 'curso'
  );
}

/** Promedio de calificaciones con un decimal. */
export function averageRating(ratings: number[]): number {
  if (ratings.length === 0) return 0;
  return Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10;
}

export const COURSE_CATEGORY_LABELS = {
  REGULARIZACION: 'Regularización',
  IDIOMAS: 'Idiomas',
  HABILIDADES: 'Habilidades',
  TECNOLOGIA: 'Tecnología',
  OTRO: 'Otros',
} as const;

export const COURSE_LEVEL_LABELS = { BASICO: 'Básico', INTERMEDIO: 'Intermedio', AVANZADO: 'Avanzado' } as const;

/**
 * Casilla del art. 56 LFPC en la compra de un curso (acceso inmediato).
 * TODO-CLO: versión específica para cursos; mientras tanto se muestra el
 * texto del checkout de planes (CONTEXTO §3.4) y, por la versión `TODO-CLO`,
 * en producción la compra se rechaza (`legal-gate.ts`).
 */
export const COURSE_IMMEDIATE_ACCESS_CONSENT = {
  version: 'TODO-CLO-cursos-art56',
  text: 'Entiendo que mi acceso a este curso en YaEntre se activa de inmediato al confirmarse el pago, y solicito expresamente que así sea. Acepto que, por tratarse de un servicio que se presta de inmediato, no aplica el derecho de revocación del artículo 56 de la Ley Federal de Protección al Consumidor.',
} as const;

/**
 * Condiciones de contenido que el profesor acepta al crear su primer curso
 * (propiedad del contenido, prohibido usar el banco de reactivos de YaEntre,
 * reportes y moderación). TODO-CLO.
 */
export const COURSE_TEACHER_TERMS_VERSION = 'TODO-CLO-condiciones-contenido-cursos';
