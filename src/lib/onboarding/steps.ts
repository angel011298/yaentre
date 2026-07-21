/**
 * Máquina de pasos del onboarding (F5) — módulo puro, sin DB.
 *
 * `UserProfile.onboardingStep` (Int, ya existente en el schema) codifica en
 * qué punto del asistente está el usuario. No hay columna separada para el
 * área elegida en el Paso 2: al no ser un dato final (solo filtra al Paso 3),
 * se transporta por la URL (`?area=<id>`) y nunca se persiste — si el usuario
 * cierra la app entre el Paso 2 y el Paso 3, retoma en el Paso 2, que es el
 * último punto con progreso realmente confirmado.
 */
export const OnboardingStep = {
  /** Paso 1: elegir examen. Estado inicial (default del schema). */
  EXAM: 0,
  /** targetExamId guardado. Pasos 2 (área, efímero) y 3 (carrera) por completar. */
  AREA_CAREER: 1,
  /** targetCareerId guardado. Paso 4 (Tino + explicación del diagnóstico) por completar. */
  DIAGNOSTIC_INTRO: 2,
  /** Paso 4 resuelto (empezó o pospuso el diagnóstico). Asistente completo. */
  DONE: 3,
} as const;

export type OnboardingStepValue = (typeof OnboardingStep)[keyof typeof OnboardingStep];

/** Usado por requireOnboarding (guard de /app/*) y por /onboarding para no reingresar al asistente. */
export function isOnboardingComplete(step: number): boolean {
  return step >= OnboardingStep.DONE;
}
