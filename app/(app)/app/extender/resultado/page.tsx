import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { StatusPoller } from '@/components/checkout/StatusPoller';
import { requireUser } from '@/lib/auth/guards';
import { getSubscriptionForExtensionResult } from '@/lib/db/access-extension';
import { formatMexicoDate } from '@/lib/format/mx';
import { readOwnCheckoutSession } from '@/lib/stripe/session-readback';

/**
 * G103 — resultado de la compra de la extensión. Solo LEE: la vigencia nueva
 * la escribe el webhook. Mientras Stripe no confirme, la pantalla se refresca
 * sola (`StatusPoller`) y dice la verdad: «procesando» o «pendiente de pago».
 */
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Extensión de tu acceso' };

export default async function ExtenderResultadoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { profile } = await requireUser();
  const sp = await searchParams;
  const sessionId = typeof sp.session_id === 'string' ? sp.session_id : '';

  const session = sessionId ? await readOwnCheckoutSession(sessionId, profile.id, 'access_extension') : null;
  if (!session) {
    return <Notice title="No encontramos tu pago" body="Si ya pagaste, tu vigencia se actualiza en cuanto se confirme." />;
  }

  const sub = await getSubscriptionForExtensionResult(session.metadata.subscriptionId ?? '', profile.id);
  const consentAt = session.metadata.consentAt ? Date.parse(session.metadata.consentAt) : NaN;
  const applied = Boolean(sub?.extendedAt && !Number.isNaN(consentAt) && sub.extendedAt.getTime() >= consentAt);

  if (applied && sub?.expiresAt) {
    return (
      <Notice
        title="¡Listo! Extendimos tu acceso"
        body={`Tu acceso ahora está vigente hasta el ${formatMexicoDate(sub.expiresAt)}. Tu progreso sigue exactamente donde lo dejaste.`}
        tone="success"
      />
    );
  }

  if (session.paymentStatus === 'unpaid' && session.status === 'complete') {
    return (
      <>
        <StatusPoller />
        <Notice
          title="Tu pago está pendiente"
          body="Cuando se confirme tu pago en OXXO o por SPEI, sumamos los 6 meses automáticamente y te avisamos."
          voucherUrl={session.voucherUrl}
        />
      </>
    );
  }

  if (session.paymentStatus === 'paid') {
    return (
      <>
        <StatusPoller intervalMs={4000} />
        <Notice title="Confirmando tu pago…" body="Esto tarda unos segundos. No cierres esta pantalla." />
      </>
    );
  }

  return <Notice title="El pago no se completó" body="Tu vigencia no cambió. Puedes intentarlo de nuevo." retry />;
}

function Notice({
  title,
  body,
  tone,
  voucherUrl,
  retry,
}: {
  title: string;
  body: string;
  tone?: 'success';
  voucherUrl?: string | null;
  retry?: boolean;
}) {
  return (
    <div className="mx-auto max-w-xl">
      <Card className="space-y-3 p-6" role="status" aria-live="polite">
        <h1 className={`font-display text-xl font-bold ${tone === 'success' ? 'text-success' : 'text-text-primary'}`}>
          {title}
        </h1>
        <p className="text-sm text-text-secondary">{body}</p>
        <div className="flex flex-wrap gap-3 pt-1">
          {voucherUrl && (
            <a
              href={voucherUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-touch items-center text-sm font-semibold text-brand-soft hover:underline"
            >
              Ver mi comprobante de pago
            </a>
          )}
          {retry && (
            <Link href="/app/extender" className="inline-flex min-h-touch items-center text-sm font-semibold text-brand-soft hover:underline">
              Intentar de nuevo
            </Link>
          )}
          <Link href="/app" className="inline-flex min-h-touch items-center text-sm font-semibold text-text-secondary hover:underline">
            Volver a mi tablero
          </Link>
        </div>
      </Card>
    </div>
  );
}
