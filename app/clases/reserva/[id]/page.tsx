import Link from 'next/link';
import { notFound } from 'next/navigation';
import { StatusPoller } from '@/components/checkout/StatusPoller';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { requireUserPage } from '@/lib/auth/guards';
import { getClassForStudent } from '@/lib/db/classes';
import { formatMexicoDateTime, formatMxnShort } from '@/lib/format/mx';
import { subjectLabel } from '@/lib/teachers/subject-catalog';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Tu reserva' };

/**
 * G103 — estado de una reserva tras pagar. Solo LEE: la reserva queda firme
 * cuando el webhook confirma el cobro. Mientras tanto la pantalla se refresca
 * sola. La clase solo se muestra a su alumno (`getClassForStudent` filtra por
 * el dueño de la sesión): un id ajeno responde 404 igual que uno que no existe.
 */
export default async function ReservaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { profile } = await requireUserPage('/clases/mis-clases');
  const { id } = await params;
  const sp = await searchParams;
  if (!/^c[a-z0-9]{20,40}$/.test(id)) notFound();
  const cls = await getClassForStudent(id, profile.id);
  if (!cls) notFound();

  const when = `${formatMexicoDateTime(cls.scheduledAt)} · ${cls.durationMinutes} min`;
  const what = `${subjectLabel(cls.subjectKey)} con ${cls.teacher.displayName} · ${formatMxnShort(cls.finalTariffCents)}`;
  const holdOpen = cls.status === 'PENDING_PAYMENT' && (!cls.holdExpiresAt || cls.holdExpiresAt.getTime() > new Date().getTime());

  let title: string;
  let body: string;
  let tone: 'ok' | 'wait' | 'bad';
  if (cls.paidAt && (cls.status === 'BOOKED' || cls.status === 'CONFIRMED' || cls.status === 'COMPLETED')) {
    title = '¡Clase reservada!';
    body = 'Te esperamos a la hora indicada. Puedes cancelar sin costo hasta 24 horas antes desde «Mis clases».';
    tone = 'ok';
  } else if (cls.cancellationReason === 'slot_taken_after_payment') {
    title = 'Ese horario ya no estaba disponible';
    body = 'Tu pago llegó cuando el horario ya se había ocupado. Te reembolsamos el 100 % a tu tarjeta.';
    tone = 'bad';
  } else if (holdOpen && sp.cancelado !== '1') {
    title = 'Confirmando tu pago…';
    body = 'Esto tarda unos segundos. No cierres esta pantalla.';
    tone = 'wait';
  } else {
    title = 'El pago no se completó';
    body = 'No se hizo ningún cargo y el horario quedó libre. Puedes elegir otro horario.';
    tone = 'bad';
  }

  return (
    <div className="mx-auto max-w-xl">
      {tone === 'wait' && <StatusPoller intervalMs={4000} />}
      <Card className="space-y-3 p-6" role="status" aria-live="polite">
        <p className="flex items-center gap-2 font-display text-xl font-bold text-text-primary">
          <Icon name={tone === 'ok' ? 'checkCircle' : tone === 'wait' ? 'clock' : 'info'} className="h-6 w-6" />
          {title}
        </p>
        <p className="text-sm font-semibold text-text-primary">{when}</p>
        <p className="text-sm text-text-secondary">{what}</p>
        <p className="text-sm text-text-secondary">{body}</p>
        <div className="flex flex-wrap gap-3 pt-1">
          <Link href="/clases/mis-clases" className="inline-flex min-h-touch items-center text-sm font-semibold text-brand-soft hover:underline">
            Ver mis clases
          </Link>
          {tone === 'bad' && (
            <Link href="/clases" className="inline-flex min-h-touch items-center text-sm font-semibold text-text-secondary hover:underline">
              Elegir otro horario
            </Link>
          )}
        </div>
      </Card>
    </div>
  );
}
