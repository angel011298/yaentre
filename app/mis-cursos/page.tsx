import Image from 'next/image';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { requireUserPage } from '@/lib/auth/guards';
import { listMyCourses } from '@/lib/db/courses';
import { signedReadUrls } from '@/lib/courses/storage';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Mis cursos' };

/** G103 — cursos del alumno con su avance. El acceso es permanente (también si el curso se archivó). */
export default async function MisCursosPage() {
  const { profile } = await requireUserPage('/mis-cursos');
  const enrollments = await listMyCourses(profile.id);
  const thumbs = await signedReadUrls(enrollments.map((e) => e.course.thumbnailPath ?? ''));

  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl font-bold text-text-primary">Mis cursos</h1>
      {enrollments.length === 0 ? (
        <p className="rounded-lg border border-border-subtle bg-surface p-4 text-sm text-text-secondary">
          Todavía no tienes cursos.{' '}
          <Link href="/cursos" className="font-semibold text-brand-soft hover:underline">
            Explorar cursos
          </Link>
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {enrollments.map((e) => (
            <li key={e.id}>
              <Link href={`/aprender/${e.course.slug}`} className="flex h-full gap-3 rounded-lg border border-border-subtle bg-surface p-3 hover:bg-elevated">
                <div className="relative aspect-video w-32 shrink-0 overflow-hidden rounded-md bg-elevated">
                  {e.course.thumbnailPath && thumbs.get(e.course.thumbnailPath) ? (
                    <Image src={thumbs.get(e.course.thumbnailPath)!} alt="" fill unoptimized sizes="128px" className="object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-text-muted">
                      <Icon name="play" className="h-6 w-6" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="font-semibold text-text-primary">{e.course.title}</p>
                  <p className="text-xs text-text-muted">{e.course.teacher.displayName}</p>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-meter-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(e.progressPercent)} aria-label="Avance del curso">
                    <div className="h-full rounded-full bg-meter-fill" style={{ width: `${Math.min(100, e.progressPercent)}%` }} />
                  </div>
                  <p className="text-xs text-text-secondary">
                    {e.status === 'COMPLETED' ? 'Completado' : `${Math.round(e.progressPercent)} % · ${e.completedLessons} de ${e.course.totalLessons} lecciones`}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
