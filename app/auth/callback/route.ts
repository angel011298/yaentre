import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { safeInternalPath } from '@/lib/auth/safe-redirect';
import { ensureStudentProfile } from '@/lib/auth/provision-profile';
import { hasVerifiedTotp } from '@/lib/auth/mfa';
import { trackServerEvent } from '@/lib/analytics/server';

/**
 * G100 — regreso de Google (OAuth con PKCE). Cubre dos casos con el mismo
 * intercambio de código:
 *  - inicio de sesión / registro con Google (`signInWithGoogleAction`);
 *  - vinculación de Google a una cuenta abierta (`linkGoogleAction`).
 *
 * El perfil se crea aquí si es el primer contacto de la cuenta (como STUDENT:
 * el registro de tutor sigue siendo por correo). Una cuenta con segundo
 * factor NO entra todavía: el intercambio deja una sesión aal1 y el reto de
 * `/verificacion-2fa` la sube a aal2 — mientras tanto `requireUser` rechaza
 * cualquier otra ruta.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = safeInternalPath(searchParams.get('next'), '');

  // Google devuelve `error=access_denied` si el alumno cancela.
  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=google_cancelled`);
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=google_failed`);
  }

  const { profile, created } = await ensureStudentProfile(data.user.id);
  if (created) await trackServerEvent(profile.id, 'signup_completed', { role: 'STUDENT', method: 'google' });

  const fallback = profile.role === 'PARENT' ? '/tutor' : '/app';
  const destination = next || fallback;

  if (hasVerifiedTotp(data.user.factors)) {
    return NextResponse.redirect(
      `${origin}/verificacion-2fa?next=${encodeURIComponent(destination)}`
    );
  }
  // `signup=1` dispara la conversión de registro (F24), igual que el registro
  // con correo. Con `URL` para no romper un destino que ya traiga `?` o `#`.
  const target = new URL(destination, origin);
  if (created) target.searchParams.set('signup', '1');
  return NextResponse.redirect(target);
}
