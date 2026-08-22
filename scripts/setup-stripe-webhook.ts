/**
 * scripts/setup-stripe-webhook.ts — Crea (idempotente) el webhook de Stripe
 * en modo de PRUEBA apuntando a la URL real de producción de Vercel, y
 * empuja el `STRIPE_WEBHOOK_SECRET` resultante a las variables de entorno de
 * producción de Vercel — SIN imprimirlo nunca en la terminal (mismo criterio
 * que el proyecto usa para `.env.local`/`.env`: los secretos no deben pasar
 * por la salida de un tool de lectura). El valor viaja directo del SDK de
 * Stripe al `stdin` de `vercel env add`, dentro del mismo proceso Node.
 *
 * Eventos suscritos: los 4 que `src/lib/stripe/webhook.ts` enruta
 * (checkout.session.completed, checkout.session.async_payment_succeeded,
 * checkout.session.async_payment_failed, customer.subscription.deleted).
 *
 * Idempotencia: si ya existe un webhook de prueba con la misma URL, lo
 * reusa — nunca crea duplicados corriendo el script varias veces. Si la URL
 * cambia (dominio propio conectado, ver docs/STRIPE_LIVE_CHECKLIST.md), usa
 * --force para eliminar el viejo y crear uno nuevo con la URL actualizada.
 *
 * Requiere:
 *   - STRIPE_SECRET_KEY real de PRUEBA en .env.local (dashboard.stripe.com/test/apikeys)
 *   - Vercel CLI autenticado y el proyecto ya enlazado (`vercel link`)
 *
 * Uso:
 *   npx tsx scripts/setup-stripe-webhook.ts --url https://yaentre.com [--force]
 */
import './lib/env';
import { spawnSync } from 'node:child_process';
import Stripe from 'stripe';

const WEBHOOK_EVENTS: Stripe.WebhookEndpointCreateParams.EnabledEvent[] = [
  'checkout.session.completed',
  'checkout.session.async_payment_succeeded',
  'checkout.session.async_payment_failed',
  'customer.subscription.deleted',
];

interface CliArgs {
  url: string;
  force: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const args: Partial<CliArgs> = { force: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--url') args.url = argv[++i];
    else if (argv[i] === '--force') args.force = true;
  }
  if (!args.url) throw new Error('Falta --url <https://tu-proyecto.vercel.app>');
  if (!args.url.startsWith('https://')) throw new Error('--url debe ser https://');
  return args as CliArgs;
}

/** Empuja un valor a Vercel SIN que pase por la salida capturada de esta
 *  terminal: el valor va directo al stdin del proceso hijo `vercel env add`. */
function pushToVercelEnv(name: string, value: string, environment: 'production'): void {
  const result = spawnSync('npx', ['vercel', 'env', 'add', name, environment], {
    input: value,
    stdio: ['pipe', 'inherit', 'inherit'],
    shell: true,
  });
  if (result.status !== 0) {
    throw new Error(
      `No se pudo guardar ${name} en Vercel (${environment}). Si ya existe, corre ` +
        `"vercel env rm ${name} ${environment}" y vuelve a intentar.`,
    );
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey || secretKey.includes('your-secret-key') || secretKey.length < 30) {
    throw new Error(
      'Falta una STRIPE_SECRET_KEY real de PRUEBA en .env.local (dashboard.stripe.com/test/apikeys). ' +
        'No se puede crear un webhook con una llave placeholder.',
    );
  }
  if (!secretKey.startsWith('sk_test_')) {
    throw new Error(
      'Esta llave no empieza con sk_test_ — este script es SOLO para modo de PRUEBA. ' +
        'La activación de modo real (live) es manual — ver docs/STRIPE_LIVE_CHECKLIST.md.',
    );
  }

  const stripe = new Stripe(secretKey, { telemetry: false });
  const targetUrl = `${args.url.replace(/\/$/, '')}/api/webhooks/stripe`;

  console.log('═'.repeat(64));
  console.log('🦉 YaEntre — Configuración de webhook de Stripe (modo PRUEBA, G6)');
  console.log(`   destino: ${targetUrl}`);
  console.log('═'.repeat(64));

  const existing = await stripe.webhookEndpoints.list({ limit: 100 });
  const match = existing.data.find((e) => e.url === targetUrl);

  if (match && !args.force) {
    console.log(`↩️  Ya existe un webhook de prueba con esta URL: ${match.id}`);
    console.log('   No se puede recuperar su signing secret después de creado —');
    console.log('   si necesitas rotarlo, vuelve a correr con --force.');
    return;
  }

  if (match && args.force) {
    console.log(`🗑️  --force: eliminando webhook anterior ${match.id}`);
    await stripe.webhookEndpoints.del(match.id);
  }

  const endpoint = await stripe.webhookEndpoints.create({
    url: targetUrl,
    enabled_events: WEBHOOK_EVENTS,
    description: 'YaEntre — producción Vercel (modo prueba, G6)',
  });

  console.log(`✅ Webhook creado: ${endpoint.id}`);
  console.log(`   Eventos: ${WEBHOOK_EVENTS.join(', ')}`);

  if (!endpoint.secret) {
    throw new Error(
      'Stripe no devolvió el signing secret en la respuesta de creación (inesperado). ' +
        'Consíguelo manualmente en dashboard.stripe.com/test/webhooks y guárdalo tú mismo con ' +
        '"vercel env add STRIPE_WEBHOOK_SECRET production".',
    );
  }

  console.log('🔒 Guardando STRIPE_WEBHOOK_SECRET en Vercel (producción) — el valor no se imprime aquí.');
  pushToVercelEnv('STRIPE_WEBHOOK_SECRET', endpoint.secret, 'production');

  console.log('═'.repeat(64));
  console.log('Listo. Falta un `vercel --prod` para que el runtime recoja la variable nueva.');
  console.log('═'.repeat(64));
}

main().catch((err) => {
  console.error(`\n❌ Error: ${(err as Error).message}`);
  process.exitCode = 1;
});
