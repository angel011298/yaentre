import type { SubscriptionPlan } from '@prisma/client';
import { Card } from '@/components/ui/Card';
import type { PlanPricing } from '@/lib/stripe/pricing';
import { ChoosePlanButton } from './ChoosePlanButton';

const PLAN_LABELS: Record<SubscriptionPlan, string> = {
  MONTHLY: 'Mensual',
  SEASON_PASS: 'Pase de Temporada',
  PREMIUM: 'Premium Garantía',
};

const PLAN_FEATURES: Record<SubscriptionPlan, string[]> = {
  MONTHLY: [
    'Reactivos ilimitados (Drill)',
    'Simulacros completos ilimitados',
    'Resolución por capas completa',
    'Entrómetro',
  ],
  SEASON_PASS: [
    'Todo lo de Mensual',
    'Panel parental incluido',
    'Vigente hasta el día de tu examen',
  ],
  PREMIUM: [
    'Todo lo del Pase de Temporada',
    'Garantía: reembolso si no ingresas',
    'Tutorías prioritarias (próximamente)',
  ],
};

function formatMxn(cents: number): string {
  return (cents / 100).toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
}

export function PlanCard({
  pricing,
  highlighted = false,
  salesOpen,
}: {
  pricing: PlanPricing;
  highlighted?: boolean;
  /** G98: con la venta cerrada el plan conserva TODA su información y solo
   *  cambia su llamada a la acción. Ocultar el precio sería esconder lo único
   *  que el alumno vino a ver. */
  salesOpen: boolean;
}) {
  return (
    <Card
      className={`flex flex-col gap-4 p-5 ${
        highlighted ? 'border-2 border-brand shadow-lg' : ''
      }`}
    >
      {highlighted && (
        <span className="w-fit rounded-full bg-brand-tint px-3 py-1 text-xs font-semibold text-brand">
          ⭐ Más elegido
        </span>
      )}
      <div>
        <p className="font-display text-lg font-bold text-text-primary">{PLAN_LABELS[pricing.plan]}</p>
        <p className="mt-1 text-2xl font-bold text-text-primary">
          {formatMxn(pricing.amountMxn)}
          <span className="text-sm font-normal text-text-muted">
            {pricing.isRecurring ? '/mes' : pricing.hasGuarantee ? ' · con garantía' : ' · pago único'}
          </span>
        </p>
      </div>

      <ul className="flex-1 space-y-2 text-sm text-text-secondary">
        {PLAN_FEATURES[pricing.plan].map((feature) => (
          <li key={feature} className="flex items-start gap-2">
            <span aria-hidden className="text-success">✓</span>
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      {salesOpen ? (
        <ChoosePlanButton plan={pricing.plan} variant={highlighted ? 'primary' : 'secondary'} />
      ) : (
        // G98: en lugar de «Elegir este plan». No es un botón deshabilitado —
        // un botón apagado invita a insistir; esto informa. La acción posible
        // («Avísame cuando abra») vive una vez, debajo de la comparativa.
        <p className="rounded-md border border-border-subtle bg-elevated px-3 py-2 text-center text-sm font-semibold text-text-secondary">
          🔒 La preventa abre pronto
        </p>
      )}
    </Card>
  );
}
