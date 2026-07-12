import { createBrowserClient } from '@supabase/ssr';

/**
 * Cliente de Supabase para Client Components (estado de auth en tiempo real,
 * onAuthStateChange, etc.). La mayoría de las mutaciones de auth pasan por
 * Server Actions; este cliente es para lectura/reactividad en el navegador.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
