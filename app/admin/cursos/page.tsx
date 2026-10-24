import Link from 'next/link';
import { getAdminContext } from '@/lib/admin/context';
import { listCoursesForAdmin } from '@/lib/db/courses';
import { formatMexicoDate, formatMxnShort } from '@/lib/format/mx';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Cursos' };

const STATUS: Record<string, string> = {
  IN_REVIEW: 'En revisión',
  DRAFT: 'Borrador',
  PUBLISHED: 'Publicado',
  ARCHIVED: 'Archivado',
  REJECTED: 'Rechazado',
};

/** G103 — cursos por estado; los que esperan revisión primero (spec §2.6 paso 6). */
export default async function AdminCursosPage() {
  await getAdminContext();
  const courses = await listCoursesForAdmin();
  const pending = courses.filter((c) => c.status === 'IN_REVIEW');
  const rest = courses.filter((c) => c.status !== 'IN_REVIEW');

  const Row = ({ c }: { c: (typeof courses)[number] }) => (
    <li>
      <Link href={`/admin/cursos/${c.id}`} className="flex flex-col gap-1 rounded-lg border border-border-subtle bg-surface p-3 hover:bg-elevated sm:flex-row sm:items-center sm:justify-between">
        <span className="text-sm">
          <span className="block font-semibold text-text-primary">{c.title}</span>
          <span className="text-text-muted">
            {c.teacher.displayName} · {c.totalLessons} lecciones · {c.totalDurationMinutes} min · {c.isFree ? 'Gratis' : formatMxnShort(c.priceCents)}
            {c.submittedAt ? ` · enviado el ${formatMexicoDate(c.submittedAt)}` : ''}
          </span>
        </span>
        <span className="text-xs font-semibold text-text-secondary">{STATUS[c.status] ?? c.status}</span>
      </Link>
    </li>
  );

  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl font-bold text-text-primary">Cursos</h1>
      <section className="space-y-2">
        <h2 className="font-display text-lg font-bold text-text-primary">Por revisar ({pending.length})</h2>
        {pending.length === 0 ? <p className="text-sm text-text-muted">No hay cursos esperando revisión.</p> : <ul className="space-y-2">{pending.map((c) => <Row key={c.id} c={c} />)}</ul>}
      </section>
      {rest.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-display text-lg font-bold text-text-primary">Todos</h2>
          <ul className="space-y-2">{rest.map((c) => <Row key={c.id} c={c} />)}</ul>
        </section>
      )}
    </div>
  );
}
