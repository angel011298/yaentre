import { NextResponse, type NextRequest } from 'next/server';
import { guardApiUser } from '@/lib/auth/route-guard';
import {
  getDefaultAreaId,
  selectNextAdaptiveQuestions,
} from '@/lib/db/adaptive';
import { DEFAULT_ADAPTIVE_COUNT, nextQuestionsSchema } from '@/lib/adaptive/api';

/**
 * Endpoint protegido (F6, Task 5): próximos reactivos adaptativos para una
 * práctica libre. Requiere sesión y valida el cuerpo con Zod. El área se toma
 * del cuerpo o, si se omite, de la carrera meta del alumno. Si el motor no puede
 * clasificar temas, la capa DB cae a un respaldo aleatorio (fallbackUsed=true).
 */
export async function POST(request: NextRequest) {
  const guard = await guardApiUser();
  if (!guard.ok) return guard.response;

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

  const areaId = parsed.data.areaId ?? (await getDefaultAreaId(guard.profile.id));
  if (!areaId) {
    return NextResponse.json(
      { error: 'Aún no tienes un área de estudio. Completa tu onboarding para practicar.' },
      { status: 409 }
    );
  }

  const count = parsed.data.count ?? DEFAULT_ADAPTIVE_COUNT;
  const result = await selectNextAdaptiveQuestions(guard.profile.id, areaId, count);

  return NextResponse.json({ areaId, ...result });
}
