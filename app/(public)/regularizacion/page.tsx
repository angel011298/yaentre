import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PublicPageShell } from '@/components/marketing/PublicPageShell';
import { CourseCard } from '@/components/courses/CourseCard';
import { Card } from '@/components/ui/Card';
import { LinkButton } from '@/components/ui/LinkButton';
import { listPublishedCourses } from '@/lib/db/courses';
import { signedReadUrls } from '@/lib/courses/storage';
import { formatMxnShort } from '@/lib/format/mx';
import { readMarketplaceFlags, regularizacionClassesOn, regularizacionSectionOn } from '@/lib/marketplace/flags';
import { openGraphFor } from '@/lib/seo/metadata';
import { subjectsForTrack } from '@/lib/teachers/subject-catalog';
import { publicPriceRange } from '@/lib/teachers/tariff';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Regularización',
  description:
    'Regulariza tus materias a tu ritmo: cursos en video y clases con profesores independientes verificados en YaEntre.',
  alternates: { canonical: '/regularizacion' },
  openGraph: openGraphFor({
    url: '/regularizacion',
    title: 'Regularización — YaEntre',
    description: 'Cursos en video y clases con profesores independientes verificados en YaEntre.',
  }),
};

/**
 * G103 — sección de Regularización (spec §2.9-2.10): un módulo aparte de la
 * preparación de admisión, con cursos pregrabados y clases en vivo. Copy de la
 * spec, sin prometer calificaciones ni resultados escolares. Las tarifas se
 * publican como RANGOS por materia (nunca la fórmula).
 */
export default async function RegularizacionPage() {
  const flags = readMarketplaceFlags();
  if (!regularizacionSectionOn(flags)) notFound();

  const courses = flags.courses ? await listPublishedCourses({ category: 'REGULARIZACION', sort: 'popular', pageSize: 6 }) : null;
  const thumbs = courses ? await signedReadUrls(courses.rows.map((r) => r.thumbnailPath ?? '')) : new Map<string, string>();
  const classes = regularizacionClassesOn(flags);

  return (
    <PublicPageShell>
      <section className="bg-brand-tint py-14">
        <div className="mx-auto max-w-4xl space-y-4 px-4 text-center sm:px-6">
          <h1 className="font-display text-3xl font-bold text-text-primary sm:text-4xl">Regularización</h1>
          <p className="text-lg text-text-secondary">
            Regulariza tus materias a tu ritmo: cursos en video y clases con profesores independientes verificados en YaEntre.
          </p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            {flags.courses && (
              <LinkButton href="/cursos?categoria=REGULARIZACION" variant="primary">
                Ver cursos
              </LinkButton>
            )}
            {classes && (
              <LinkButton href="/clases?pista=regularizacion" variant="secondary">
                Buscar profesor
              </LinkButton>
            )}
          </div>
          <p className="text-xs text-text-muted">Para secundaria, bachillerato y licenciatura. No necesitas un plan de admisión.</p>
        </div>
      </section>

      {courses && courses.rows.length > 0 && (
        <section className="mx-auto max-w-6xl space-y-4 px-4 py-10 sm:px-6">
          <h2 className="font-display text-2xl font-bold text-text-primary">Cursos de regularización</h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses.rows.map((c) => (
              <li key={c.id}>
                <CourseCard
                  href={`/cursos/${c.slug}`}
                  course={{ ...c, teacherName: c.teacher.displayName, thumbnailUrl: c.thumbnailPath ? (thumbs.get(c.thumbnailPath) ?? null) : null }}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {classes && (
        <section className="mx-auto max-w-4xl space-y-4 px-4 py-10 sm:px-6">
          <h2 className="font-display text-2xl font-bold text-text-primary">Clases en vivo, 1 a 1</h2>
          <p className="text-text-secondary">
            Agenda cuando quieras y paga solo lo que uses. Clases en línea de 50 u 80 minutos; cancelación sin
            costo hasta 24 horas antes.
          </p>
          <Card className="overflow-hidden p-0 active:scale-100">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Rango de precio por clase según la materia</caption>
              <thead className="bg-elevated text-xs text-text-muted">
                <tr>
                  <th scope="col" className="p-3">Materia</th>
                  <th scope="col" className="p-3">Precio por clase</th>
                </tr>
              </thead>
              <tbody>
                {subjectsForTrack('REGULARIZACION').map((s) => {
                  const r = publicPriceRange('REGULARIZACION', s.key)!;
                  return (
                    <tr key={s.key} className="border-t border-border-subtle">
                      <td className="p-3 text-text-primary">{s.label}</td>
                      <td className="p-3 tabular-nums text-text-secondary">
                        {formatMxnShort(r.minCents)} – {formatMxnShort(r.maxCents)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
          <p className="text-xs text-text-muted">
            El precio final depende del profesor, la duración y el horario; lo ves completo antes de reservar.
          </p>
        </section>
      )}
    </PublicPageShell>
  );
}
