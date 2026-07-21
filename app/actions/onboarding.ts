'use server';

import { redirect } from 'next/navigation';
import * as onboardingDb from '@/lib/db/onboarding';
import * as sessionsDb from '@/lib/db/sessions';
import { requireUser } from '@/lib/auth/guards';
import { isExamOptionEnabled } from '@/lib/onboarding/feature-flags';
import { OnboardingStep } from '@/lib/onboarding/steps';

/**
 * Server Actions del asistente de onboarding (F5). Cada una revalida contra
 * la DB (nunca confía en lo que el formulario dice sobre el estado del
 * perfil) y redirige — no hay estado de error visible porque las opciones
 * que el usuario puede enviar salen siempre de listas ya filtradas en el
 * servidor; una selección inválida solo puede venir de manipular el request,
 * y ahí el comportamiento seguro es simplemente re-mostrar el paso correcto.
 */

export async function selectExamAction(formData: FormData): Promise<void> {
  const { profile } = await requireUser();
  const examId = String(formData.get('examId') ?? '');

  const exam = examId ? await onboardingDb.loadExamForOnboarding(examId) : null;
  const valid =
    exam && exam.isActive && isExamOptionEnabled(exam.level.institution.code, exam.level.type);

  if (valid) {
    await onboardingDb.saveExamSelection(profile.id, exam.id);
  }

  redirect('/onboarding');
}

/**
 * Paso 2: el área elegida no se persiste (ver src/lib/onboarding/steps.ts) —
 * solo redirige a /onboarding?area=<id>. Es un Server Action (no un <Link>
 * directo) a propósito: una navegación por Link entre el mismo pathname
 * cambiando solo el searchParam puede servir el RSC cacheado del Paso 2
 * (router cache del cliente para rutas dinámicas); el redirect() dentro de
 * un Server Action sí invalida ese cache de forma confiable.
 */
export async function selectAreaAction(formData: FormData): Promise<void> {
  const { profile } = await requireUser();
  const areaId = String(formData.get('areaId') ?? '');

  if (profile.onboardingStep === OnboardingStep.AREA_CAREER && profile.targetExamId && areaId) {
    const area = await onboardingDb.loadAreaWithExam(areaId);
    if (area && area.examId === profile.targetExamId) {
      redirect(`/onboarding?area=${area.id}`);
    }
  }

  redirect('/onboarding');
}

export async function selectCareerAction(formData: FormData): Promise<void> {
  const { profile } = await requireUser();
  const careerId = String(formData.get('careerId') ?? '');

  if (profile.onboardingStep >= OnboardingStep.AREA_CAREER && profile.targetExamId) {
    const career = careerId ? await onboardingDb.loadCareerWithArea(careerId) : null;
    if (career && career.area.examId === profile.targetExamId) {
      await onboardingDb.saveCareerSelection(profile.id, career.id);
    }
  }

  redirect('/onboarding');
}

export async function startDiagnosticAction(): Promise<void> {
  const { profile } = await requireUser();

  if (profile.onboardingStep >= OnboardingStep.DIAGNOSTIC_INTRO && profile.targetExamId) {
    await onboardingDb.completeOnboardingWizard(profile.id);
    await sessionsDb.startSession({
      userProfileId: profile.id,
      examId: profile.targetExamId,
      mode: 'DIAGNOSTIC',
    });
    redirect('/diagnostico');
  }

  redirect('/onboarding');
}

export async function postponeDiagnosticAction(): Promise<void> {
  const { profile } = await requireUser();

  if (profile.onboardingStep >= OnboardingStep.DIAGNOSTIC_INTRO) {
    await onboardingDb.completeOnboardingWizard(profile.id);
    redirect('/app');
  }

  redirect('/onboarding');
}
