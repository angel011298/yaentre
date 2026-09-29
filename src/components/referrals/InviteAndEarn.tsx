import Image from 'next/image';
import { Card } from '@/components/ui/Card';
import { CopyLinkButton } from './CopyLinkButton';
import { formatMexicoDate } from '@/lib/format/dates';
import { formatMxnExact } from '@/lib/format/money';
import { REFERRAL_COMMISSION_MXN_CENTS, ANTIFRAUD_HOLD_DAYS, CREDIT_VALIDITY_MONTHS } from '@/lib/referrals/commission';
import { describeSale, type SaleTone } from '@/lib/referrals/presentation';
import type { ReferralHistoryItem, ReferralOverview } from '@/lib/db/referrals';

const TONE_CLASS: Record<SaleTone, string> = {
  success: 'text-success',
  pending: 'text-text-secondary',
  review: 'text-info',
  reversed: 'text-text-muted',
};

/**
 * «Invita y gana» (spec §4): el código, el enlace, el QR, el crédito y el historial.
 * Server Component — solo el botón de copiar es una isla de cliente.
 *
 * Lo que NO aparece, a propósito: nombres de compradores (minimización de datos:
 * muchos son menores) y motivos de antifraude. «Crédito», nunca «dinero»: el Nivel
 * 1 no se paga en efectivo ni siquiera a un adulto.
 */
export function InviteAndEarn({
  overview,
  history,
  url,
  now,
}: {
  overview: ReferralOverview;
  history: ReferralHistoryItem[];
  url: string | null;
  now: Date;
}) {
  const code = overview.code;
  const comision = formatMxnExact(REFERRAL_COMMISSION_MXN_CENTS);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold">Invita y gana</h1>
        <p className="mt-1 text-text-secondary">
          Comparte tu enlace. Cuando alguien que llegó por él compre Básico o Premium, ganas {comision} de crédito.
        </p>
      </div>

      {!code || !url ? (
        <Card className="p-6 text-text-secondary">
          Todavía no pudimos preparar tu código. Recarga la página en un momento; si sigue igual, escríbenos.
        </Card>
      ) : (
        <Card className="space-y-4 p-6">
          {!code.active && (
            <p role="alert" className="rounded-md bg-elevated p-3 text-sm text-danger">
              Tu código está suspendido, así que ya no suma referidos nuevos. Si crees que es un error, escríbenos.
            </p>
          )}
          <div className="flex flex-wrap items-center gap-6">
            <Image
              src={`/api/referrals/qr/${code.code}`}
              alt={`Código QR de tu enlace de referido ${code.code}`}
              width={160}
              height={160}
              unoptimized
              className="rounded-md border border-border-subtle bg-white"
            />
            <div className="min-w-0 flex-1 space-y-3">
              <div>
                <p className="text-sm text-text-secondary">Tu código</p>
                <p className="font-mono text-2xl font-bold tracking-widest">{code.code}</p>
              </div>
              <CopyLinkButton url={url} />
              <a
                href={`/api/referrals/qr/${code.code}?download=1`}
                download
                className="min-h-touch inline-flex items-center rounded-md border border-border-subtle px-4 text-sm font-medium hover:bg-elevated"
              >
                Descargar QR
              </a>
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-sm text-text-secondary">Crédito disponible</p>
          <p className="mt-1 font-mono text-2xl font-bold tabular-nums">{formatMxnExact(overview.balanceCents)}</p>
          <p className="mt-1 text-xs text-text-muted">
            {overview.nextExpiryAt ? `Vence el ${formatMexicoDate(overview.nextExpiryAt)}` : 'Sin crédito por ahora'}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-text-secondary">En verificación</p>
          <p className="mt-1 font-mono text-2xl font-bold tabular-nums">{formatMxnExact(overview.pendingCents)}</p>
          <p className="mt-1 text-xs text-text-muted">
            {overview.pendingCount} compra{overview.pendingCount === 1 ? '' : 's'} por acreditar
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-text-secondary">Referidos exitosos</p>
          <p className="mt-1 font-mono text-2xl font-bold tabular-nums">{overview.successfulCount}</p>
          <p className="mt-1 text-xs text-text-muted">Compras ya acreditadas</p>
        </Card>
      </div>

      <Card className="p-4">
        <h2 className="font-display text-lg font-semibold">Historial</h2>
        {history.length === 0 ? (
          <p className="mt-2 text-sm text-text-secondary">
            Aún no hay compras con tu enlace. Cuando las haya, aparecerán aquí.
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-border-subtle">
            {history.map((item) => {
              const view = describeSale(item, now);
              return (
                <li key={item.id} className="flex flex-wrap items-baseline justify-between gap-2 py-3">
                  <div>
                    <p className="text-sm font-medium">Compra del {formatMexicoDate(item.createdAt)}</p>
                    <p className="text-xs text-text-muted">{view.detail}</p>
                  </div>
                  <p className={`text-sm font-semibold ${TONE_CLASS[view.tone]}`}>
                    {view.label}
                    {view.tone !== 'reversed' && ` · ${formatMxnExact(item.commissionCents)}`}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card className="space-y-2 p-4 text-sm text-text-secondary">
        <h2 className="font-display text-lg font-semibold text-text-primary">Cómo funciona</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            El crédito se acredita {ANTIFRAUD_HOLD_DAYS} días después de la compra, si no hubo reembolso. Mientras tanto se
            ve «en verificación».
          </li>
          <li>
            Dura {CREDIT_VALIDITY_MONTHS} meses desde que se acredita y se aplica solo, al pagar tu próxima compra de Básico
            o Premium.
          </li>
          <li>Es crédito, no dinero: no se cambia por efectivo. Cada compra admite hasta un tope de crédito; si te sobra, queda para la siguiente.</li>
          <li>Invitarte a ti mismo (o con otro correo tuyo) no cuenta.</li>
          <li>Por privacidad, aquí no verás quién compró: solo la fecha.</li>
        </ul>
      </Card>
    </div>
  );
}
