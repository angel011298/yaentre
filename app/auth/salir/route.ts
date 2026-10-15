import { NextResponse, type NextRequest } from 'next/server';
import { AUTH_COOKIE_OPTIONS } from '@/lib/auth/cookie-options';
import { isSupabaseAuthCookieName } from '@/lib/auth/middleware-policy';
import { isSameOriginRequest } from '@/lib/auth/same-origin';
import { clearSiteDataFor, SESSION_PERSISTENCE } from '@/lib/auth/session-policy';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { reportControlFailure } from '@/lib/observability/report';

/**
 * G100 — CERRAR SESIÓN EN ESTE DISPOSITIVO, SIN DEJAR RASTRO.
 *
 * Reemplaza a `signOutAction`. Es un Route Handler y no una Server Action por
 * una razón concreta: la única forma de pedirle al navegador que borre lo que
 * el sitio guardó (caché, cookies, `localStorage`, Cache Storage, el service
 * worker) es la cabecera `Clear-Site-Data` de la RESPUESTA, y una Server
 * Action no puede fijar cabeceras arbitrarias.
 *
 * Tres capas, porque ninguna basta sola:
 *  1. `signOut({ scope: 'local' })` revoca en Supabase SOLO la sesión de este
 *     dispositivo. El `signOut()` de antes era GLOBAL: salir en el celular
 *     tumbaba también la laptop (medido contra el Auth real en G100).
 *  2. Cada cookie `sb-…-auth-token*` se borra de forma explícita en la
 *     respuesta, aunque Supabase falle: `signOut` NO borra las cookies cuando
 *     la llamada de revocación revienta por red (auth-js devuelve el error
 *     antes de limpiar el almacenamiento).
 *  3. `Clear-Site-Data` para todo lo demás que el sitio dejó en el navegador.
 *
 * El formulario que llama aquí es HTML nativo (`<form method="post">`):
 * funciona antes de hidratar y en el navegador integrado de Facebook, donde
 * muchos tutores abren el panel.
 */
export async function POST(request: NextRequest) {
  // Un Route Handler no trae la validación de Origin de las Server Actions.
  if (!isSameOriginRequest(request.headers)) {
    return new NextResponse('Solicitud no permitida.', { status: 403 });
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) throw error;
  } catch (err) {
    // Las cookies se borran igual (abajo), así que en ESTE dispositivo no
    // queda nada. Lo que queda vivo es el refresh token en Supabase hasta que
    // caduque — sin la cookie nadie lo tiene, pero el silencio sería G73b.
    reportControlFailure('session_signout', 'degraded', err);
  }

  // 303: el navegador sigue con un GET a /login y el POST no queda en el
  // historial (atrás no ofrece «reenviar formulario»).
  const response = new NextResponse(null, {
    status: 303,
    headers: {
      Location: '/login?sesion=cerrada',
      'Clear-Site-Data': clearSiteDataFor(SESSION_PERSISTENCE),
      'Cache-Control': 'no-store',
    },
  });

  for (const { name } of request.cookies.getAll()) {
    if (isSupabaseAuthCookieName(name)) {
      response.cookies.set(name, '', { ...AUTH_COOKIE_OPTIONS, maxAge: 0 });
    }
  }

  return response;
}
