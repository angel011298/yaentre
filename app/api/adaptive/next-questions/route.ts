import { NextResponse, type NextRequest } from 'next/server';
import { guardApiUser } from '@/lib/auth/route-guard';
import {
  getDefaultAreaId,
  selectNextAdaptiveQuestions,
} from '@/lib/db/adaptive';
import { evaluateDrillGate } from '@/lib/db/paywall';
import { DEFAULT_ADAPTIVE_COUNT, nextQuestionsSchema } from '@/lib/adaptive/api';
import { consumeRateLimit } from '@/lib/rate-limit/store';

/**
 * Endpoint protegido (F6, Task 5): próximos reactivos adaptativos para una
 * práctica libre. Requiere sesión y valida el cuerpo con Zod. El área se toma
 * del cuerpo o, si se omite, de la carrera meta del alumno. Si el motor no puede
 * clasificar temas, la capa DB cae a un respaldo aleatorio (fallbackUsed=true).
 *
 * Muro suave (F9): un usuario FREE tiene 10 reactivos de práctica libre por
 * día (medianoche en huso de México). Al llegar al límite, 402 con el trigger
 * del paywall; si le quedan menos de los pedidos, se recorta el batch al
 * restante en vez de negarlo por completo.
 */
export async function POST(request: NextRequest) {
  const guard = await guardApiUser();
  if (!guard.ok) return guard.response;

  // G65: tope por ALUMNO, no por instancia Edge (ver `rate-limit/store.ts`).
  const gate = await consumeRateLimit('ADAPTIVE', guard.profile.id);
  if (!gate.allowed) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Intenta de nuevo en unos segundos.' },
      { status: 429, headers: { 'Retry-After': String(gate.retryAfterSecs) } }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const parsed = nextQuestionsSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos.', fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  try {
    const drillGate = await evaluateDrillGate(guard.profile.id);
    if (!drillGate.decision.allowed) {
      return NextResponse.json(
        {
          error: 'Llegaste a tu práctica gratis de hoy. Vuelve mañana o desbloquea ilimitado.',
          trigger: drillGate.decision.trigger,
        },
        { status: 402 }
      );
    }

    const areaId = parsed.data.areaId ?? (await getDefaultAreaId(guard.profile.id));
    if (!areaId) {
      return NextResponse.json(
        { error: 'Aún no tienes un área de estudio. Completa tu onboarding para practicar.' },
        { status: 409 }
      );
    }

    const requestedCount = parsed.data.count ?? DEFAULT_ADAPTIVE_COUNT;
    const count =
      drillGate.remainingToday === null
        ? requestedCount
        : Math.min(requestedCount, drillGate.remainingToday);

    const result = await selectNextAdaptiveQuestions(guard.profile.id, areaId, count);

    return NextResponse.json({ areaId, remainingToday: drillGate.remainingToday, ...result });
  } catch (err) {
    console.error('[adaptive/next-questions] Falló la selección', {
      userProfileId: guard.profile.id,
      err,
    });
    return NextResponse.json(
      { error: 'No pudimos preparar tu práctica. Intenta de nuevo.' },
      { status: 500 }
    );
  }
}
