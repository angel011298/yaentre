import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { LinkButton } from '@/components/ui/LinkButton';
import { planLabel } from '@/lib/stripe/pricing';
import type { PlanStatus } from '@/lib/db/profile';
import type { AccessSummary } from '@/lib/db/access-summary';
import { formatMexicoDate, formatMxnShort } from '@/lib/format/mx';
import { CancelPlanButton } from './CancelPlanButton';

/** "Mi plan" (F17 tarea 2): vigencia actual + cancelar si es Mensual.
 *  G103: vigencia de 12 meses, periodo de gracia y extensión de 6 meses. */
export function PlanSection({ status, access }: { status: PlanStatus; access?: AccessSummary }) {
  if (!status.plan) {
    return (
      <Card className="p-5">
        <p className="text-sm font-semibold text-text-primary">Mi plan</p>
        <p className="mt-1 text-sm text-text-secondary">
          {access?.accessStatus === 'EXPIRED'
            ? 'Tu acceso de pago terminó; tu progreso sigue guardado. '
            : 'Tienes el plan gratuito. '}
          <Link href="/precios" className="font-semibold text-brand-soft hover:underline">
            Ver planes
          </Link>
        </p>
      </Card>
    );
  }

  const inGrace = access?.accessStatus === 'GRACE';
  const extension = access?.extension;

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
          <>
            {inGrace && access?.graceEndsAt ? (
              <p className="text-sm text-text-primary">
                Tu acceso expiró el {formatMexicoDate(status.expiresAt)}. Tienes hasta el{' '}
                {formatMexicoDate(access.graceEndsAt)} para extenderlo.
              </p>
            ) : (
              <p className="text-sm text-text-secondary">
                Vigente hasta el {formatMexicoDate(status.expiresAt)}.
              </p>
            )}
            {extension?.ok && (
              <div className="pt-1">
                <LinkButton href="/app/extender" variant={inGrace ? 'primary' : 'secondary'}>
                  Extender 6 meses — {formatMxnShort(extension.priceCents)}
                </LinkButton>
              </div>
            )}
          </>
        )
      )}
    </Card>
  );
}
