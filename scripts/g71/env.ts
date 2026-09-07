/**
 * scripts/g71/env.ts — G71. Entorno de las sondas de verificación integral.
 *
 * Importar SIEMPRE como primer import del entry-point (antes de
 * `@prisma/client`): Prisma lee `.env` al importarse y, si eso ocurre primero,
 * pisa `DATABASE_URL` con el placeholder de `localhost:5432` (gotcha G65).
 *
 * La base se ataca con el rol local (`acierta_ci`) de `.env.local`; del
 * archivo de producción (`G71_PROD_ENV`) solo se toman las credenciales de
 * servicios que localmente son placeholders — nunca la cadena de la base, para
 * no abrir un pool de servidor extra en Supavisor (regla de G69 §5).
 */
import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

for (const file of ['.env.local', '.env']) {
  const path = join(process.cwd(), file);
  if (existsSync(path)) config({ path, quiet: true });
}

const FROM_PROD = [
  'RESEND_API_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_SENTRY_DSN',
  'NEXT_PUBLIC_POSTHOG_KEY',
  'NEXT_PUBLIC_POSTHOG_HOST',
  'CRON_SECRET',
  'STRIPE_PRICE_PASE_EB',
  'STRIPE_PRICE_PASE_LM',
  'STRIPE_PRICE_PASE_REG',
  'STRIPE_PRICE_MENSUAL_EB',
  'STRIPE_PRICE_MENSUAL_LM',
  'STRIPE_PRICE_MENSUAL_REG',
  'STRIPE_PRICE_PREMIUM_EB',
  'STRIPE_PRICE_PREMIUM_LM',
  'STRIPE_PRICE_PREMIUM_REG',
];

const prodEnvPath = process.env.G71_PROD_ENV;
if (prodEnvPath && existsSync(prodEnvPath)) {
  const parsed = config({ path: prodEnvPath, processEnv: {} as NodeJS.ProcessEnv, quiet: true }).parsed ?? {};
  for (const key of FROM_PROD) {
    if (parsed[key]) process.env[key] = parsed[key];
  }
}

export const PROD_URL = 'https://yaentre.com';
