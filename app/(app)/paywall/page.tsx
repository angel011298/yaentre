import type { SubscriptionPlan } from '@prisma/client';
import { PaywallScreen } from '@/components/paywall/PaywallScreen';
import { requireOnboarding } from '@/lib/auth/guards';
import { earlyBirdLicensesRemaining, resolveEffectiveSeason } from '@/lib/db/billing';
import type { PaywallTrigger } from '@/lib/paywall/gates';
import { sanitizeReturnPath } from '@/lib/paywall/return-path';
import { getPlanPricing } from '@/lib/stripe/pricing';
import { isSalesOpen } from '@/lib/stripe/sales-gate';
import { trackServerEvent } from '@/lib/analytics/server';

const VALID_TRIGGERS: readonly PaywallTrigger[] = [
  'FULL_SIMULATION_LIMIT',
  'DRILL_DAILY_LIMIT',
  'EXPLANATION_LAYER',
  'PARENT_DASHBOARD',
];

const PLANS: SubscriptionPlan[] = ['MONTHLY', 'SEASON_PASS', 'PREMIUM'];

function parseTrigger(raw: string | string[] | undefined): PaywallTrigger | null {
  const value = typeof raw === 'string' ? raw : undefined;
  return value && (VALID_TRIGGERS as string[]).includes(value) ? (value as PaywallTrigger) : null;
}

/**
 * Pantalla del muro suave (F9). Cualquier gate bloqueado redirige aquí con
 * `?trigger=<PaywallTrigger>&return=<ruta original>`. Server Component: toda
 * la data (temporada vigente, precios, cupo Early Bird) se resuelve en el
 * servidor antes de renderizar — el cliente solo interactúa al elegir un plan
 * (Server Action de F8) o al volver con "Ahora no".
 */
export const metadata = { title: 'Planes y precios' };

export default async function PaywallPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { profile } = await requireOnboarding();
  const sp = await searchParams;

  const trigger = parseTrigger(sp.trigger);
  const returnTo = sanitizeReturnPath(typeof sp.return === 'string' ? sp.return : undefined);

  // G98: el interruptor se resuelve en el SERVIDOR y baja a la pantalla como
  // dato. Con la venta cerrada ni siquiera se consulta el cupo Early Bird: el
  // contador no se va a pintar, así que esa consulta no tiene para qué correr.
  const salesOpen = isSalesOpen();
  const season = await resolveEffectiveSeason(new Date());
  const pricing = PLANS.map((plan) => getPlanPricing(plan, season));
  const earlyBirdRemaining =
    salesOpen && season === 'EARLY_BIRD' ? await earlyBirdLicensesRemaining() : null;

  await trackServerEvent(profile.id, 'paywall_shown', { trigger });

  return (
    <PaywallScreen
      trigger={trigger}
      returnTo={returnTo}
      pricing={pricing}
      earlyBirdRemaining={earlyBirdRemaining}
      salesOpen={salesOpen}
    />
  );
}
