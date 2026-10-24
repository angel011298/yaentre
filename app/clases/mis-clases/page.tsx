import Link from 'next/link';
import { StudentClassActions } from '@/components/classes/StudentClassActions';
import { requireUser } from '@/lib/auth/guards';
import { listStudentClasses } from '@/lib/db/classes';
import { formatMexicoDateTime, formatMxnShort } from '@/lib/format/mx';
import { LEVEL_LABELS } from '@/lib/teachers/level-engine';
import { subjectLabel, TRACK_LABELS } from '@/lib/teachers/subject-catalog';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Mis clases' };

function statusLabel(c: { status: string; paidAt: Date | null; holdExpiresAt: Date | null; cancellationReason: string | null }, now: number): string {
  if (c.status === 'PENDING_PAYMENT') {
    return c.holdExpiresAt && c.holdExpiresAt.getTime() <= now ? 'Pago no completado' : 'Confirmando tu pago';
  }
  if (c.status === 'CANCELLED') {
    if (!c.paidAt) return 'Pago no completado';
    return c.cancellationReason === 'slot_taken_after_payment' ? 'Cancelada: el horario ya no estaba libre (reembolso)' : 'Cancelada (reembolso)';
  }
  const map: Record<string, string> = {
    BOOKED: 'Reservada',
    CONFIRMED: 'Confirmada',
    IN_PROGRESS: 'En curso',
    COMPLETED: 'Impartida',
    NO_SHOW_TEACHER: 'El profesor no se presentó',
    NO_SHOW_STUDENT: 'No te presentaste',
    DISPUTED: 'En revisión',
  };
  return map[c.status] ?? c.status;
}

/** G103 — clases del alumno: próximas e historial, con cancelación sin costo hasta 24 h antes. */
export default async function MisClasesPage() {
  const { profile } = await requireUser();
  const classes = await listStudentClasses(profile.id);
  const now = new Date().getTime();
  const upcoming = classes.filter((c) => ['BOOKED', 'CONFIRMED', 'PENDING_PAYMENT'].includes(c.status) && c.scheduledAt.getTime() > now);
  const past = classes.filter((c) => !upcoming.includes(c));

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-text-primary">Mis clases</h1>
      {classes.length === 0 && (
        <p className="rounded-lg border border-border-subtle bg-surface p-4 text-sm text-text-secondary">
          Todavía no has reservado clases.{' '}
          <Link href="/clases" className="font-semibold text-brand-soft hover:underline">
            Buscar profesor
          </Link>
        </p>
      )}
      {upcoming.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-display text-lg font-bold text-text-primary">Próximas</h2>
          <ul className="space-y-2">
            {upcoming.map((c) => (
              <li key={c.id} className="flex flex-col gap-2 rounded-lg border border-border-subtle bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm">
                  <p className="font-semibold text-text-primary">
                    {formatMexicoDateTime(c.scheduledAt)} · {c.durationMinutes} min
                  </p>
                  <p className="text-text-secondary">
                    {subjectLabel(c.subjectKey)} con {c.teacher.displayName} ({LEVEL_LABELS[c.teacher.level]}) · {formatMxnShort(c.finalTariffCents)}
                  </p>
                  <p className="text-xs text-text-muted">
                    {TRACK_LABELS[c.track]} · {statusLabel(c, now)}
                  </p>
                </div>
                {(c.status === 'BOOKED' || c.status === 'CONFIRMED') && (
                  <StudentClassActions
                    classSessionId={c.id}
                    canCancel={c.scheduledAt.getTime() - now >= 24 * 3_600_000}
                  />
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
      {past.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-display text-lg font-bold text-text-primary">Historial</h2>
          <ul className="divide-y divide-border-subtle rounded-lg border border-border-subtle bg-surface">
            {past.map((c) => (
              <li key={c.id} className="p-3 text-sm">
                <span className="font-semibold text-text-primary">{formatMexicoDateTime(c.scheduledAt)}</span>
                <span className="text-text-secondary">
                  {' '}
                  · {subjectLabel(c.subjectKey)} · {c.teacher.displayName} · {formatMxnShort(c.finalTariffCents)}
                </span>
                <span className="block text-xs text-text-muted">{statusLabel(c, now)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
