import { cache } from 'react';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Cliente de Supabase para Server Components, Server Actions y Route Handlers.
 * La sesión vive en cookies httpOnly gestionadas por Supabase — nunca en
 * localStorage/sessionStorage.
 *
 * G62 (rendimiento): `cache()` de React — varias capas por request (guard del
 * layout, guard de la página, loaders) piden el cliente; deduplicar la
 * construcción + el `await cookies()` evita trabajo repetido en cada render de
 * `/app/*`. Una instancia por request es lo correcto (misma sesión, mismas
 * cookies).
 */
export const createSupabaseServerClient = cache(async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Se invocó desde un Server Component (no puede escribir cookies).
            // El middleware se encarga de refrescar la sesión en ese caso.
          }
        },
      },
    }
  );
});
