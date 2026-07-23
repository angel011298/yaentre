import Link from 'next/link';
import { Tino } from '@/components/mascot/Tino';
import type { PaywallTrigger } from '@/lib/paywall/gates';
import type { PlanPricing } from '@/lib/stripe/pricing';
import { PlanCard } from './PlanCard';

const TRIGGER_COPY: Record<PaywallTrigger, { title: string; body: string }> = {
  FULL_SIMULATION_LIMIT: {
    title: 'Ya viviste tu primer simulacro',
    body: 'Desbloquea los simulacros completos ilimitados para seguir practicando bajo condiciones reales.',
  },
  DRILL_DAILY_LIMIT: {
    title: 'Llegaste a tu práctica de hoy',
    body: 'Vuelve mañana con tu racha, o desbloquea reactivos ilimitados ahora mismo.',
  },
  EXPLANATION_LAYER: {
    title: 'Desbloquea el paso a paso',
    body: 'La Capa 1 siempre es gratis. El paso a paso, el concepto base y la práctica similar viven en los planes de pago.',
  },
  PARENT_DASHBOARD: {
    title: 'El panel parental es para Pase o Premium',
    body: 'Con el Pase de Temporada o Premium, ve el progreso de tu hijo desde tu propio dispositivo.',
  },
};

const DEFAULT_COPY = {
  title: 'Desbloquea todo Acierta',
  body: 'Simulacros ilimitados, resolución por capas y tu Aciertómetro completo.',
};

interface Props {
  trigger: PaywallTrigger | null;
  returnTo: string;
  pricing: PlanPricing[];
  earlyBirdRemaining: number | null;
}

/**
 * Paywall de muro suave (F9 Task 2): copy dinámico según qué gate lo disparó,
 * comparativa de los 3 planes con el Pase de Temporada destacado, precio de
 * la temporada vigente (Early Bird ya cae solo a precio regular si el cupo se
 * agotó — ver resolveEffectiveSeason), y "Ahora no" que regresa exactamente a
 * `returnTo` sin fricción ni penalización.
 */
export function PaywallScreen({ trigger, returnTo, pricing, earlyBirdRemaining }: Props) {
  const copy = trigger ? TRIGGER_COPY[trigger] : DEFAULT_COPY;
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

      {earlyBirdRemaining !== null && seasonPass?.season === 'EARLY_BIRD' && (
        <p className="rounded-md border border-streak/40 bg-streak/10 px-3 py-2 text-center text-sm font-semibold text-streak">
          🏅 Precio Early Bird — quedan {earlyBirdRemaining} de 500 licencias fundadoras
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {pricing.map((p) => (
          <PlanCard key={p.plan} pricing={p} highlighted={p.plan === 'SEASON_PASS'} />
        ))}
      </div>

      <div className="flex justify-center">
        <Link href={returnTo} className="text-sm font-semibold text-text-muted hover:text-brand-soft hover:underline">
          Ahora no, seguir sin desbloquear
        </Link>
      </div>
    </div>
  );
}
