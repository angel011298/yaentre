import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { requireUser } from '@/lib/auth/guards';
import * as onboardingDb from '@/lib/db/onboarding';
import { OnboardingStep, isOnboardingComplete } from '@/lib/onboarding/steps';
import { StepProgress } from '@/components/ui/StepProgress';
import { StepTransition } from '@/components/ui/StepTransition';
import { AreaStep } from './_components/AreaStep';
import { CareerStep } from './_components/CareerStep';
import { DiagnosticIntroStep } from './_components/DiagnosticIntroStep';
import { ExamStep } from './_components/ExamStep';

const TOTAL_STEPS = 4;

// El Paso 2→3 navega por Link cambiando solo `?area=` en la misma ruta; sin
// esto, el router cache del cliente puede servir el RSC ya prefetcheado del
// Paso 2 en vez de re-ejecutar el Server Component con el nuevo searchParam
// (visto en pruebas manuales: clic en un área se quedaba en la lista de
// áreas hasta refrescar). Forzar dynamic + no-store elimina esa staleness.
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

/**
 * Router de los 4 pasos del onboarding (F5). Un único Server Component:
 * decide qué paso renderizar leyendo `profile.onboardingStep` (progreso
 * confirmado) y `searchParams.area` (elección efímera del Paso 2, ver
 * src/lib/onboarding/steps.ts). Vuelve a pedir datos a la DB en cada carga —
 * es una página de bajo tráfico por usuario (se visita una vez), así que se
 * prioriza simplicidad y corrección sobre cacheo.
 */
export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ area?: string }>;
}) {
  const { profile } = await requireUser();

  if (isOnboardingComplete(profile.onboardingStep)) {
    redirect('/app');
  }

  const { area: areaId } = await searchParams;

  // Paso 1: elegir examen.
  if (profile.onboardingStep === OnboardingStep.EXAM || !profile.targetExamId) {
    const options = await onboardingDb.loadEnabledExamOptions();
    return (
      <Wizard current={1}>
        <ExamStep options={options} />
      </Wizard>
    );
  }

  // Pasos 2 y 3: área (efímera, por URL) y carrera meta.
  if (profile.onboardingStep === OnboardingStep.AREA_CAREER) {
    if (areaId) {
      const area = await onboardingDb.loadAreaWithExam(areaId);
      if (area && area.examId === profile.targetExamId) {
        const careers = await onboardingDb.loadCareersForArea(area.id);
        return (
          <Wizard current={3}>
            <CareerStep area={area} careers={careers} />
          </Wizard>
        );
      }
      // ?area= manipulado o de otro examen: se ignora y se cae al Paso 2.
    }

    const areas = await onboardingDb.loadAreasForExam(profile.targetExamId);
    return (
      <Wizard current={2}>
        <AreaStep areas={areas} />
      </Wizard>
    );
  }

  // Paso 4: Tino + explicación del diagnóstico.
  const career = profile.targetCareerId
    ? await onboardingDb.loadTargetCareer(profile.targetCareerId)
    : null;

  return (
    <Wizard current={4}>
      <DiagnosticIntroStep careerName={career?.name ?? null} />
    </Wizard>
  );
}

function Wizard({ current, children }: { current: number; children: ReactNode }) {
  return (
    <div className="space-y-6">
      <StepProgress current={current} total={TOTAL_STEPS} />
      <StepTransition stepKey={current}>{children}</StepTransition>
    </div>
  );
}
