/**
 * scripts/g100/lib.ts — ayudantes compartidos por las sondas de G100.
 *
 * Sesiones emitidas por el Auth REAL y escritas en la cookie con el mismo
 * formato que `@supabase/ssr` (prefijo `base64-`, base64url, partida en trozos
 * de 3 180). Así una sonda puede abrir sesión sin pasar por el formulario,
 * cuyo límite de tasa (G65: 8 intentos por IP cada 10 min, contador en
 * Postgres) se agotaría a la tercera corrida.
 */
import type { BrowserContext } from '@playwright/test';
import { createClient, type Session } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
export const COOKIE_NAME = `sb-${new URL(SUPABASE_URL).hostname.split('.')[0]}-auth-token`;
const CHUNK = 3180;

export async function freshSession(email: string, password = process.env.G100_PROBE_PASSWORD ?? ''): Promise<Session> {
  const client = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) throw new Error(`No se pudo iniciar sesión como ${email}: ${error?.message}`);
  return data.session;
}

export function sessionCookies(session: object): Array<{ name: string; value: string }> {
  const value = `base64-${Buffer.from(JSON.stringify(session)).toString('base64url')}`;
  if (value.length <= CHUNK) return [{ name: COOKIE_NAME, value }];
  const out: Array<{ name: string; value: string }> = [];
  for (let i = 0; i * CHUNK < value.length; i++) {
    out.push({ name: `${COOKIE_NAME}.${i}`, value: value.slice(i * CHUNK, (i + 1) * CHUNK) });
  }
  return out;
}

export async function injectSession(ctx: BrowserContext, session: object, base: string): Promise<void> {
  const url = new URL(base);
  await ctx.addCookies(
    sessionCookies(session).map((c) => ({
      ...c,
      domain: url.hostname,
      path: '/',
      httpOnly: true,
      secure: url.protocol === 'https:',
      sameSite: 'Lax' as const,
    }))
  );
}
