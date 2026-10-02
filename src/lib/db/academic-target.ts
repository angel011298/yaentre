import { prisma } from './prisma';
import { loadAreasForExam, loadEnabledExamOptions, loadSelectableAreaForExam } from './onboarding';
import { isExamOptionEnabled } from '@/lib/onboarding/feature-flags';
import { recomputeLearningProfile } from './adaptive';
import { reportSilentDegradation } from '@/lib/observability/report';

/**
 * G100 — cambiar la meta académica completa (universidad → área → carrera)
 * desde los ajustes. Hasta ahora solo se podía cambiar de CARRERA dentro de
 * la misma área (el antiguo `TargetCareerForm`), y el asistente de onboarding redirige
 * a /app a quien ya lo terminó: no había forma de corregir una elección.
 *
 * Mismas compuertas que el onboarding, por las mismas funciones (no copias):
 * el examen tiene que estar activo y habilitado por su feature flag
 * (`isExamOptionEnabled`) y el área tiene que pasar la guarda de cobertura de
 * contenido (G74, `loadSelectableAreaForExam`). La lista que se pinta sale
 * filtrada igual, pero la acción revalida: un id manipulado no entra.
 */
export interface AcademicTargetCatalog {
  exams: {
    id: string;
    label: string;
    areas: { id: string; name: string; careers: { id: string; name: string }[] }[];
  }[];
}

export async function loadAcademicTargetCatalog(): Promise<AcademicTargetCatalog> {
  const exams = await loadEnabledExamOptions();
  const withAreas = await Promise.all(
    exams.map(async (exam) => {
      const areas = (await loadAreasForExam(exam.id)).filter((a) => a.selectable);
      const careers = await prisma.career.findMany({
        where: { areaId: { in: areas.map((a) => a.area.id) } },
        orderBy: { name: 'asc' },
        select: { id: true, name: true, areaId: true },
      });
      return {
        id: exam.id,
        label: exam.label,
        areas: areas.map((a) => ({
          id: a.area.id,
          name: a.area.name,
          careers: careers.filter((c) => c.areaId === a.area.id).map(({ id, name }) => ({ id, name })),
        })),
      };
    })
  );
  // Un examen sin ninguna área ofrecible no es una opción real.
  return { exams: withAreas.filter((e) => e.areas.length > 0) };
}

export type ChangeAcademicTargetResult = 'OK' | 'INVALID_CAREER' | 'UNAVAILABLE';

export async function changeAcademicTarget(
  userProfileId: string,
  careerId: string
): Promise<ChangeAcademicTargetResult> {
  const career = await prisma.career.findUnique({
    where: { id: careerId },
    select: {
      id: true,
      areaId: true,
      area: {
        select: {
          examId: true,
          exam: { select: { isActive: true, level: { select: { type: true, institution: { select: { code: true } } } } } },
        },
      },
    },
  });
  if (!career) return 'INVALID_CAREER';

  const exam = career.area.exam;
  if (!exam.isActive || !isExamOptionEnabled(exam.level.institution.code, exam.level.type)) {
    return 'UNAVAILABLE';
  }
  if (!(await loadSelectableAreaForExam(career.areaId, career.area.examId))) return 'UNAVAILABLE';

  const current = await prisma.userProfile.findUnique({
    where: { id: userProfileId },
    select: { targetCareer: { select: { areaId: true } } },
  });
  const areaChanged = current?.targetCareer?.areaId !== career.areaId;

  await prisma.userProfile.update({
    where: { id: userProfileId },
    data: {
      targetExamId: career.area.examId,
      targetCareerId: career.id,
      // Las materias a reforzar son ids de la área anterior: no aplican a la nueva.
      ...(areaChanged ? { focusSubjectIds: [] } : {}),
    },
  });

  // Con otra área cambian las materias que pondera el Entrómetro. Si el
  // recálculo falla, el siguiente que dispare una sesión lo corrige; no se
  // revierte el cambio de meta por eso, pero tampoco se calla.
  if (areaChanged) {
    await recomputeLearningProfile(userProfileId).catch((err: unknown) =>
      reportSilentDegradation('adaptive_recompute', err, { userProfileId, reason: 'academic_target_change' })
    );
  }
  return 'OK';
}
