import { notFound } from 'next/navigation';
import { CoursePlayer } from '@/components/courses/CoursePlayer';
import { requireUser } from '@/lib/auth/guards';
import { getCourseForLearner } from '@/lib/db/courses';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Curso' };

/**
 * G103 — reproductor del curso (spec §2.7). Solo con inscripción vigente (o el
 * profesor dueño / un admin, en modo vista previa sin guardar avance). Los
 * archivos NO viajan en el HTML: el reproductor pide una URL firmada por
 * lección (`getLessonMediaUrlAction`), que vuelve a verificar la inscripción.
 */
export default async function AprenderPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { profile } = await requireUser();
  const { slug } = await params;
  const sp = await searchParams;
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) notFound();
  const data = await getCourseForLearner(slug, profile.id, { isAdmin: profile.role === 'ADMIN' });
  if (!data) notFound();
  const { course, enrollment } = data;

  const lessons = course.modules.flatMap((m) => m.lessons);
  const requested = typeof sp.leccion === 'string' ? sp.leccion : null;
  const current =
    lessons.find((l) => l.id === requested)?.id ?? (enrollment?.lastLessonId && lessons.some((l) => l.id === enrollment.lastLessonId) ? enrollment.lastLessonId : lessons[0]?.id ?? null);
  const progress = Object.fromEntries(
    (enrollment?.lessonProgress ?? []).map((p) => [p.lessonId, { completed: p.completed, seconds: p.videoProgressSeconds ?? 0 }])
  );

  return (
    <CoursePlayer
      courseId={course.id}
      slug={course.slug}
      title={course.title}
      teacherName={course.teacher.displayName}
      modules={course.modules.map((m) => ({
        id: m.id,
        title: m.title,
        lessons: m.lessons.map((l) => ({
          id: l.id,
          title: l.title,
          type: l.type,
          durationSeconds: l.videoDurationSeconds,
          hasMedia: Boolean(l.type === 'VIDEO' ? l.videoPath : l.resourcePath),
          content: l.type === 'TEXT' ? l.content : null,
        })),
      }))}
      initialLessonId={current}
      initialProgress={progress}
      enrolled={Boolean(enrollment)}
      initialRating={enrollment?.rating ?? null}
      initialReview={enrollment?.review ?? ''}
      progressPercent={enrollment?.progressPercent ?? 0}
    />
  );
}
