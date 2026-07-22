import { NextResponse } from 'next/server';
import type { UserProfile } from '@prisma/client';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { AuthError } from './errors';
import { requireUser } from './guards';

/**
 * Adaptador de `requireUser` para Route Handlers (API). A diferencia de los
 * guards de página (que redirigen), aquí un fallo de auth debe devolver un
 * status HTTP. Devuelve o el usuario+perfil, o una NextResponse ya lista.
 */
export type GuardOutcome =
  | { ok: true; authUser: SupabaseUser; profile: UserProfile }
  | { ok: false; response: NextResponse };

const STATUS_BY_CODE: Record<string, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  PAYWALL: 402,
};

export async function guardApiUser(): Promise<GuardOutcome> {
  try {
    const { authUser, profile } = await requireUser();
    return { ok: true, authUser, profile };
  } catch (err) {
    if (err instanceof AuthError) {
      const status = STATUS_BY_CODE[err.code] ?? 401;
      return {
        ok: false,
        response: NextResponse.json({ error: err.message, code: err.code }, { status }),
      };
    }
    throw err;
  }
}
