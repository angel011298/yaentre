import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { ExtendAccessForm } from '@/components/subscription/ExtendAccessForm';
import { requireUser } from '@/lib/auth/guards';
import { loadAccessSummary } from '@/lib/db/access-summary';
import { formatMexicoDate, formatMxnShort } from '@/lib/format/mx';
import { planLabel } from '@/lib/stripe/pricing';
import { isSalesOpen } from '@/lib/stripe/sales-gate';
import { EXTENSION_DENIAL_MESSAGES, EXTENSION_IMMEDIATE_ACCESS_CONSENT } from '@/lib/subscriptions/extension';

/**
 * G103 — compra de la extensión de 6 meses (spec de temporalidad §3.4).
 * Solo informa y lanza el checkout: la vigencia cambia únicamente cuando el
 * webhook confirma el pago. Pantalla de pago: sin mascota (docs/marca).
 */
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Extender mi acceso' };

export default async function ExtenderPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { profile } = await requireUser();
  const sp = await searchParams;
  const summary = await loadAccessSummary(profile.id, new Date());
  const salesOpen = isSalesOpen();
  const extension = summary.extension;

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="font-display text-2xl font-bold text-text-primary">Extender mi acceso</h1>

      {sp.cancelado === '1' && (
        <p role="status" className="rounded-md border border-border-subtle bg-surface p-3 text-sm text-text-secondary">
          Cancelaste el pago. Tu vigencia no cambió.
        </p>
      )}

      {!extension.ok || !summary.plan || !summary.expiresAt ? (
        <Card className="space-y-3 p-5">
          <p className="text-sm text-text-secondary">
            {EXTENSION_DENIAL_MESSAGES[extension.ok ? 'NO_PLAN' : extension.reason]}
          </p>
          <Link href="/precios" className="text-sm font-semibold text-brand-soft hover:underline">
            Ver planes
          </Link>
        </Card>
      ) : (
        <Card className="space-y-4 p-5">
          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-text-muted">Plan</dt>
              <dd className="font-semibold text-text-primary">{planLabel(summary.plan)}</dd>
            </div>
            <div>
              <dt className="text-text-muted">{summary.accessStatus === 'GRACE' ? 'Expiró el' : 'Vigente hasta'}</dt>
              <dd className="font-semibold text-text-primary">{formatMexicoDate(summary.expiresAt)}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Con la extensión, vigente hasta</dt>
              <dd className="font-semibold text-text-primary">{formatMexicoDate(extension.newExpiresAt)}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Precio (IVA incluido)</dt>
              <dd className="font-display text-xl font-bold text-text-primary">
                {formatMxnShort(extension.priceCents)}
              </dd>
            </div>
          </dl>
          <p className="text-xs text-text-muted">
            Precio fijo: no depende de la temporada. Los 6 meses se suman a tu vigencia actual
            {summary.accessStatus === 'GRACE' ? ', contando desde la fecha en que expiró.' : '.'}
          </p>
          <ExtendAccessForm
            priceLabel={formatMxnShort(extension.priceCents)}
            consentText={EXTENSION_IMMEDIATE_ACCESS_CONSENT.text}
            salesOpen={salesOpen}
          />
        </Card>
      )}
    </div>
  );
}
