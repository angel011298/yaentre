import Image from 'next/image';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { formatMxnShort } from '@/lib/format/mx';
import { COURSE_LEVEL_LABELS } from '@/lib/courses/rules';

export interface CourseCardData {
  slug: string;
  title: string;
  shortDescription: string;
  level: keyof typeof COURSE_LEVEL_LABELS;
  priceCents: number;
  originalPriceCents: number | null;
  isFree: boolean;
  totalLessons: number;
  totalDurationMinutes: number;
  averageRating: number;
  totalRatings: number;
  teacherName: string;
  thumbnailUrl: string | null;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/**
 * G103 — tarjeta del catálogo. Portada en una caja 16:9 de alto fijo (sin
 * saltos de diseño) con la URL firmada que emitió el servidor; si no hay
 * portada, un respaldo neutro. Texto del profesor siempre como texto.
 */
export function CourseCard({ course, href }: { course: CourseCardData; href: string }) {
  return (
    <Link
      href={href}
      className="group flex h-full flex-col overflow-hidden rounded-lg border border-border-subtle bg-surface shadow-md transition-shadow hover:shadow-lg"
    >
      <div className="relative aspect-video w-full bg-elevated">
        {course.thumbnailUrl ? (
          <Image src={course.thumbnailUrl} alt="" fill unoptimized sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-text-muted">
            <Icon name="play" className="h-10 w-10" />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <p className="font-display text-lg font-bold leading-tight text-text-primary group-hover:underline">{course.title}</p>
        <p className="text-sm text-text-secondary">{course.teacherName}</p>
        <p className="line-clamp-2 text-sm text-text-secondary">{course.shortDescription}</p>
        <p className="text-xs text-text-muted">
          {course.totalRatings > 0 ? `${course.averageRating.toFixed(1)} de 5 (${course.totalRatings}) · ` : ''}
          {course.totalLessons} {course.totalLessons === 1 ? 'lección' : 'lecciones'} · {formatDuration(course.totalDurationMinutes)} ·{' '}
          {COURSE_LEVEL_LABELS[course.level]}
        </p>
        <div className="mt-auto flex items-baseline gap-2 pt-2">
          {course.isFree ? (
            <span className="font-display text-xl font-bold text-text-primary">Gratis</span>
          ) : (
            <>
              <span className="font-display text-xl font-bold text-text-primary">{formatMxnShort(course.priceCents)}</span>
              {course.originalPriceCents && (
                <span className="text-sm text-text-muted line-through">{formatMxnShort(course.originalPriceCents)}</span>
              )}
            </>
          )}
        </div>
      </div>
    </Link>
  );
}
