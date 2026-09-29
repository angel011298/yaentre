import { errorResponse, jsonError, jsonOk, readJson } from '@/lib/api/respond';
import { requireVerifiedUser } from '@/lib/auth/guards';
import { parseTeacherApplication, submitTeacherApplication } from '@/lib/teachers/service';

/**
 * POST /api/teachers/apply (spec §11): solicitud de onboarding. Disponible
 * aunque el marketplace esté cerrado — los profesores se registran durante Early
 * Bird. La persona sale del guard; el carril de pago lo decide el servidor
 * (`determinePaymentRail`), no un campo del cuerpo.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const ctx = await requireVerifiedUser();
    const parsed = parseTeacherApplication(await readJson(request), new Date());
    if (!parsed.ok) return jsonError('VALIDATION', parsed.message, 400);
    const { teacherId } = await submitTeacherApplication(
      { userProfileId: ctx.profile.id, authUserId: ctx.authUser.id, email: ctx.authUser.email },
      parsed.data
    );
    return jsonOk({ teacherId, status: 'PENDING_REVIEW' }, 201);
  } catch (err) {
    return errorResponse(err, { route: 'teachers.apply' });
  }
}
