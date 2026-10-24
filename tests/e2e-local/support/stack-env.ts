import { readFileSync } from 'node:fs';

/**
 * G103 — entorno del servidor de e2e LOCAL. Todo lo que habla hacia fuera
 * queda apuntando a este equipo o apagado:
 *   · Supabase (Auth, Storage, base) → la pila local (`supabase start`);
 *   · Stripe → el simulador `fake-stripe.ts` (llave de prueba ficticia);
 *   · Sentry, PostHog, píxeles, Resend → vacíos (nada sale a los servicios reales).
 * Next.js no sobreescribe con `.env.local` lo que ya trae el proceso, aunque
 * sea una cadena vacía: por eso cada externo se fija explícitamente aquí.
 *
 * Lee la salida de `supabase status -o env` desde `E2E_LOCAL_STACK_ENV`.
 */
export const LOCAL = {
  appUrl: 'http://localhost:3000',
  /** Mismo build, banderas de G103 APAGADAS (son de servidor, no se incrustan). */
  flagsOffUrl: 'http://localhost:3001',
  fakeStripePort: 12111,
  webhookSecret: 'whsec_e2e_local',
  masterAdminEmail: 'admin@e2e.yaentre.test',
  emailDomain: 'e2e.yaentre.test',
} as const;

export function readStackFile(path = process.env.E2E_LOCAL_STACK_ENV): Record<string, string> {
  if (!path) throw new Error('Define E2E_LOCAL_STACK_ENV con la ruta de `supabase status -o env` (ver tests/e2e-local/README.md).');
  const out: Record<string, string> = {};
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const m = /^([A-Z_]+)="?(.*?)"?$/.exec(line.trim());
    if (m) out[m[1]] = m[2];
  }
  for (const k of ['API_URL', 'ANON_KEY', 'SERVICE_ROLE_KEY', 'DB_URL']) {
    if (!out[k]) throw new Error(`Falta ${k} en ${path}`);
  }
  if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(out.API_URL) || !/@(127\.0\.0\.1|localhost):\d+\//.test(out.DB_URL)) {
    throw new Error('La pila de e2e tiene que estar en 127.0.0.1: este arnés nunca apunta a un proyecto real.');
  }
  // En Windows, `wslrelay` (reenvío de puertos de WSL) también escucha en
  // 127.0.0.1:<puerto de la base> y puede atascarse con conexiones a medio
  // cerrar; por `localhost` la conexión llega directo a Docker.
  out.DB_URL = out.DB_URL.replace('@127.0.0.1:', '@localhost:');
  return out;
}

export function localServerEnv(stack = readStackFile()): Record<string, string> {
  const priceVars = ['PASE', 'MENSUAL', 'PREMIUM'].flatMap((p) => ['EB', 'LM', 'REG'].map((s) => `STRIPE_PRICE_${p}_${s}`));
  return {
    NEXT_PUBLIC_SUPABASE_URL: stack.API_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: stack.ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: stack.SERVICE_ROLE_KEY,
    DATABASE_URL: stack.DB_URL,
    DIRECT_URL: stack.DB_URL,
    NEXT_PUBLIC_SITE_URL: LOCAL.appUrl,
    STRIPE_SECRET_KEY: 'sk_test_e2e_local',
    STRIPE_WEBHOOK_SECRET: LOCAL.webhookSecret,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'pk_test_e2e_local',
    STRIPE_E2E_LOCAL_API: `http://127.0.0.1:${LOCAL.fakeStripePort}`,
    E2E_APP_URL: LOCAL.appUrl,
    FAKE_STRIPE_PORT: String(LOCAL.fakeStripePort),
    ...Object.fromEntries(priceVars.map((k) => [k, ''])),
    // `vercel env pull` deja VERCEL_ENV=development en .env.local: vacío, la
    // app no se cree en Vercel y el SDK puede usar el simulador local.
    VERCEL_ENV: '',
    VERCEL_URL: '',
    SALES_OPEN: 'true',
    FEATURE_TEACHER_AVAILABILITY: 'true',
    FEATURE_REGULARIZACION: 'true',
    FEATURE_COURSES: 'true',
    MASTER_ADMIN_EMAILS: LOCAL.masterAdminEmail,
    CRON_SECRET: 'cron_e2e_local',
    RESEND_API_KEY: '',
    NEXT_PUBLIC_SENTRY_DSN: '',
    SENTRY_AUTH_TOKEN: '',
    SENTRY_ORG: '',
    SENTRY_PROJECT: '',
    NEXT_PUBLIC_POSTHOG_KEY: '',
    NEXT_PUBLIC_POSTHOG_HOST: '',
    NEXT_PUBLIC_META_PIXEL_ID: '',
    NEXT_PUBLIC_TIKTOK_PIXEL_ID: '',
    NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION: '',
    NEXT_PUBLIC_BING_SITE_VERIFICATION: '',
  };
}

/** El mismo entorno con las tres banderas del marketplace apagadas (como producción hoy). */
export function flagsOffServerEnv(stack = readStackFile()): Record<string, string> {
  return {
    ...localServerEnv(stack),
    FEATURE_TEACHER_AVAILABILITY: 'false',
    FEATURE_REGULARIZACION: 'false',
    FEATURE_COURSES: 'false',
  };
}
