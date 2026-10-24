import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { CsfUploadForm } from '@/components/teachers/CsfUploadForm';
import { TeacherProfileForm } from '@/components/teachers/TeacherProfileForm';
import { listTeacherClasses } from '@/lib/db/classes';
import { formatMexicoDateTime, maskTail } from '@/lib/format/mx';
import { readMarketplaceFlags } from '@/lib/marketplace/flags';
import { getTeacherPageContext } from '@/lib/teachers/guard';
import { LEVEL_LABELS } from '@/lib/teachers/level-engine';
import { subjectLabel, TRACK_LABELS } from '@/lib/teachers/subject-catalog';

export const dynamic = 'force-dynamic';

const STATUS_COPY: Record<string, { title: string; body: string }> = {
  PENDING_REVIEW: {
    title: 'Tu solicitud está en revisión',
    body: 'Revisamos tus datos y te avisamos por correo. Mientras tanto ya puedes preparar tu disponibilidad.',
  },
  ACTIVE: {
    title: 'Tu perfil está activo',
    body: 'Apareces en el directorio de profesores independientes verificados en YaEntre.',
  },
  REJECTED: {
    title: 'Tu solicitud no fue aprobada',
    body: 'Revisa el motivo, corrige tus datos y vuelve a enviarla.',
  },
  SUSPENDED: { title: 'Tu perfil está suspendido', body: 'No apareces en el directorio. Escríbenos si crees que es un error.' },
  INACTIVE: { title: 'Tu perfil está inactivo', body: 'No apareces en el directorio por ahora.' },
};

/** G103 — inicio del panel del profesor. Datos bancarios y fiscales SIEMPRE enmascarados. */
export default async function ProfesorHomePage() {
  const { teacher } = await getTeacherPageContext('/profesor');
  const flags = readMarketplaceFlags();
  const classes = flags.liveClasses ? await listTeacherClasses(teacher.id) : [];
  const now = new Date().getTime();
  const upcoming = classes
    .filter((c) => ['BOOKED', 'CONFIRMED'].includes(c.status) && c.scheduledAt.getTime() > now)
    .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())
    .slice(0, 5);
  const status = STATUS_COPY[teacher.status] ?? STATUS_COPY.INACTIVE;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-text-primary">Hola, {teacher.displayName}</h1>
        <p className="text-sm text-text-secondary">
          Nivel {LEVEL_LABELS[teacher.level]} · {teacher.totalClassesGiven} clases impartidas
          {teacher.totalRatings > 0 ? ` · ${teacher.averageRating.toFixed(1)} de 5 estrellas` : ''}
        </p>
      </div>

      <Card className="space-y-2 p-5" role="status">
        <p className="flex items-center gap-2 font-semibold text-text-primary">
          <Icon name={teacher.status === 'ACTIVE' ? 'checkCircle' : 'info'} className="h-5 w-5" />
          {status.title}
        </p>
        <p className="text-sm text-text-secondary">{status.body}</p>
        {teacher.reviewNote && teacher.status !== 'ACTIVE' && (
          <p className="whitespace-pre-wrap text-sm text-text-primary">Motivo: {teacher.reviewNote}</p>
        )}
        {teacher.status === 'REJECTED' && (
          <Link href="/profesor/solicitud" className="inline-flex min-h-touch items-center text-sm font-semibold text-brand-fg hover:underline">
            Corregir y volver a enviar
          </Link>
        )}
      </Card>

      {flags.liveClasses && (
        <section className="space-y-3">
          <h2 className="font-display text-lg font-bold text-text-primary">Próximas clases</h2>
          {upcoming.length === 0 ? (
            <p className="rounded-lg border border-border-subtle bg-surface p-4 text-sm text-text-secondary">
              Todavía no tienes clases reservadas.{' '}
              <Link href="/profesor/disponibilidad" className="font-semibold text-brand-fg hover:underline">
                Revisa tu disponibilidad
              </Link>
              .
            </p>
          ) : (
            <ul className="space-y-2">
              {upcoming.map((c) => (
                <li key={c.id} className="rounded-lg border border-border-subtle bg-surface p-3 text-sm">
                  <span className="font-semibold text-text-primary">{formatMexicoDateTime(c.scheduledAt)}</span>
                  <span className="text-text-secondary"> · {subjectLabel(c.subjectKey)} · {c.durationMinutes} min</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="grid gap-4 md:grid-cols-2">
        <Card className="space-y-3 p-5">
          <h2 className="font-display text-lg font-bold text-text-primary">Materias</h2>
          {(['ADMISION', 'REGULARIZACION'] as const).map((track) => {
            const list = teacher.subjects.filter((s) => s.track === track);
            if (list.length === 0) return null;
            return (
              <div key={track}>
                <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{TRACK_LABELS[track]}</p>
                <p className="text-sm text-text-primary">{list.map((s) => subjectLabel(s.subjectKey)).join(', ')}</p>
              </div>
            );
          })}
        </Card>

        <Card className="space-y-2 p-5">
          <h2 className="font-display text-lg font-bold text-text-primary">Datos de liquidación</h2>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
            <dt className="text-text-muted">CLABE</dt>
            <dd className="font-mono text-text-primary">{maskTail(teacher.clabe)}</dd>
            <dt className="text-text-muted">Banco</dt>
            <dd className="text-text-primary">{teacher.bankName}</dd>
            <dt className="text-text-muted">Esquema</dt>
            <dd className="text-text-primary">
              {teacher.paymentRail === 'COMISION_MERCANTIL' ? 'Facturas tu comisión' : 'Asimilados (no necesitas facturar)'}
            </dd>
            {teacher.rfc && (
              <>
                <dt className="text-text-muted">RFC</dt>
                <dd className="font-mono text-text-primary">{maskTail(teacher.rfc, 3)}</dd>
              </>
            )}
          </dl>
          <p className="text-xs text-text-muted">
            YaEntre se queda con el 25 % de cada venta; tú recibes el 75 %. Las liquidaciones son semanales
            por SPEI.
          </p>
          {teacher.canInvoice && !teacher.csfDocumentPath && <CsfUploadForm />}
          {teacher.canInvoice && teacher.csfDocumentPath && (
            <p className="text-xs text-text-secondary">Constancia de situación fiscal recibida.</p>
          )}
        </Card>
      </section>

      <Card className="space-y-3 p-5">
        <h2 className="font-display text-lg font-bold text-text-primary">Tu perfil público</h2>
        <TeacherProfileForm initialDisplayName={teacher.displayName} initialBio={teacher.bio ?? ''} />
      </Card>
    </div>
  );
}
