import Link from 'next/link';
import { Tino } from '@/components/mascot/Tino';
import type { PaywallTrigger } from '@/lib/paywall/gates';
import type { PlanPricing } from '@/lib/stripe/pricing';
import { paywallTriggerCopy } from '@/lib/tino/copy';
import { NotifyWhenOpenCard } from './NotifyWhenOpenCard';
import { PlanCard } from './PlanCard';

interface Props {
  trigger: PaywallTrigger | null;
  returnTo: string;
  pricing: PlanPricing[];
  earlyBirdRemaining: number | null;
  /** G98: veredicto del interruptor de ventas, resuelto en el servidor. */
  salesOpen: boolean;
}

/**
 * Paywall de muro suave (F9 Task 2): copy dinámico según qué gate lo disparó,
 * comparativa de los 3 planes con el Pase de Temporada destacado, precio de
 * la temporada vigente (Early Bird ya cae solo a precio regular si el cupo se
 * agotó — ver resolveEffectiveSeason), y "Ahora no" que regresa exactamente a
 * `returnTo` sin fricción ni penalización.
 *
 * G98: mientras la venta esté cerrada (`salesOpen === false`) los planes se
 * siguen mostrando completos —precio incluido— pero sin llamada a la compra, y
 * el contador de licencias desaparece: prometer «quedan 500 de 500» cuando
 * nadie puede comprar ninguna es una urgencia inventada. La pantalla es el
 * REFLEJO del interruptor del servidor, nunca su sustituto.
 */
export function PaywallScreen({
  trigger,
  returnTo,
  pricing,
  earlyBirdRemaining,
  salesOpen,
}: Props) {
  const copy = paywallTriggerCopy(trigger);
  const seasonPass = pricing.find((p) => p.plan === 'SEASON_PASS');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Tino state="encouraging" size={64} />
        <div>
          <h1 className="font-display text-xl font-bold text-text-primary">{copy.title}</h1>
          <p className="text-sm text-text-secondary">{copy.body}</p>
        </div>
      </div>

      {salesOpen && earlyBirdRemaining !== null && seasonPass?.season === 'EARLY_BIRD' && (
        <p className="rounded-md border border-streak/40 bg-streak/10 px-3 py-2 text-center text-sm font-semibold text-streak">
          🏅 Precio Early Bird — quedan {earlyBirdRemaining} de 500 licencias fundadoras
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {pricing.map((p) => (
          <PlanCard
            key={p.plan}
            pricing={p}
            highlighted={p.plan === 'SEASON_PASS'}
            salesOpen={salesOpen}
          />
        ))}
      </div>

      {!salesOpen && <NotifyWhenOpenCard />}

      <div className="flex justify-center">
        <Link href={returnTo} className="text-sm font-semibold text-text-muted hover:text-brand-soft hover:underline">
          Ahora no, seguir sin desbloquear
        </Link>
      </div>
    </div>
  );
}
