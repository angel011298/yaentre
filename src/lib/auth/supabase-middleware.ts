import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { AUTH_COOKIE_OPTIONS, authCookieWriteOptions } from './cookie-options';

/**
 * Cliente de Supabase ligado al ciclo request/response del middleware.
 * Sincroniza las cookies de sesión entre request y response en cada tick,
 * siguiendo el patrón recomendado por Supabase para Next.js App Router.
 *
 * G65: el middleware es quien REESCRIBE la cookie cada vez que refresca la
 * sesión, así que tiene que aplicar las mismas opciones que el cliente de
 * servidor. Si solo se endureciera en un lado, el primer refresco devolvería
 * la cookie a `httpOnly: false` y el arreglo duraría una hora.
 *
 * G100 🔴 — `getResponse()` y no un `response` suelto. Hasta G99 esta función
 * devolvía `{ supabase, response }` con la respuesta CREADA AL INICIO, pero
 * `setAll` —que corre después, dentro de `getUser()` cuando toca refrescar—
 * construye una respuesta NUEVA y le pone ahí las cookies. El middleware
 * devolvía la vieja: el token refrescado nunca llegaba al navegador, y el
 * refresh token rotado quedaba "ya usado" en la cookie que el navegador sí
 * conservaba. La referencia se lee al FINAL, cuando ya está la buena.
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
            response.cookies.set(name, value, authCookieWriteOptions(options));
          });
        },
      },
    }
  );

  return { supabase, getResponse: () => response };
}

/**
 * Redirección que conserva las cookies que Supabase ya escribió en esta
 * petición (un token refrescado o el borrado de una sesión caducada). Un
 * `NextResponse.redirect` nuevo las perdería.
 */
export function redirectKeepingCookies(url: URL, from: NextResponse): NextResponse {
  const redirect = NextResponse.redirect(url);
  for (const cookie of from.cookies.getAll()) {
    redirect.cookies.set(cookie);
  }
  return redirect;
}
