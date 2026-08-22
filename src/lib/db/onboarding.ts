import type { Area, Career, Exam, Institution, Level } from '@prisma/client';
import { isExamOptionEnabled } from '@/lib/onboarding/feature-flags';
import { OnboardingStep } from '@/lib/onboarding/steps';
import { trackServerEvent } from '@/lib/analytics/server';
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

/** Paso 2: áreas/ramas del examen elegido, en el orden sembrado. */
export async function loadAreasForExam(examId: string): Promise<Area[]> {
  return prisma.area.findMany({ where: { examId }, orderBy: { position: 'asc' } });
}

export type AreaWithExam = Area & { exam: Exam };

/** Valida que el área (llega por ?area= en la URL) pertenezca al examen ya guardado del perfil. */
export async function loadAreaWithExam(areaId: string): Promise<AreaWithExam | null> {
  return prisma.area.findUnique({ where: { id: areaId }, include: { exam: true } });
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
