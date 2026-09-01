import type { EmailOtpType } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { safeInternalPath } from '@/lib/auth/safe-redirect';

/**
 * Destino de los enlaces de verificación de correo y recuperación de
 * contraseña que envía Supabase (patrón token_hash + type). Cubre ambos
 * casos: type=signup (verificación) y type=recovery (reset de password).
 */
const ALLOWED_OTP_TYPES: readonly EmailOtpType[] = [
  'signup',
  'recovery',
  'invite',
  'magiclink',
  'email',
  'email_change',
];

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get('token_hash');
  const typeParam = searchParams.get('type');
  const type = ALLOWED_OTP_TYPES.includes(typeParam as EmailOtpType)
    ? (typeParam as EmailOtpType)
    : null;
  // G60: `next` viene en la URL del correo — se sanea a una ruta interna para
  // que el enlace de confirmación no sirva como redirector abierto.
  const next = safeInternalPath(searchParams.get('next'), '/app');

  if (tokenHash && type) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=verification_failed`);
}
