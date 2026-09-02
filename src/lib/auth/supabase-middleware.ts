import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { AUTH_COOKIE_OPTIONS } from './cookie-options';

/**
 * Cliente de Supabase ligado al ciclo request/response del middleware.
 * Sincroniza las cookies de sesión entre request y response en cada tick,
 * siguiendo el patrón recomendado por Supabase para Next.js App Router.
 *
 * G65: el middleware es quien REESCRIBE la cookie cada vez que refresca la
 * sesión, así que tiene que aplicar las mismas opciones que el cliente de
 * servidor. Si solo se endureciera en un lado, el primer refresco devolvería
 * la cookie a `httpOnly: false` y el arreglo duraría una hora.
 */
export function createSupabaseMiddlewareClient(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: AUTH_COOKIE_OPTIONS,
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request: { headers: request.headers } });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, { ...options, ...AUTH_COOKIE_OPTIONS });
          });
        },
      },
    }
  );

  return { supabase, response };
}
