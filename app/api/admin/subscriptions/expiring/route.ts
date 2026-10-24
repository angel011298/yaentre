import { NextResponse } from 'next/server';
import { AuthError } from '@/lib/auth/errors';
import { requireRole } from '@/lib/auth/guards';
import { listExpiringSubscriptions } from '@/lib/db/admin-expiring';

/**
 * G103 — GET /api/admin/subscriptions/expiring: vencen en ≤ 30 días o están en
 * gracia. El rol se verifica AQUÍ (un layout no protege un Route Handler).
 * `no-store` y fuera del service worker (`/api/admin/*`, G99).
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireRole('ADMIN');
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.code === 'FORBIDDEN' ? 403 : 401, headers: { 'Cache-Control': 'no-store' } }
      );
    }
    throw err;
  }
  const rows = await listExpiringSubscriptions(new Date());
  return NextResponse.json(
    {
      count: rows.length,
      subscriptions: rows.map((r) => ({
        ...r,
        expiresAt: r.expiresAt.toISOString(),
        graceEndsAt: r.graceEndsAt?.toISOString() ?? null,
        extendedAt: r.extendedAt?.toISOString() ?? null,
      })),
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
