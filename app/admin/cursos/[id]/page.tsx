import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MarketplaceDecision } from '@/components/admin/MarketplaceDecision';
import { getAdminContext } from '@/lib/admin/context';
import { getCourseForAdmin } from '@/lib/db/courses';
import { COURSE_CATEGORY_LABELS, COURSE_LEVEL_LABELS, validateCourseForSubmission } from '@/lib/courses/rules';
import { formatMxnShort } from '@/lib/format/mx';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Revisar curso' };

/**
 * G103 — revisión de un curso (spec §2.6 paso 6): contenido apropiado, que no
 * sea copiado ni pirata, calidad mínima de audio y video, y que NO use
 * reactivos del banco de YaEntre. El admin puede reproducir cada lección
 * desde el reproductor (`/aprender/<slug>`, en modo vista previa). Archivar
 * conserva el acceso de los inscritos.
 */
export default async function AdminCursoPage({ params }: { params: Promise<{ id: string }> }) {
  await getAdminContext();
  const { id } = await params;
  if (!/^c[a-z0-9]{20,40}$/.test(id)) notFound();
  const course = await getCourseForAdmin(id);
  if (!course) notFound();
  const issues = validateCourseForSubmission(course);

  return (
    <div className="space-y-5">
      <Link href="/admin/cursos" className="inline-flex min-h-touch items-center text-sm font-semibold text-brand-fg hover:underline">
        Volver a cursos
      </Link>
      <div>
        <h1 className="font-display text-2xl font-bold text-text-primary">{course.title}</h1>
        <p className="text-sm text-text-secondary">
          {course.teacher.displayName} · {COURSE_CATEGORY_LABELS[course.category]} · {COURSE_LEVEL_LABELS[course.level]} ·{' '}
          {course.isFree ? 'Gratis' : formatMxnShort(course.priceCents)} · estado {course.status}
        </p>
      </div>
      <section className="space-y-2 rounded-lg border border-border-subtle bg-surface p-4">
        <p className="text-sm font-semibold text-text-primary">{course.shortDescription}</p>
        <p className="whitespace-pre-wrap text-sm text-text-secondary">{course.description}</p>
      </section>
      <section className="space-y-2">
        <h2 className="font-display text-lg font-bold text-text-primary">Contenido</h2>
        {course.modules.map((m) => (
          <div key={m.id} className="rounded-lg border border-border-subtle bg-surface p-3 text-sm">
            <p className="font-semibold text-text-primary">{m.title}</p>
            <ul className="mt-1 space-y-1">
              {m.lessons.map((l) => (
                <li key={l.id} className="text-text-secondary">
                  {l.title} · {l.type}
                  {l.videoDurationSeconds ? ` · ${Math.round(l.videoDurationSeconds / 60)} min` : ''}
                  {l.isFreePreview ? ' · muestra' : ''}
                  {l.type === 'TEXT' && l.content ? <span className="block whitespace-pre-wrap text-xs text-text-muted">{l.content.slice(0, 400)}</span> : null}
                </li>
              ))}
            </ul>
          </div>
        ))}
        <Link href={`/aprender/${course.slug}`} className="inline-flex min-h-touch items-center text-sm font-semibold text-brand-fg hover:underline">
          Ver los videos en el reproductor (vista previa)
        </Link>
      </section>
      {issues.length > 0 && (
        <section className="rounded-lg bg-warning-subtle p-3 text-sm text-text-primary">
          <p className="font-semibold">Requisitos pendientes:</p>
          <ul className="list-disc pl-5">
            {issues.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
        </section>
      )}
      <MarketplaceDecision
        target={{ kind: 'course', courseId: course.id }}
        options={
          course.status === 'IN_REVIEW'
            ? [
                { value: 'APPROVE', label: 'Publicar', variant: 'primary' },
                { value: 'REJECT', label: 'Pedir cambios', variant: 'danger' },
              ]
            : course.status === 'PUBLISHED'
              ? [{ value: 'ARCHIVE', label: 'Archivar', variant: 'danger' }]
              : []
        }
      />
    </div>
  );
}
