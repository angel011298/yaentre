import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CourseDetailsForm } from '@/components/courses/CourseDetailsForm';
import { CourseContentEditor } from '@/components/courses/CourseContentEditor';
import { MediaUploader } from '@/components/courses/MediaUploader';
import { SubmitCourseButton } from '@/components/courses/SubmitCourseButton';
import { Card } from '@/components/ui/Card';
import { getTeacherCourse } from '@/lib/db/courses';
import { signedReadUrls } from '@/lib/courses/storage';
import { validateCourseForSubmission } from '@/lib/courses/rules';
import { readMarketplaceFlags } from '@/lib/marketplace/flags';
import { getTeacherPageContext } from '@/lib/teachers/guard';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Editar curso' };

/** G103 — editor del curso (spec §2.6, pasos 1-5). Solo editable en borrador o rechazado. */
export default async function EditarCursoPage({ params }: { params: Promise<{ id: string }> }) {
  const { teacher } = await getTeacherPageContext('/profesor/cursos');
  const { id } = await params;
  if (!readMarketplaceFlags().courses || !/^c[a-z0-9]{20,40}$/.test(id)) notFound();
  const course = await getTeacherCourse(teacher.id, id);
  if (!course) notFound();

  const editable = (course.status === 'DRAFT' || course.status === 'REJECTED') && teacher.status === 'ACTIVE';
  const urls = await signedReadUrls([course.thumbnailPath ?? '']);
  const pending = validateCourseForSubmission(course);
  const freePreviews = course.modules.flatMap((m) => m.lessons).filter((l) => l.isFreePreview).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Link href="/profesor/cursos" className="inline-flex min-h-touch items-center text-sm font-semibold text-brand-fg hover:underline">
            Volver a mis cursos
          </Link>
          <h1 className="font-display text-2xl font-bold text-text-primary">{course.title}</h1>
        </div>
        {course.status === 'PUBLISHED' && (
          <Link href={`/cursos/${course.slug}`} className="inline-flex min-h-touch items-center text-sm font-semibold text-brand-fg hover:underline">
            Ver en el catálogo
          </Link>
        )}
      </div>

      {!editable && (
        <p role="status" className="rounded-md bg-elevated p-3 text-sm text-text-secondary">
          {course.status === 'IN_REVIEW'
            ? 'Tu curso está en revisión. Te avisaremos cuando se publique o si necesita cambios.'
            : course.status === 'PUBLISHED'
              ? 'Tu curso está publicado. Para cambiar el contenido o el precio escríbenos: los alumnos inscritos conservan lo que compraron al precio que pagaron.'
              : 'Este curso no se puede editar.'}
        </p>
      )}
      {course.status === 'REJECTED' && course.reviewNote && (
        <p role="alert" className="whitespace-pre-wrap rounded-md bg-danger-subtle p-3 text-sm text-text-primary">
          Cambios pedidos en la revisión: {course.reviewNote}
        </p>
      )}

      <Card className="space-y-3 p-5 active:scale-100">
        <h2 className="font-display text-lg font-bold text-text-primary">1. Datos y precio</h2>
        <CourseDetailsForm
          mode="edit"
          courseId={course.id}
          disabled={!editable}
          initial={{
            title: course.title,
            shortDescription: course.shortDescription,
            description: course.description,
            learningOutcomes: course.learningOutcomes,
            category: course.category,
            subjectArea: course.subjectArea,
            level: course.level,
            tags: course.tags,
            isFree: course.isFree,
            pricePesos: Math.round(course.priceCents / 100),
            originalPricePesos: course.originalPriceCents === null ? null : Math.round(course.originalPriceCents / 100),
          }}
        />
      </Card>

      <Card className="space-y-4 p-5 active:scale-100">
        <h2 className="font-display text-lg font-bold text-text-primary">2. Portada y video de presentación</h2>
        <MediaUploader courseId={course.id} kind="thumbnail" label="Imagen de portada (JPG, PNG o WebP, máx. 5 MB)" currentUrl={course.thumbnailPath ? (urls.get(course.thumbnailPath) ?? null) : null} hasFile={Boolean(course.thumbnailPath)} disabled={!editable} />
        <MediaUploader courseId={course.id} kind="preview" label="Video de presentación de 1 a 3 minutos (opcional)" hasFile={Boolean(course.previewVideoPath)} disabled={!editable} />
      </Card>

      <Card className="space-y-3 p-5 active:scale-100">
        <h2 className="font-display text-lg font-bold text-text-primary">3. Módulos y lecciones</h2>
        <p className="text-sm text-text-secondary">Máximo 3 lecciones de muestra gratuita. Videos MP4, WebM o MOV de hasta 500 MB; 5 GB por curso.</p>
        <CourseContentEditor
          courseId={course.id}
          disabled={!editable}
          freePreviews={freePreviews}
          modules={course.modules.map((m) => ({
            id: m.id,
            title: m.title,
            description: m.description,
            lessons: m.lessons.map((l) => ({
              id: l.id,
              title: l.title,
              type: l.type,
              hasVideo: Boolean(l.videoPath),
              hasResource: Boolean(l.resourcePath),
              durationSeconds: l.videoDurationSeconds,
              content: l.content,
              isFreePreview: l.isFreePreview,
            })),
          }))}
        />
      </Card>

      <Card className="space-y-3 p-5 active:scale-100">
        <h2 className="font-display text-lg font-bold text-text-primary">4. Enviar a revisión</h2>
        {pending.length > 0 ? (
          <ul className="list-disc space-y-1 pl-5 text-sm text-text-secondary">
            {pending.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-text-secondary">Tu curso cumple los requisitos. Revisamos que el contenido sea tuyo, apropiado y con audio y video claros.</p>
        )}
        {editable && <SubmitCourseButton courseId={course.id} ready={pending.length === 0} />}
      </Card>
    </div>
  );
}
