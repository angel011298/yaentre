import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PublicPageShell } from '@/components/marketing/PublicPageShell';
import { CourseCard } from '@/components/courses/CourseCard';
import { listPublishedCourses, type CatalogSort } from '@/lib/db/courses';
import { signedReadUrls } from '@/lib/courses/storage';
import { COURSE_CATEGORY_LABELS } from '@/lib/courses/rules';
import { readMarketplaceFlags } from '@/lib/marketplace/flags';
import { consumeRateLimit } from '@/lib/rate-limit/store';
import { currentClientIp } from '@/lib/rate-limit/request';
import { openGraphFor } from '@/lib/seo/metadata';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Cursos',
  description:
    'Cursos en video de profesores independientes verificados en YaEntre para reforzar cualquier materia a tu ritmo.',
  alternates: { canonical: '/cursos' },
  openGraph: openGraphFor({ url: '/cursos', title: 'Cursos — YaEntre', description: 'Cursos en video para reforzar cualquier materia a tu ritmo.' }),
};

const CATEGORIES = Object.keys(COURSE_CATEGORY_LABELS) as Array<keyof typeof COURSE_CATEGORY_LABELS>;
const SORTS: Array<{ key: CatalogSort; label: string }> = [
  { key: 'popular', label: 'Más populares' },
  { key: 'rating', label: 'Mejor calificados' },
  { key: 'new', label: 'Más recientes' },
  { key: 'price_asc', label: 'Precio: menor a mayor' },
  { key: 'price_desc', label: 'Precio: mayor a menor' },
];

/**
 * G103 — catálogo público de cursos (spec §2.7). Con la bandera apagada no
 * existe. La práctica sigue siendo lo principal: los cursos son un extra para
 * reforzar (jerarquía de la spec §4.4).
 */
export default async function CursosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!readMarketplaceFlags().courses) notFound();
  const sp = await searchParams;
  const str = (k: string) => (typeof sp[k] === 'string' ? (sp[k] as string) : undefined);
  const category = CATEGORIES.find((c) => c === str('categoria'));
  const sort = SORTS.find((s) => s.key === str('orden'))?.key ?? 'popular';
  const q = str('q')?.slice(0, 80) ?? '';
  const page = Math.min(50, Math.max(1, Number(str('pagina') ?? 1) || 1));

  // Antirraspado: el catálogo es público, pero no un endpoint para vaciar.
  const limit = await consumeRateLimit('CATALOG_READ_IP', await currentClientIp());
  const result = limit.allowed ? await listPublishedCourses({ category, q, sort, page }) : null;
  const thumbs = result ? await signedReadUrls(result.rows.map((r) => r.thumbnailPath ?? '')) : new Map<string, string>();
  const pages = result ? Math.max(1, Math.ceil(result.total / result.pageSize)) : 1;

  const href = (over: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { categoria: category, orden: sort === 'popular' ? undefined : sort, q: q || undefined, ...over };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/cursos?${s}` : '/cursos';
  };

  return (
    <PublicPageShell>
      <section className="mx-auto max-w-6xl space-y-6 px-4 py-10 sm:px-6">
        <div className="max-w-2xl">
          <h1 className="font-display text-3xl font-bold text-text-primary">Cursos</h1>
          <p className="mt-2 text-text-secondary">
            Cursos en video de profesores independientes verificados en YaEntre. Para reforzar a tu ritmo lo
            que practicas en el simulador.
          </p>
        </div>

        <nav aria-label="Categorías" className="flex flex-wrap gap-2">
          <Link href={href({ categoria: undefined, pagina: undefined })} aria-current={!category ? 'page' : undefined} className={`inline-flex min-h-touch items-center rounded-full px-4 text-sm font-semibold ${!category ? 'bg-brand text-on-brand' : 'border border-border-subtle bg-surface text-text-secondary'}`}>
            Todos
          </Link>
          {CATEGORIES.map((c) => (
            <Link key={c} href={href({ categoria: c, pagina: undefined })} aria-current={category === c ? 'page' : undefined} className={`inline-flex min-h-touch items-center rounded-full px-4 text-sm font-semibold ${category === c ? 'bg-brand text-on-brand' : 'border border-border-subtle bg-surface text-text-secondary'}`}>
              {COURSE_CATEGORY_LABELS[c]}
            </Link>
          ))}
        </nav>

        <form action="/cursos" method="get" className="flex flex-col gap-2 sm:flex-row" role="search">
          {category && <input type="hidden" name="categoria" value={category} />}
          <label htmlFor="cursos-q" className="sr-only">Buscar cursos</label>
          <input id="cursos-q" name="q" defaultValue={q} maxLength={80} placeholder="Buscar cursos…" className="min-h-touch flex-1 rounded-md border border-border-subtle bg-input px-3 text-text-primary placeholder:text-text-muted" />
          <label htmlFor="cursos-orden" className="sr-only">Ordenar</label>
          <select id="cursos-orden" name="orden" defaultValue={sort} className="min-h-touch rounded-md border border-border-subtle bg-input px-3 text-text-primary">
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
          <button type="submit" className="inline-flex min-h-touch items-center justify-center rounded-md bg-brand px-4 text-sm font-semibold text-on-brand">
            Buscar
          </button>
        </form>

        {!result ? (
          <p role="alert" className="rounded-lg bg-warning-subtle p-4 text-sm text-text-primary">
            Hiciste muchas búsquedas seguidas. Espera unos minutos.
          </p>
        ) : result.rows.length === 0 ? (
          <p className="rounded-lg border border-border-subtle bg-surface p-6 text-sm text-text-secondary">
            {q ? `No encontramos cursos para «${q}».` : 'Todavía no hay cursos publicados en esta categoría.'}
          </p>
        ) : (
          <>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {result.rows.map((c) => (
                <li key={c.id}>
                  <CourseCard
                    href={`/cursos/${c.slug}`}
                    course={{
                      ...c,
                      teacherName: c.teacher.displayName,
                      thumbnailUrl: c.thumbnailPath ? (thumbs.get(c.thumbnailPath) ?? null) : null,
                    }}
                  />
                </li>
              ))}
            </ul>
            {pages > 1 && (
              <nav aria-label="Páginas" className="flex items-center justify-center gap-3">
                {page > 1 && <Link href={href({ pagina: String(page - 1) })} className="inline-flex min-h-touch items-center font-semibold text-brand-fg">Anterior</Link>}
                <span className="text-sm text-text-muted">Página {page} de {pages}</span>
                {page < pages && <Link href={href({ pagina: String(page + 1) })} className="inline-flex min-h-touch items-center font-semibold text-brand-fg">Siguiente</Link>}
              </nav>
            )}
          </>
        )}
      </section>
    </PublicPageShell>
  );
}
