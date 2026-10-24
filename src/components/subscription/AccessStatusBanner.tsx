import { LinkButton } from '@/components/ui/LinkButton';
import { Icon } from '@/components/ui/Icon';
import { formatMexicoDate, formatMxnShort } from '@/lib/format/mx';
import type { AccessSummary } from '@/lib/db/access-summary';
import { DismissibleNotice } from './DismissibleNotice';

/**
 * G103 — avisos de vigencia dentro de la app (spec de temporalidad §3.4).
 *
 *  - 30 días o menos antes de vencer: aviso descartable («Ahora no»).
 *  - En la gracia: aviso fijo, con la fecha en que se pierde el acceso.
 *  - Gracia terminada: aviso de que el progreso sigue guardado.
 *
 * Server Component: las fechas se formatean en hora de México en el servidor
 * (sin `Date.now()` en el cliente → sin desajuste de hidratación). El texto
 * nunca dice «sin reembolsos» ni promete nada sobre el examen.
 */
export function AccessStatusBanner({ summary }: { summary: AccessSummary }) {
  const { accessStatus, expiresAt, graceEndsAt, extension, daysLeft } = summary;
  if (!expiresAt) return null;

  const price = extension.ok ? formatMxnShort(extension.priceCents) : null;

  if (accessStatus === 'ACTIVE' && daysLeft !== null && daysLeft <= 30 && extension.ok) {
    return (
      <DismissibleNotice storageKey={`yaentre-aviso-vigencia-${expiresAt.toISOString().slice(0, 10)}`}>
        <div
          role="status"
          className="flex flex-col gap-3 rounded-lg border border-warning/40 bg-warning-subtle p-4 sm:flex-row sm:items-center"
        >
          <Icon name="clock" className="h-5 w-5 shrink-0 text-text-primary" />
          <div className="min-w-0 flex-1 text-sm text-text-primary">
            <p className="font-semibold">Tu acceso a YaEntre expira el {formatMexicoDate(expiresAt)}.</p>
            <p className="text-text-secondary">
              Extiende 6 meses más por {price} y sigue practicando para la próxima convocatoria.
            </p>
          </div>
          <LinkButton href="/app/extender" variant="primary" className="shrink-0">
            Extender acceso — {price}
          </LinkButton>
        </div>
      </DismissibleNotice>
    );
  }

  if (accessStatus === 'GRACE' && graceEndsAt) {
    return (
      <div
        role="alert"
        className="flex flex-col gap-3 rounded-lg border border-danger/40 bg-danger-subtle p-4 sm:flex-row sm:items-center"
      >
        <Icon name="alert" className="h-5 w-5 shrink-0 text-text-primary" />
        <div className="min-w-0 flex-1 text-sm text-text-primary">
          <p className="font-semibold">Tu acceso expiró el {formatMexicoDate(expiresAt)}.</p>
          <p className="text-text-secondary">
            Tienes hasta el {formatMexicoDate(graceEndsAt)} para extender. Después de esa fecha
            perderás el acceso a simulacros y contenido de pago. Tu progreso y tus estadísticas se
            conservan.
          </p>
        </div>
        {extension.ok && (
          <LinkButton href="/app/extender" variant="primary" className="shrink-0">
            Extender 6 meses — {price}
          </LinkButton>
        )}
      </div>
    );
  }

  if (accessStatus === 'EXPIRED') {
    return (
      <div role="status" className="flex flex-col gap-3 rounded-lg border border-border-subtle bg-surface p-4 sm:flex-row sm:items-center">
        <Icon name="info" className="h-5 w-5 shrink-0 text-text-secondary" />
        <p className="min-w-0 flex-1 text-sm text-text-secondary">
          Tu acceso de pago terminó. Tu progreso, tu historial y tu Entrómetro siguen guardados.
        </p>
        <LinkButton href="/precios" variant="secondary" className="shrink-0">
          Ver planes
        </LinkButton>
      </div>
    );
  }

  return null;
}
