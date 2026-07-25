import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { planLabel } from '@/lib/stripe/pricing';
import type { PlanStatus } from '@/lib/db/profile';
import { CancelPlanButton } from './CancelPlanButton';

/** "Mi plan" (F17 tarea 2): vigencia actual + cancelar si es Mensual. */
export function PlanSection({ status }: { status: PlanStatus }) {
  if (!status.plan) {
    return (
      <Card className="p-5">
        <p className="text-sm font-semibold text-text-primary">Mi plan</p>
        <p className="mt-1 text-sm text-text-secondary">
          Tienes el plan gratuito.{' '}
          <Link href="/precios" className="font-semibold text-brand-soft hover:underline">
            Ver planes
          </Link>
        </p>
      </Card>
    );
  }

  return (
    <Card className="space-y-2 p-5">
      <p className="text-sm font-semibold text-text-primary">Mi plan</p>
      <p className="font-display text-lg font-bold text-text-primary">{planLabel(status.plan)}</p>

      {status.isMonthly ? (
        status.cancelAtPeriodEnd ? (
          <p className="text-sm text-warning">
            Ya cancelaste tu renovación — tu acceso sigue activo hasta el final de tu periodo actual.
          </p>
        ) : (
          <>
            <p className="text-sm text-text-secondary">Se renueva automáticamente cada mes.</p>
            <CancelPlanButton />
          </>
        )
      ) : (
        status.expiresAt && (
          <p className="text-sm text-text-secondary">
            Vigente hasta{' '}
            {status.expiresAt.toLocaleDateString('es-MX', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
            .
          </p>
        )
      )}
    </Card>
  );
}
