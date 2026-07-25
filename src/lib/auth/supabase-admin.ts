import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Cliente de Supabase con `SERVICE_ROLE_KEY` — SOLO servidor, SOLO para lo
 * que de verdad requiere privilegios de administrador (F17 tarea 3: borrar
 * la identidad de Auth de un usuario que elimina su cuenta; no hay forma de
 * hacer eso con el cliente normal, que solo puede operar sobre su propia
 * sesión). `import 'server-only'` blinda que la llave nunca cruce al
 * navegador — mismo patrón que `stripe/client.ts` (F8).
 */
let adminClient: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (adminClient) return adminClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error('Falta SUPABASE_SERVICE_ROLE_KEY: no se puede administrar la cuenta de Auth.');
  }

  adminClient = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return adminClient;
}
