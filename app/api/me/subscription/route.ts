import { NextResponse } from 'next/server';
import { AuthError } from '@/lib/auth/errors';
import { requireUser } from '@/lib/auth/guards';
import { loadAccessSummary } from '@/lib/db/access-summary';

/**
 * G103 — GET /api/me/subscription: estado de acceso del alumno de la sesión
 * (spec de temporalidad §3.6). El dueño sale del guard; no acepta ningún id.
 * Sin datos de pago: plan, fechas, estado derivado y si puede extender.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  let profileId: string;
  try {
    profileId = (await requireUser()).profile.id;
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    throw err;
  }

  const summary = await loadAccessSummary(profileId, new Date());
  return NextResponse.json(
    {
      accessStatus: summary.accessStatus,
      plan: summary.plan,
      expiresAt: summary.expiresAt?.toISOString() ?? null,
      graceEndsAt: summary.graceEndsAt?.toISOString() ?? null,
      extendedAt: summary.extendedAt?.toISOString() ?? null,
      canExtend: summary.extension.ok,
      extensionPriceCents: summary.extension.ok ? summary.extension.priceCents : null,
      extendedExpiresAt: summary.extension.ok ? summary.extension.newExpiresAt.toISOString() : null,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
