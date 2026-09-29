import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { SupportActions } from '@/components/staff/SupportActions';
import { ROLE_LABELS, roleHasCapability } from '@/lib/admin/capabilities';
import { requireCapability } from '@/lib/auth/guards';
import { formatMexicoDate } from '@/lib/format/dates';
import { formatMxnExact } from '@/lib/format/money';
import { planLabel } from '@/lib/stripe/pricing';
import { loadFichaForSupport } from '@/lib/support/service';
import { VALVE_REASON_LABEL } from '@/lib/support/valve';

export const metadata = { title: 'Ficha · Soporte' };

/**
 * Ficha de soporte de UNA cuenta. Lo que hace falta para atender la solicitud y
 * nada más: identidad, planes, lo cobrado y reembolsado, y la válvula. Ni
 * respuestas de examen, ni actividad de estudio, ni contraseñas. Abrirla deja una
 * fila en la bitácora (`support.ficha_viewed`) — el servicio la escribe.
 */
export default async function SupportFichaPage({ params }: { params: Promise<{ id: string }> }) {
  const { profile: actor } = await requireCapability('users.read');
  const { id } = await params;

  const result = await loadFichaForSupport({ userProfileId: id });
  if (!result.ok) {
    if (result.code === 'NOT_FOUND' || result.code === 'VALIDATION') notFound();
    return <Card className="p-6 text-danger">{result.message}</Card>;
  }
  const f = result.data;
  const canArco = roleHasCapability(actor.role, 'arco.handle');
  const canRefund = roleHasCapability(actor.role, 'refunds.issue');

  return (
    <div className="space-y-6">
      <Link href="/soporte" className="text-sm text-text-secondary underline">
        ← Volver a la búsqueda
      </Link>

      <Card className="space-y-1 p-5">
        <h1 className="font-display text-2xl font-bold">{f.email ?? 'Cuenta sin correo'}</h1>
        <p className="text-sm text-text-secondary">
          {f.displayName ?? 'sin nombre'} · {ROLE_LABELS[f.role] ?? f.role} · alta {formatMexicoDate(f.createdAt)}
          {f.lastSignInAt ? ` · última entrada ${formatMexicoDate(f.lastSignInAt)}` : ''} ·{' '}
          {f.emailVerified ? '✓ correo verificado' : '✗ correo sin verificar'}
        </p>
      </Card>

      <section className="space-y-3" aria-labelledby="planes">
        <h2 id="planes" className="font-display text-lg font-semibold">
          Planes
        </h2>
        {f.plans.length === 0 ? (
          <Card className="p-5 text-text-secondary">No tiene planes.</Card>
        ) : (
          f.plans.map((p) => (
            <Card key={p.id} className="space-y-3 p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-medium">
                  {planLabel(p.plan)} · {p.status}
                  {p.isComp ? ' · cortesía' : ''}
                </p>
                <p className="text-xs text-text-secondary">
                  {p.startedAt ? `desde ${formatMexicoDate(p.startedAt)}` : 'sin activar'}
                  {p.expiresAt ? ` · vigente hasta ${formatMexicoDate(p.expiresAt)}` : ''}
                </p>
              </div>
              <p className="text-sm text-text-secondary">
                Cobrado {formatMxnExact(p.paidCents)} · reembolsado {formatMxnExact(p.refundedCents)} · por reembolsar{' '}
                {formatMxnExact(p.refundableCents)}
              </p>
              {canRefund && !p.isComp && p.refundableCents > 0 && (
                <>
                  <p className="text-sm">
                    {p.valve.inside
                      ? '✓ Dentro de la válvula de 48 h: puedes reembolsarlo.'
                      : `✗ Fuera de la válvula (${VALVE_REASON_LABEL[p.valve.reason]}): lo decide el administrador maestro.`}
                  </p>
                  <SupportActions
                    kind="refund"
                    subscriptionId={p.id}
                    canRefund={p.valve.inside || actor.role === 'ADMIN'}
                    refundableLabel={formatMxnExact(p.refundableCents)}
                  />
                </>
              )}
            </Card>
          ))
        )}
      </section>

      {canArco && (
        <section className="space-y-3" aria-labelledby="arco">
          <h2 id="arco" className="font-display text-lg font-semibold">
            Derechos ARCO
          </h2>
          <Card className="space-y-3 p-4">
            <p className="text-sm text-text-secondary">
              <strong className="text-text-primary">Acceso.</strong> Descarga todos los datos de la persona en un archivo. La
              descarga queda en la bitácora antes de entregarse.
            </p>
            <a
              href={`/api/support/users/${f.id}/export`}
              className="min-h-touch inline-flex items-center rounded-md border border-border-subtle px-4 text-sm font-medium hover:bg-elevated"
            >
              Descargar datos (JSON)
            </a>
            <p className="pt-2 text-sm text-text-secondary">
              <strong className="text-text-primary">Oposición.</strong> Retira su consentimiento de correos promocionales.
            </p>
            <SupportActions kind="marketing" userProfileId={f.id} enabled={f.marketingEnabled} />
            <p className="text-xs text-text-muted">
              La rectificación y la cancelación (eliminar la cuenta) las hace la propia persona desde su perfil; hacerlas
              por un tercero exige verificar su identidad primero.
            </p>
          </Card>
        </section>
      )}
    </div>
  );
}
