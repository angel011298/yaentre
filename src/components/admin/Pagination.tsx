import Link from 'next/link';

interface Props {
  page: number;
  totalPages: number;
  searchParams: Record<string, string | undefined>;
  basePath: string;
}

function hrefFor(
  basePath: string,
  sp: Record<string, string | undefined>,
  page: number,
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (value && key !== 'page') params.set(key, value);
  }
  params.set('page', String(page));
  return `${basePath}?${params.toString()}`;
}

export function Pagination({ page, totalPages, searchParams, basePath }: Props) {
  if (totalPages <= 1) return null;

  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <div className="flex items-center justify-center gap-4 text-sm">
      {hasPrev ? (
        <Link
          className="rounded-md px-3 py-1.5 text-brand hover:underline"
          href={hrefFor(basePath, searchParams, page - 1)}
        >
          ← Anterior
        </Link>
      ) : (
        <span className="px-3 py-1.5 text-text-muted">← Anterior</span>
      )}
      <span className="text-text-secondary">
        Página {page} de {totalPages}
      </span>
      {hasNext ? (
        <Link
          className="rounded-md px-3 py-1.5 text-brand hover:underline"
          href={hrefFor(basePath, searchParams, page + 1)}
        >
          Siguiente →
        </Link>
      ) : (
        <span className="px-3 py-1.5 text-text-muted">Siguiente →</span>
      )}
    </div>
  );
}
