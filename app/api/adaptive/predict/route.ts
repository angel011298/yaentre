import { NextResponse } from 'next/server';
import { guardApiUser } from '@/lib/auth/route-guard';
import { computeCareerStrategy, recomputeLearningProfile } from '@/lib/db/adaptive';

/**
 * Endpoint protegido (F6, Task 5): recalcula la predicción de aciertos
 * (Aciertómetro) del alumno y devuelve su estrategia de carrera. Requiere
 * sesión. No recibe cuerpo — opera sobre el estado del alumno autenticado.
 *
 * La meta de carrera SIEMPRE viaja calificada por su confianza (chosenTarget /
 * alternatives[].target son AciertometroDisplay, nunca un número pelón).
 */
export async function POST() {
  const guard = await guardApiUser();
  if (!guard.ok) return guard.response;

  const prediction = await recomputeLearningProfile(guard.profile.id);
  if (!prediction) {
    return NextResponse.json(
      { error: 'Aún no tienes una carrera meta. Completa tu onboarding para ver tu Aciertómetro.' },
      { status: 409 }
    );
  }

  const strategy = await computeCareerStrategy(guard.profile.id);

  return NextResponse.json({
    prediction: {
      predictedScore: prediction.predictedScore,
      confidence: prediction.confidence,
      subjectsWithData: prediction.subjectsWithData,
      totalSubjects: prediction.totalSubjects,
    },
    strategy,
  });
}
