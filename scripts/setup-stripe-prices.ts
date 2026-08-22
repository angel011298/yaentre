/**
 * scripts/setup-stripe-prices.ts — Crea (idempotente) los 9 Price de Stripe
 * (3 planes × 3 temporadas) con los montos exactos del PRD §9, y escribe sus
 * identificadores en `.env.example`.
 *
 * Idempotencia: cada Price se crea con un `lookup_key` estable (p. ej.
 * `mensual_eb`). Antes de crear, se busca un Price ACTIVO con ese lookup_key;
 * si ya existe, se reusa su id — correr el script varias veces nunca duplica
 * productos ni precios en el dashboard de Stripe.
 *
 * El checkout (app/actions/checkout.ts) lee estos ids desde las variables de
 * entorno `STRIPE_PRICE_*` (ver `stripePriceEnvVar` en src/lib/stripe/pricing.ts)
 * y los usa SOLO si están configurados; si no, calcula el precio al vuelo con
 * `price_data` (mismo monto) — así el checkout funciona con o sin haber
 * corrido este script.
 *
 * Uso: pnpm stripe:setup-prices
 */
import './lib/env';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import Stripe from 'stripe';
import type { PricingSeason, SubscriptionPlan } from '@prisma/client';
import { getPlanPricing, stripePriceEnvVar } from '@/lib/stripe/pricing';

const PLANS: SubscriptionPlan[] = ['MONTHLY', 'SEASON_PASS', 'PREMIUM'];
const SEASONS: PricingSeason[] = ['EARLY_BIRD', 'HIGH_SEASON', 'LAST_MINUTE'];

const PLAN_SLUG: Record<SubscriptionPlan, string> = {
  MONTHLY: 'mensual',
  SEASON_PASS: 'pase',
  PREMIUM: 'premium',
};
const SEASON_SLUG: Record<PricingSeason, string> = {
  EARLY_BIRD: 'eb',
  HIGH_SEASON: 'reg',
  LAST_MINUTE: 'lm',
};

function lookupKey(plan: SubscriptionPlan, season: PricingSeason): string {
  return `${PLAN_SLUG[plan]}_${SEASON_SLUG[season]}`;
}

async function findExistingPriceId(stripe: Stripe, key: string): Promise<string | null> {
  const found = await stripe.prices.list({ lookup_keys: [key], active: true, limit: 1 });
  return found.data[0]?.id ?? null;
}

async function ensurePrice(stripe: Stripe, plan: SubscriptionPlan, season: PricingSeason): Promise<{
  key: string;
  priceId: string;
  created: boolean;
}> {
  const key = lookupKey(plan, season);
  const existing = await findExistingPriceId(stripe, key);
  if (existing) return { key, priceId: existing, created: false };

  const pricing = getPlanPricing(plan, season);
  const price = await stripe.prices.create({
    currency: 'mxn',
    unit_amount: pricing.amountMxn,
    lookup_key: key,
    ...(pricing.isRecurring ? { recurring: { interval: 'month' } } : {}),
    product_data: { name: pricing.productName },
    metadata: { plan, season },
  });

  return { key, priceId: price.id, created: true };
}

/** Reemplaza (o agrega) las líneas `STRIPE_PRICE_*=` en .env.example. */
function writeEnvExample(entries: Array<{ envVar: string; priceId: string }>): void {
  const path = join(process.cwd(), '.env.example');
  const original = existsSync(path) ? readFileSync(path, 'utf8') : '';
  const lines = original.length > 0 ? original.split('\n') : [];

  const remaining = new Map(entries.map((e) => [e.envVar, e.priceId]));

  const updated = lines.map((line) => {
    const match = line.match(/^([A-Z0-9_]+)=/);
    if (match && remaining.has(match[1])) {
      const envVar = match[1];
      const value = remaining.get(envVar)!;
      remaining.delete(envVar);
      return `${envVar}=${value}`;
    }
    return line;
  });

  if (remaining.size > 0) {
    if (updated.length > 0 && updated[updated.length - 1].trim() !== '') updated.push('');
    updated.push('# Stripe Price IDs (F9 — generados por scripts/setup-stripe-prices.ts)');
    for (const [envVar, value] of remaining) {
      updated.push(`${envVar}=${value}`);
    }
  }

  writeFileSync(path, updated.join('\n'));
}

async function main() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey || secretKey.includes('your-secret-key') || secretKey.length < 30) {
    throw new Error(
      'Falta una STRIPE_SECRET_KEY real en .env.local (dashboard.stripe.com/test/apikeys). ' +
        'No se puede crear nada en Stripe con una llave placeholder.'
    );
  }

  const stripe = new Stripe(secretKey, { telemetry: false });

  console.log('═'.repeat(64));
  console.log('🦉 YaEntre — Configuración de precios en Stripe (F9)');
  console.log('═'.repeat(64));

  const results: Array<{ envVar: string; priceId: string; created: boolean; label: string }> = [];

  for (const plan of PLANS) {
    for (const season of SEASONS) {
      const { key, priceId, created } = await ensurePrice(stripe, plan, season);
      const envVar = stripePriceEnvVar(plan, season);
      results.push({ envVar, priceId, created, label: key });
      console.log(
        `  ${created ? '✅ creado' : '↩️  ya existía'}  ${key.padEnd(12)} → ${priceId}  (${envVar})`
      );
    }
  }

  writeEnvExample(results.map((r) => ({ envVar: r.envVar, priceId: r.priceId })));

  const createdCount = results.filter((r) => r.created).length;
  console.log('═'.repeat(64));
  console.log(
    `${createdCount} precio(s) nuevo(s), ${results.length - createdCount} reusado(s). .env.example actualizado.`
  );
  console.log('Copia estos valores a tu .env.local si quieres que el checkout los use.');
  console.log('═'.repeat(64));
}

main().catch((err) => {
  console.error(`\n❌ Error: ${(err as Error).message}`);
  process.exitCode = 1;
});
