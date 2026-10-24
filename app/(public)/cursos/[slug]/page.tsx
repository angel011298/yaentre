import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PublicPageShell } from '@/components/marketing/PublicPageShell';
import { CourseBuyPanel } from '@/components/courses/CourseBuyPanel';
import { formatDuration } from '@/components/courses/CourseCard';
import { Icon } from '@/components/ui/Icon';
import { AuthError } from '@/lib/auth/errors';
import { requireUser } from '@/lib/auth/guards';
import { getEnrollment, getPublishedCourseBySlug, listCourseReviews } from '@/lib/db/courses';
import { signedReadUrls } from '@/lib/courses/storage';
import { COURSE_CATEGORY_LABELS, COURSE_IMMEDIATE_ACCESS_CONSENT, COURSE_LEVEL_LABELS } from '@/lib/courses/rules';
import { formatMexicoDate } from '@/lib/format/mx';
import { readMarketplaceFlags } from '@/lib/marketplace/flags';
import { isSalesOpen } from '@/lib/stripe/sales-gate';
import { LEVEL_LABELS } from '@/lib/teachers/level-engine';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  if (!readMarketplaceFlags().courses) return { title: 'Curso' };
  const { slug } = await params;
  const c = await getPublishedCourseBySlug(slug);
  if (!c) return { title: 'Curso' };
  return { title: c.title, description: c.shortDescription, alternates: { canonical: `/cursos/${c.slug}` } };
}

async function optionalProfileId(): Promise<string | null> {
  try {
    return (await requireUser()).profile.id;
  } catch (err) {
    if (err instanceof AuthError) return null;
    throw err;
  }
}

/**
 * G103 — detalle público de un curso (spec §2.7). Muestra TODAS las lecciones
 * por título y duración, pero solo las de muestra gratuita traen su archivo.
 * Descripción, objetivos y reseñas se pintan como TEXTO (nada de HTML ni
 * Markdown interpretado: es contenido de terceros).
 */
export default async function CursoDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!readMarketplaceFlags().courses) notFound();
  const { slug } = await params;
  const sp = await searchParams;
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) notFound();
  const course = await getPublishedCourseBySlug(slug);
  if (!course) notFound();

  const profileId = await optionalProfileId();
  const [enrollment, reviews] = await Promise.all([
    profileId ? getEnrollment(profileId, course.id) : null,
    listCourseReviews(course.id),
  ]);
  const previewLessons = course.modules.flatMap((m) => m.lessons).filter((l) => l.isFreePreview && l.videoPath);
  const urls = await signedReadUrls([
    course.thumbnailPath ?? '',
    course.previewVideoPath ?? '',
    ...previewLessons.map((l) => l.videoPath ?? ''),
  ]);
  const enrolled = Boolean(enrollment && (enrollment.status === 'ACTIVE' || enrollment.status === 'COMPLETED'));

  return (
    <PublicPageShell>
      <article className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Link href="/cursos" className="inline-flex min-h-touch items-center text-sm font-semibold text-brand-fg hover:underline">
          Ver todos los cursos
        </Link>
        <div className="mt-2 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 space-y-6">
            <header className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                {COURSE_CATEGORY_LABELS[course.category]} · {COURSE_LEVEL_LABELS[course.level]}
              </p>
              <h1 className="font-display text-3xl font-bold text-text-primary">{course.title}</h1>
              <p className="text-text-secondary">
                Por {course.teacher.displayName}, profesor independiente verificado en YaEntre · Nivel{' '}
                {LEVEL_LABELS[course.teacher.level]}
              </p>
              <p className="text-sm text-text-muted">
                {course.totalLessons} {course.totalLessons === 1 ? 'lección' : 'lecciones'} · {formatDuration(course.totalDurationMinutes)}
                {course.totalEnrollments > 0 ? ` · ${course.totalEnrollments} inscritos` : ''}
                {course.totalRatings > 0 ? ` · ${course.averageRating.toFixed(1)} de 5` : ''}
              </p>
            </header>

            <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-elevated">
              {course.previewVideoPath && urls.get(course.previewVideoPath) ? (
                <video
                  controls
                  playsInline
                  preload="metadata"
                  poster={course.thumbnailPath ? urls.get(course.thumbnailPath) : undefined}
                  src={urls.get(course.previewVideoPath)}
                  className="h-full w-full"
                >
                  Tu navegador no puede reproducir este video.
                </video>
              ) : course.thumbnailPath && urls.get(course.thumbnailPath) ? (
                <Image src={urls.get(course.thumbnailPath)!} alt="" fill unoptimized sizes="(min-width: 1024px) 66vw, 100vw" className="object-cover" priority />
              ) : (
                <div className="flex h-full items-center justify-center text-text-muted">
                  <Icon name="play" className="h-12 w-12" />
                </div>
              )}
            </div>

            {course.learningOutcomes.length > 0 && (
              <section className="space-y-2">
                <h2 className="font-display text-xl font-bold text-text-primary">Lo que aprenderás</h2>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {course.learningOutcomes.map((o) => (
                    <li key={o} className="flex items-start gap-2 text-sm text-text-secondary">
                      <Icon name="check" className="mt-0.5 h-4 w-4 text-success" />
                      <span>{o}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="space-y-2">
              <h2 className="font-display text-xl font-bold text-text-primary">Descripción</h2>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-secondary">{course.description}</p>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-xl font-bold text-text-primary">Contenido del curso</h2>
              {course.modules.map((m) => (
                <details key={m.id} open className="rounded-lg border border-border-subtle bg-surface">
                  <summary className="min-h-touch cursor-pointer px-4 py-3 font-semibold text-text-primary">
                    {m.title} <span className="text-sm font-normal text-text-muted">({m.lessons.length} {m.lessons.length === 1 ? 'lección' : 'lecciones'})</span>
                  </summary>
                  <ul className="divide-y divide-border-subtle border-t border-border-subtle">
                    {m.lessons.map((l) => (
                      <li key={l.id} className="space-y-2 px-4 py-2 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <span className="flex items-center gap-2 text-text-primary">
                            <Icon name={l.isFreePreview ? 'play' : 'lock'} className="h-4 w-4 text-text-muted" />
                            {l.title}
                          </span>
                          <span className="shrink-0 text-xs text-text-muted">
                            {l.isFreePreview ? 'Muestra gratis · ' : ''}
                            {l.videoDurationSeconds ? formatDuration(Math.max(1, Math.round(l.videoDurationSeconds / 60))) : l.type === 'TEXT' ? 'Lectura' : 'Material'}
                          </span>
                        </div>
                        {l.isFreePreview && l.videoPath && urls.get(l.videoPath) && (
                          <video controls playsInline preload="none" src={urls.get(l.videoPath)} className="aspect-video w-full rounded-md bg-elevated">
                            Tu navegador no puede reproducir este video.
                          </video>
                        )}
                      </li>
                    ))}
                  </ul>
                </details>
              ))}
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-xl font-bold text-text-primary">Opiniones de alumnos</h2>
              {reviews.length === 0 ? (
                <p className="text-sm text-text-muted">Todavía no hay opiniones.</p>
              ) : (
                <ul className="space-y-2">
                  {reviews.map((r) => (
                    <li key={r.id} className="rounded-lg border border-border-subtle bg-surface p-3 text-sm">
                      <p className="font-semibold text-text-primary">
                        {r.rating} de 5{r.ratedAt ? <span className="font-normal text-text-muted"> · {formatMexicoDate(r.ratedAt)}</span> : null}
                      </p>
                      {r.review && <p className="mt-1 whitespace-pre-wrap text-text-secondary">{r.review}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <aside className="lg:sticky lg:top-6 lg:self-start">
            <CourseBuyPanel
              slug={course.slug}
              isFree={course.isFree}
              priceCents={course.priceCents}
              originalPriceCents={course.originalPriceCents}
              loggedIn={profileId !== null}
              enrolled={enrolled}
              salesOpen={isSalesOpen()}
              consentText={COURSE_IMMEDIATE_ACCESS_CONSENT.text}
              cancelled={sp.cancelado === '1'}
            />
          </aside>
        </div>
      </article>
    </PublicPageShell>
  );
}
