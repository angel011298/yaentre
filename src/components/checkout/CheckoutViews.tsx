import Link from 'next/link';
import type { PaymentMethod, SubscriptionPlan } from '@prisma/client';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Tino } from '@/components/mascot/Tino';
import type { SubscriptionForResult } from '@/lib/db/billing';
import { RetryButton } from './RetryButton';
import { StatusPoller } from './StatusPoller';

const PLAN_DISPLAY: Record<SubscriptionPlan, string> = {
  MONTHLY: 'Plan Mensual',
  SEASON_PASS: 'Pase de Temporada',
  PREMIUM: 'Premium Garantía',
};

const METHOD_DISPLAY: Record<PaymentMethod, string> = {
  CARD: 'tarjeta',
  OXXO: 'OXXO',
  SPEI: 'transferencia SPEI',
};

function formatMxn(cents: number): string {
  return (cents / 100).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

/** Monto pagado, si hay un Payment registrado. */
function AmountLine({ subscription }: { subscription: SubscriptionForResult }) {
  const amount = subscription.payments[0]?.amountMxn;
  if (amount == null) return null;
  return <p className="text-sm text-text-muted">Pagaste {formatMxn(amount)}.</p>;
}

/** Éxito: el webhook YA confirmó el pago y activó el acceso. */
export function SuccessView({ subscription }: { subscription: SubscriptionForResult }) {
  return (
    <div className="flex flex-col items-center gap-5 py-8 text-center">
      <Tino state="celebrating" size={96} />
      <div className="space-y-1">
        <h1 className="font-display text-2xl font-bold text-text-primary">
          ¡Ya eres parte de Acierta!
        </h1>
        <p className="max-w-sm text-sm text-text-secondary">
          Tu {PLAN_DISPLAY[subscription.plan]} está activo. Desbloqueaste los simulacros
          ilimitados, la resolución por capas y tu Aciertómetro. Vamos por esa carrera.
        </p>
        <AmountLine subscription={subscription} />
      </div>
      <Link href="/app">
        <Button variant="primary">Ir a mi tablero</Button>
      </Link>
    </div>
  );
}

/** Pendiente (OXXO/SPEI): voucher + estado en vivo. Sin acceso hasta confirmar. */
export function PendingView({
  subscription,
  voucherUrl,
}: {
  subscription: SubscriptionForResult;
  voucherUrl: string | null;
}) {
  const method = subscription.payments[0]?.method ?? 'OXXO';

  return (
    <div className="flex flex-col items-center gap-5 py-8 text-center">
      <StatusPoller />
      <Tino state="encouraging" size={88} />
      <div className="space-y-1">
        <h1 className="font-display text-2xl font-bold text-text-primary">Tu pago está pendiente</h1>
        <p className="max-w-sm text-sm text-text-secondary">
          Generamos tu {method === 'SPEI' ? 'CLABE de transferencia' : 'ficha de pago'} para pagar
          con {METHOD_DISPLAY[method]}. En cuanto se confirme el pago, tu acceso se desbloquea
          solo — no necesitas hacer nada más aquí.
        </p>
      </div>

      <Card className="w-full max-w-sm space-y-3 p-5">
        <div className="flex items-center justify-center gap-2 text-sm text-text-secondary">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-warning" />
          Esperando confirmación del pago
        </div>
        {voucherUrl && (
          <a href={voucherUrl} target="_blank" rel="noopener noreferrer" className="block">
            <Button variant="secondary" className="w-full">
              Ver mi {method === 'SPEI' ? 'CLABE' : 'ficha de pago'}
            </Button>
          </a>
        )}
        <p className="text-xs text-text-muted">
          {method === 'SPEI'
            ? 'La transferencia SPEI suele confirmarse en menos de 24 horas.'
            : 'El pago en OXXO suele confirmarse en menos de 3 horas.'}
        </p>
      </Card>

      <Link href="/app" className="text-sm font-semibold text-brand-soft hover:underline">
        Seguir estudiando mientras tanto
      </Link>
    </div>
  );
}

/** Fallido: pago asíncrono no confirmado a tiempo o rechazado. */
export function FailedView({ plan }: { plan: SubscriptionPlan }) {
  return (
    <div className="flex flex-col items-center gap-5 py-8 text-center">
      <Tino state="encouraging" size={88} />
      <div className="space-y-1">
        <h1 className="font-display text-2xl font-bold text-text-primary">El pago no se completó</h1>
        <p className="max-w-sm text-sm text-text-secondary">
          Tu {PLAN_DISPLAY[plan]} no se activó porque el pago no se confirmó. Puedes intentarlo de
          nuevo con otro método cuando quieras.
        </p>
      </div>
      <RetryButton plan={plan} />
      <Link href="/app" className="text-sm font-semibold text-brand-soft hover:underline">
        Volver a mi tablero
      </Link>
    </div>
  );
}

/** Cancelado: el usuario salió del Checkout sin pagar. */
export function CanceledView({ plan }: { plan: SubscriptionPlan }) {
  return (
    <div className="flex flex-col items-center gap-5 py-8 text-center">
      <Tino state="attentive" size={88} />
      <div className="space-y-1">
        <h1 className="font-display text-2xl font-bold text-text-primary">Cancelaste el pago</h1>
        <p className="max-w-sm text-sm text-text-secondary">
          No se hizo ningún cargo. Tu {PLAN_DISPLAY[plan]} sigue disponible cuando quieras
          continuar.
        </p>
      </div>
      <RetryButton plan={plan} />
      <Link href="/app" className="text-sm font-semibold text-brand-soft hover:underline">
        Volver a mi tablero
      </Link>
    </div>
  );
}
