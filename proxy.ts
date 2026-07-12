import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseMiddlewareClient } from '@/lib/auth/supabase-middleware';

// Ver docs/Flujo_App_Acierta_v1.0.md §16.1 (mapa de rutas) y §16.2 (guards).
const AUTH_REQUIRED_PREFIXES = ['/app', '/onboarding', '/diagnostico', '/checkout', '/tutor', '/admin'];
const VERIFIED_EMAIL_REQUIRED_PREFIXES = ['/checkout'];

function matchesPrefix(pathname: string, prefixes: string[]) {
  return prefixes.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export async function proxy(request: NextRequest) {
  const { supabase, response } = createSupabaseMiddlewareClient(request);

  let user;
  try {
    const {
      data: { user: fetchedUser },
    } = await supabase.auth.getUser();
    user = fetchedUser;
  } catch {
    // Supabase inalcanzable: se trata como "sin sesión" en vez de tumbar el sitio.
    user = null;
  }

  const { pathname, search } = request.nextUrl;

  if (matchesPrefix(pathname, AUTH_REQUIRED_PREFIXES) && !user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (matchesPrefix(pathname, VERIFIED_EMAIL_REQUIRED_PREFIXES) && user && !user.email_confirmed_at) {
    const appUrl = new URL('/app', request.url);
    appUrl.searchParams.set('verify', '1');
    return NextResponse.redirect(appUrl);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
