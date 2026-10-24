import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CourseDetailsForm } from '@/components/courses/CourseDetailsForm';
import { Card } from '@/components/ui/Card';
import { listTeacherCourses } from '@/lib/db/courses';
import { formatMxnShort } from '@/lib/format/mx';
import { readMarketplaceFlags } from '@/lib/marketplace/flags';
import { getTeacherPageContext } from '@/lib/teachers/guard';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Mis cursos (profesor)' };

const STATUS: Record<string, string> = {
  DRAFT: 'Borrador',
  IN_REVIEW: 'En revisión',
  PUBLISHED: 'Publicado',
  ARCHIVED: 'Archivado',
  REJECTED: 'Rechazado',
};

/** G103 — cursos del profesor (spec §2.6). Solo profesores ACTIVOS crean cursos. */
export default async function ProfesorCursosPage() {
  const { teacher } = await getTeacherPageContext('/profesor/cursos');
  if (!readMarketplaceFlags().courses) notFound();
  const courses = await listTeacherCourses(teacher.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-text-primary">Mis cursos</h1>
        <p className="text-sm text-text-secondary">
          Tú pones el precio ($99 a $9,999, o gratis). Recibes el 75 % de cada venta; YaEntre se queda con el 25 %.
          Cada curso pasa por una revisión antes de publicarse.
        </p>
      </div>

      {courses.length > 0 && (
        <ul className="space-y-2">
          {courses.map((c) => (
            <li key={c.id}>
              <Link href={`/profesor/cursos/${c.id}`} className="flex flex-col gap-1 rounded-lg border border-border-subtle bg-surface p-4 hover:bg-elevated sm:flex-row sm:items-center sm:justify-between">
                <span>
                  <span className="block font-semibold text-text-primary">{c.title}</span>
                  <span className="text-xs text-text-muted">
                    {c.totalLessons} lecciones · {c.isFree ? 'Gratis' : formatMxnShort(c.priceCents)} · {c.totalEnrollments} inscritos
                    {c.totalRatings > 0 ? ` · ${c.averageRating.toFixed(1)} de 5` : ''}
                  </span>
                  {c.status === 'REJECTED' && c.reviewNote && (
                    <span className="block whitespace-pre-wrap text-xs text-danger">Motivo: {c.reviewNote}</span>
                  )}
                </span>
                <span className="text-sm font-semibold text-text-secondary">{STATUS[c.status] ?? c.status}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {teacher.status === 'ACTIVE' ? (
        <Card className="space-y-3 p-5 active:scale-100">
          <h2 className="font-display text-lg font-bold text-text-primary">Crear un curso nuevo</h2>
          <CourseDetailsForm mode="create" needsTerms={!teacher.courseTermsAcceptedAt} />
        </Card>
      ) : (
        <p className="rounded-lg border border-border-subtle bg-surface p-4 text-sm text-text-secondary">
          Podrás crear cursos cuando tu perfil de profesor esté activo.
        </p>
      )}
    </div>
  );
}
