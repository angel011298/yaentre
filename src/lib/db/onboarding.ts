import type { Area, Career, Exam, Institution, Level } from '@prisma/client';
import { isExamOptionEnabled } from '@/lib/onboarding/feature-flags';
import { OnboardingStep } from '@/lib/onboarding/steps';
import { trackServerEvent } from '@/lib/analytics/server';
import { loadExamAreaCoverage } from './area-coverage';
import { isAreaSelectable, type AreaCoverage } from '@/lib/content/coverage';
import { prisma } from './prisma';

/**
 * Capa de acceso a datos del onboarding (F5). Cada mutación recibe siempre el
 * `userProfileId` del guard de autenticación (nunca del cliente), igual que
 * src/lib/db/sessions.ts.
 */

export interface ExamOption {
  id: string;
  institutionCode: Institution['code'];
  institutionName: string;
  levelType: Level['type'];
  label: string;
}

function examLabel(institutionCode: string, levelType: Level['type']): string {
  const levelLabel = levelType === 'SUPERIOR' ? 'Superior' : 'Media Superior';
  return `${institutionCode} ${levelLabel}`;
}

/** Paso 1: solo exámenes activos cuya institución/nivel tenga su feature flag encendida. */
export async function loadEnabledExamOptions(): Promise<ExamOption[]> {
  const exams = await prisma.exam.findMany({
    where: { isActive: true },
    include: { level: { include: { institution: true } } },
  });

  return exams
    .filter((exam) => isExamOptionEnabled(exam.level.institution.code, exam.level.type))
    .map((exam) => ({
      id: exam.id,
      institutionCode: exam.level.institution.code,
      institutionName: exam.level.institution.name,
      levelType: exam.level.type,
      label: examLabel(exam.level.institution.code, exam.level.type),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export type ExamWithContext = Exam & { level: Level & { institution: Institution } };

/** Recarga un examen con su institución/nivel para revalidar la flag en el Server Action (anti-manipulación). */
export async function loadExamForOnboarding(examId: string): Promise<ExamWithContext | null> {
  return prisma.exam.findUnique({
    where: { id: examId },
    include: { level: { include: { institution: true } } },
  });
}

/** Área del Paso 2 con su cobertura real de contenido (G74). */
export interface AreaOption {
  area: Area;
  coverage: AreaCoverage;
  /** `false` ⇒ se pinta como «Próximamente» y el Server Action la rechaza. */
  selectable: boolean;
}

/**
 * Paso 2: áreas/ramas del examen elegido, en el orden sembrado, cada una con
 * su cobertura REAL de contenido (G74).
 *
 * El orden no se altera por cobertura a propósito: la rama que un aspirante
 * busca es la suya, y enterrarla al final de la lista porque todavía no está
 * lista le hace más difícil enterarse de lo único que necesita saber.
 */
export async function loadAreasForExam(examId: string): Promise<AreaOption[]> {
  const [areas, coverageByArea] = await Promise.all([
    prisma.area.findMany({ where: { examId }, orderBy: { position: 'asc' } }),
    loadExamAreaCoverage(examId),
  ]);

  return areas.map((area) => {
    // Un área sin fila en el censo no tiene ni una materia sembrada: se trata
    // como sin cobertura, nunca como «lista por defecto».
    const coverage =
      coverageByArea.get(area.id) ??
      ({
        status: 'COMING_SOON' as const,
        coveredRatio: 0,
        coveredWeight: 0,
        totalWeight: 0,
        subjects: [],
        pendingSubjectNames: [],
      } satisfies AreaCoverage);
    return { area, coverage, selectable: isAreaSelectable(coverage.status) };
  });
}

export type AreaWithExam = Area & { exam: Exam };

/** Valida que el área (llega por ?area= en la URL) pertenezca al examen ya guardado del perfil. */
export async function loadAreaWithExam(areaId: string): Promise<AreaWithExam | null> {
  return prisma.area.findUnique({ where: { id: areaId }, include: { exam: true } });
}

/**
 * G74 — el área del `?area=` de la URL, validada contra el examen del perfil Y
 * contra su cobertura real de contenido. Devuelve `null` si el área no existe,
 * es de otro examen, o todavía no se puede ofrecer: esas tres son, para el
 * Paso 2, la misma respuesta («vuelve a la lista»), y unirlas aquí evita que
 * un call-site nuevo se acuerde de dos de las tres comprobaciones.
 */
export async function loadSelectableAreaForExam(
  areaId: string,
  examId: string
): Promise<{ area: AreaWithExam; coverage: AreaCoverage } | null> {
  const area = await loadAreaWithExam(areaId);
  if (!area || area.examId !== examId) return null;

  const coverageByArea = await loadExamAreaCoverage(examId);
  const coverage = coverageByArea.get(area.id);
  if (!coverage || !isAreaSelectable(coverage.status)) return null;

  return { area, coverage };
}

/**
 * G74 — el área para la lista de espera: sólo tiene sentido pedir aviso de un
 * área que de verdad NO se puede ofrecer todavía. Devuelve `null` si el área
 * no existe, no es del examen del perfil, o ya está disponible (en ese caso no
 * hay nada que esperar: el alumno puede elegirla ahora mismo).
 */
export async function loadAreaForWaitlist(
  areaId: string,
  examId: string
): Promise<{ areaName: string; areaCode: string; examLabel: string; coverage: AreaCoverage } | null> {
  const area = await prisma.area.findUnique({
    where: { id: areaId },
    include: { exam: { include: { level: { include: { institution: true } } } } },
  });
  if (!area || area.examId !== examId) return null;

  const coverageByArea = await loadExamAreaCoverage(examId);
  const coverage = coverageByArea.get(area.id);
  if (!coverage || isAreaSelectable(coverage.status)) return null;

  return {
    areaName: area.name,
    areaCode: area.code,
    examLabel: examLabel(area.exam.level.institution.code, area.exam.level.type),
    coverage,
  };
}

/** Paso 3: carreras del área elegida, con sus aciertos mínimos (ver formatEntrometroTarget). */
export async function loadCareersForArea(areaId: string): Promise<Career[]> {
  return prisma.career.findMany({ where: { areaId }, orderBy: { name: 'asc' } });
}

export type CareerWithArea = Career & { area: Area };

/** Valida que la carrera pertenezca al área/examen del perfil antes de guardarla. */
export async function loadCareerWithArea(careerId: string): Promise<CareerWithArea | null> {
  return prisma.career.findUnique({ where: { id: careerId }, include: { area: true } });
}

/** Paso 4: nombre de la carrera + su meta, para reforzar el mensaje de Tino. */
export async function loadTargetCareer(careerId: string): Promise<Career | null> {
  return prisma.career.findUnique({ where: { id: careerId } });
}

export async function saveExamSelection(userProfileId: string, examId: string): Promise<void> {
  await prisma.userProfile.update({
    where: { id: userProfileId },
    data: { targetExamId: examId, onboardingStep: OnboardingStep.AREA_CAREER },
  });
}

export async function saveCareerSelection(userProfileId: string, careerId: string): Promise<void> {
  await prisma.userProfile.update({
    where: { id: userProfileId },
    data: { targetCareerId: careerId, onboardingStep: OnboardingStep.DIAGNOSTIC_INTRO },
  });
}

/** Cierra el asistente (Paso 4 resuelto, sea "empezar" o "posponer" — ver docs/Flujo_App §5 edge cases). */
export async function completeOnboardingWizard(userProfileId: string): Promise<void> {
  await prisma.userProfile.update({
    where: { id: userProfileId },
    data: { onboardingStep: OnboardingStep.DONE },
  });
  await trackServerEvent(userProfileId, 'onboarding_completed', {});
}
