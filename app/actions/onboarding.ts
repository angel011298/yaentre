'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import * as onboardingDb from '@/lib/db/onboarding';
import { requireUser } from '@/lib/auth/guards';
import { isExamOptionEnabled } from '@/lib/onboarding/feature-flags';
import { OnboardingStep } from '@/lib/onboarding/steps';
import { trackServerEvent } from '@/lib/analytics/server';
import { consumeRateLimit } from '@/lib/rate-limit/store';
import type { ActionResult } from '@/lib/sessions/schemas';

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
    redirect('/onboarding');
  }

  // F22 (Flujo_App §4.2/§15.1 "deep link a institución desactivada"): un
  // examId manipulado (flag apagado, examen inactivo, o id inexistente) no
  // debe fallar en silencio — el alumno ve "Disponible próximamente" en vez
  // de un redirect vacío sin explicación. La lista ya sale filtrada
  // (`loadEnabledExamOptions`); esto solo cubre el intento manipulado.
  redirect('/onboarding?unavailable=1');
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
    // G74: la cobertura se revalida AQUÍ, contra la base, no se confía en que
    // la lista renderizada estuviera filtrada. El botón de un área
    // «Próximamente» ni siquiera se pinta, así que llegar con su `areaId`
    // implica un request manipulado — o una lista que se quedó tibia en un
    // caché mientras el contenido cambiaba.
    const selectable = await onboardingDb.loadSelectableAreaForExam(areaId, profile.targetExamId);
    if (selectable) {
      redirect(`/onboarding?area=${selectable.area.id}`);
    }
    // Mismo criterio que `selectExamAction`: no fallar en silencio. El alumno
    // vuelve al Paso 2 con el aviso visible en vez de un rebote sin explicar.
    redirect('/onboarding?unavailable=1');
  }

  redirect('/onboarding');
}

const waitlistSchema = z.object({ areaId: z.string().min(1).max(64) });

/**
 * G74 — «avísame cuando abra esta área». El alumno ya está registrado y con
 * correo verificado, así que no se le pide que escriba nada: lo que falta no
 * es su correo, es su intención, y eso es lo que se registra.
 *
 * El sistema de registro es un evento de producto (`area_waitlist_joined`) con
 * el `UserProfile.id` como `distinctId`. No se añade tabla porque tocar
 * `prisma/schema.prisma` exige instrucción explícita (CLAUDE.md) — la lista se
 * reconstruye cruzando el evento con `app_security.auth_emails_for_profiles`
 * (G73). Queda apuntado como deuda consciente en docs/ESTADO.md §G74: el día
 * que esto deba disparar un correo automático, necesita su tabla.
 */
export async function requestAreaNotificationAction(
  input: z.input<typeof waitlistSchema>
): Promise<ActionResult<{ areaName: string }>> {
  try {
    const { profile } = await requireUser();
    if (!profile.targetExamId) {
      return { ok: false, code: 'NO_TARGET', message: 'Primero elige tu examen.' };
    }

    const gate = await consumeRateLimit('AREA_WAITLIST', profile.id);
    if (!gate.allowed) {
      return {
        ok: false,
        code: 'RATE_LIMIT',
        message: 'Ya te apuntamos. Espera un momento antes de volver a intentar.',
      };
    }

    const { areaId } = waitlistSchema.parse(input);
    const target = await onboardingDb.loadAreaForWaitlist(areaId, profile.targetExamId);
    // `null` incluye el caso «esa área ya está disponible»: apuntarse a esperar
    // algo que ya se puede elegir sería una promesa que nunca se cumpliría.
    if (!target) {
      return {
        ok: false,
        code: 'NOT_PENDING',
        message: 'Esa área ya está disponible — elígela en la lista.',
      };
    }

    await trackServerEvent(profile.id, 'area_waitlist_joined', {
      areaCode: target.areaCode,
      examLabel: target.examLabel,
      coveredPct: Math.round(target.coverage.coveredRatio * 100),
      pendingSubjects: target.coverage.pendingSubjectNames.length,
    });

    return { ok: true, data: { areaName: target.areaName } };
  } catch {
    return { ok: false, code: 'UNKNOWN', message: 'Algo salió mal. Intenta de nuevo.' };
  }
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

/**
 * Cierra el asistente y manda a /diagnostico. La creación de la sesión real
 * (45 min, 30 reactivos ponderados por materia — F7) vive por completo en
 * `diagnosticDb`/la propia ruta: si no hay sesión abierta, /diagnostico la
 * arma al vuelo. Así este Server Action no duplica esa lógica ni puede crear
 * una sesión huérfana si el usuario llega aquí dos veces.
 */
export async function startDiagnosticAction(): Promise<void> {
  const { profile } = await requireUser();

  if (profile.onboardingStep >= OnboardingStep.DIAGNOSTIC_INTRO && profile.targetExamId) {
    await onboardingDb.completeOnboardingWizard(profile.id);
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
