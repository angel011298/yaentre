import { notFound } from 'next/navigation';
import { TeacherClassActions } from '@/components/teachers/TeacherClassActions';
import { listTeacherClasses } from '@/lib/db/classes';
import { formatMexicoDateTime, formatMxn } from '@/lib/format/mx';
import { readMarketplaceFlags } from '@/lib/marketplace/flags';
import { getTeacherPageContext } from '@/lib/teachers/guard';
import { subjectLabel, TRACK_LABELS } from '@/lib/teachers/subject-catalog';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Mis clases' };

const STATUS: Record<string, string> = {
  BOOKED: 'Reservada',
  CONFIRMED: 'Confirmada',
  IN_PROGRESS: 'En curso',
  COMPLETED: 'Impartida',
  CANCELLED: 'Cancelada',
  NO_SHOW_TEACHER: 'No te presentaste',
  NO_SHOW_STUDENT: 'El alumno no se presentó',
  DISPUTED: 'En revisión',
};

/** G103 — clases del profesor. Recibe el 75 % de cada clase impartida. */
export default async function ProfesorClasesPage() {
  const { teacher } = await getTeacherPageContext('/profesor/clases');
  if (!readMarketplaceFlags().liveClasses) notFound();
  const classes = await listTeacherClasses(teacher.id);
  const now = new Date().getTime();

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold text-text-primary">Mis clases</h1>
      {classes.length === 0 ? (
        <p className="rounded-lg border border-border-subtle bg-surface p-4 text-sm text-text-secondary">
          Cuando un alumno reserve una clase contigo aparecerá aquí.
        </p>
      ) : (
        <ul className="space-y-2">
          {classes.map((c) => {
            const ended = c.scheduledAt.getTime() + c.durationMinutes * 60_000 <= now;
            const active = c.status === 'BOOKED' || c.status === 'CONFIRMED';
            return (
              <li key={c.id} className="flex flex-col gap-2 rounded-lg border border-border-subtle bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm">
                  <p className="font-semibold text-text-primary">{formatMexicoDateTime(c.scheduledAt)} · {c.durationMinutes} min</p>
                  <p className="text-text-secondary">
                    {subjectLabel(c.subjectKey)} · {TRACK_LABELS[c.track]} · Tu parte: {formatMxn(c.teacherPayCents)}
                  </p>
                  <p className="text-xs text-text-muted">{STATUS[c.status] ?? c.status}</p>
                </div>
                {active && (
                  <TeacherClassActions classSessionId={c.id} canComplete={ended && teacher.status === 'ACTIVE'} canCancel={!ended && c.scheduledAt.getTime() > now} />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
