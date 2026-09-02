import { NextResponse } from 'next/server';
import { guardApiUser } from '@/lib/auth/route-guard';
import { computeCareerStrategy, recomputeLearningProfile } from '@/lib/db/adaptive';
import { consumeRateLimit } from '@/lib/rate-limit/store';

/**
 * Endpoint protegido (F6, Task 5): recalcula la predicción de aciertos
 * (Entrómetro) del alumno y devuelve su estrategia de carrera. Requiere
 * sesión. No recibe cuerpo — opera sobre el estado del alumno autenticado.
 *
 * La meta de carrera SIEMPRE viaja calificada por su confianza (chosenTarget /
 * alternatives[].target son EntrometroDisplay, nunca un número pelón).
 */
export async function POST() {
  const guard = await guardApiUser();
  if (!guard.ok) return guard.response;

  // G65: recalcular el Entrometro dispara varias agregaciones sobre todo el
  // historial del alumno; tope por alumno para que no se pueda pedir en bucle.
  const gate = await consumeRateLimit('ADAPTIVE', guard.profile.id);
  if (!gate.allowed) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Intenta de nuevo en unos segundos.' },
      { status: 429, headers: { 'Retry-After': String(gate.retryAfterSecs) } }
    );
  }

  try {
    const prediction = await recomputeLearningProfile(guard.profile.id);
    if (!prediction) {
      return NextResponse.json(
        { error: 'Aún no tienes una carrera meta. Completa tu onboarding para ver tu Entrómetro.' },
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
  } catch (err) {
    console.error('[adaptive/predict] Falló el recálculo', { userProfileId: guard.profile.id, err });
    return NextResponse.json(
      { error: 'No pudimos recalcular tu Entrómetro. Intenta de nuevo.' },
      { status: 500 }
    );
  }
}
