import Link from 'next/link';
import { Tino } from '@/components/mascot/Tino';
import {
  CanceledView,
  FailedView,
  PendingView,
  SuccessView,
} from '@/components/checkout/CheckoutViews';
import { requireOnboarding } from '@/lib/auth/guards';
import { getSubscriptionByCheckoutSession } from '@/lib/db/billing';
import { getHostedVoucherUrl } from '@/lib/stripe/voucher';

/**
 * Pantalla de resultado del checkout (F8). Punto CRÍTICO: aterrizar aquí NO
 * otorga acceso. La página solo LEE el estado real de la Subscription (que el
 * webhook actualiza) y muestra la vista que corresponda:
 *   ACTIVE  → éxito (el webhook ya activó el plan)
 *   PENDING → pago pendiente OXXO/SPEI (con comprobante y estado en vivo)
 *   FAILED  → pago fallido, con opción de reintentar
 * Si el usuario canceló en Stripe (`?canceled=1`) y aún no hay pago, se muestra
 * la vista de cancelado.
 */
export const dynamic = 'force-dynamic';

export const metadata = { title: 'Resultado de tu compra' };

export default async function CheckoutResultadoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { profile } = await requireOnboarding();
  const sp = await searchParams;

  const sessionId = typeof sp.session_id === 'string' ? sp.session_id : null;
  const canceled = sp.canceled === '1';

  if (!sessionId) {
    return <ResultNotice message="No encontramos tu sesión de pago." />;
  }

  const subscription = await getSubscriptionByCheckoutSession(sessionId, profile.id);
  if (!subscription) {
    return <ResultNotice message="No encontramos esta compra en tu cuenta." />;
  }

  if (subscription.status === 'ACTIVE') {
    return <SuccessView subscription={subscription} />;
  }

  if (subscription.status === 'FAILED') {
    return <FailedView plan={subscription.plan} />;
  }

  if (subscription.status === 'CANCELED') {
    return <CanceledView plan={subscription.plan} />;
  }

  // PENDING: si el usuario canceló en Stripe, la fila queda PENDING sin pago →
  // mostramos "cancelado"; si hay un pago asíncrono en curso, la vista pendiente.
  if (canceled && subscription.payments.length === 0) {
    return <CanceledView plan={subscription.plan} />;
  }

  const voucherUrl = await getHostedVoucherUrl(sessionId);
  return <PendingView subscription={subscription} voucherUrl={voucherUrl} />;
}

function ResultNotice({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      <Tino state="attentive" size={80} />
      <p className="max-w-sm text-sm text-text-secondary">{message}</p>
      <Link href="/app" className="text-sm font-semibold text-brand-soft hover:underline">
        Volver a mi tablero
      </Link>
    </div>
  );
}
