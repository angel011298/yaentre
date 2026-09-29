import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { buttonClassName } from '@/components/ui/Button';
import { ClassBooking } from '@/components/classes/ClassBooking';
import { StudentClassActions } from '@/components/classes/StudentClassActions';
import { requireUser } from '@/lib/auth/guards';
import { formatClassWhen } from '@/lib/classes/format';
import { getActivePremium, listStudentClasses } from '@/lib/db/classes';
import { listDirectory } from '@/lib/db/teachers';
import { requiresTutorConsent } from '@/lib/legal/age';
import { isMarketplaceOpen } from '@/lib/marketplace/marketplace-gate';
import { formatMxnFromCents } from '@/lib/teachers/tariff';

export const metadata = { title: 'Mis clases' };
export const dynamic = 'force-dynamic';

const STATUS_TEXT: Record<string, string> = {
  PENDING_PAYMENT: 'Pago pendiente',
  BOOKED: 'Reservada',
  CONFIRMED: 'Confirmada por el profesor',
  IN_PROGRESS: 'En curso',
  COMPLETED: 'Impartida',
  CANCELLED: 'Cancelada',
  NO_SHOW_STUDENT: 'No asististe',
  NO_SHOW_TEACHER: 'El profesor no se presentó',
  DISPUTED: 'En revisión',
};

/**
 * Clases del alumno. El historial se ve siempre (aunque el marketplace se cierre:
 * hay que poder cancelar o calificar lo ya reservado); reservar exige el
 * interruptor abierto Y un Premium vigente. Ambos se vuelven a exigir en el
 * servidor: esta pantalla solo decide qué OFRECER.
 */
export default async function StudentClassesPage() {
  const { profile } = await requireUser();
  const now = new Date();
  const open = isMarketplaceOpen();

  const [classes, premium] = await Promise.all([listStudentClasses(profile.id, now), getActivePremium(profile.id, now)]);
  const directory = open && premium ? await listDirectory({}) : null;
  const isMinor = profile.birthDate ? requiresTutorConsent(profile.birthDate, now) : false;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Mis clases</h1>
        <p className="text-text-secondary">
          Clases en línea con profesores independientes verificados en YaEntre.
        </p>
      </div>

      <Card className="space-y-3 p-4">
        <h2 className="font-display text-lg font-semibold">Reservar una clase</h2>
        {!open ? (
          <p className="text-sm text-text-secondary">
            La reserva de clases con profesor todavía no está abierta. Cuando lo esté, la verás aquí.
          </p>
        ) : !premium ? (
          <div className="space-y-2">
            <p className="text-sm text-text-secondary">Las clases con profesor son parte del plan Premium.</p>
            <Link href="/paywall" className={buttonClassName('primary')}>
              Ver planes
            </Link>
          </div>
        ) : directory && directory.items.length > 0 ? (
          <ClassBooking teachers={directory.items} isMinor={isMinor} />
        ) : (
          <p className="text-sm text-text-secondary">Por ahora no hay profesores disponibles en el directorio.</p>
        )}
      </Card>

      <Card className="space-y-3 p-4">
        <h2 className="font-display text-lg font-semibold">Historial</h2>
        {classes.length === 0 ? (
          <p className="text-sm text-text-secondary">Todavía no has reservado clases.</p>
        ) : (
          classes.map((c) => (
            <div key={c.id} className="rounded-lg border border-border-subtle p-3">
              <p className="font-medium">
                {c.subjectLabel} con {c.teacher.publicName}
              </p>
              <p className="text-sm text-text-secondary">
                {formatClassWhen(c.scheduledAt)} · {c.durationMinutes} min · {formatMxnFromCents(c.priceCents)} ·{' '}
                {STATUS_TEXT[c.status]}
                {c.refundedCents > 0 ? ` · reembolsado ${formatMxnFromCents(c.refundedCents)}` : ''}
              </p>
              {c.joinUrl && (
                <a href={c.joinUrl} className="mt-1 inline-block text-sm font-medium text-brand hover:underline">
                  Entrar a la clase
                </a>
              )}
              {c.willBeRecorded && (
                <p className="text-xs text-text-muted">Esta clase se graba con el consentimiento registrado.</p>
              )}
              <StudentClassActions
                classId={c.id}
                canCancel={c.canCancel}
                canRate={c.canRate}
                lateCancel={c.scheduledAt.getTime() - now.getTime() < 24 * 3_600_000}
              />
            </div>
          ))
        )}
      </Card>
    </div>
  );
}
