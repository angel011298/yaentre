import Link from 'next/link';
import type { DifficultyLevel } from '@prisma/client';
import { ApproveRejectActions } from '@/components/admin/ApproveRejectActions';
import { LatexText } from '@/components/admin/LatexText';
import { Pagination } from '@/components/admin/Pagination';
import { QueueFilterBar } from '@/components/admin/QueueFilterBar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { listPendingQuestions, loadFilterTaxonomy, type QueueFilters } from '@/lib/db/admin-questions';

const DIFFICULTIES: DifficultyLevel[] = [
  'BEGINNER',
  'BASIC',
  'INTERMEDIATE',
  'ADVANCED',
  'EXPERT',
];

interface RawSearchParams {
  areaId?: string;
  subjectId?: string;
  topicId?: string;
  difficulty?: string;
  page?: string;
  [key: string]: string | undefined;
}

function parseFilters(sp: RawSearchParams): QueueFilters {
  const difficulty = DIFFICULTIES.includes(sp.difficulty as DifficultyLevel)
    ? (sp.difficulty as DifficultyLevel)
    : undefined;
  const page = sp.page ? Math.max(1, parseInt(sp.page, 10) || 1) : 1;

  return {
    areaId: sp.areaId || undefined,
    subjectId: sp.subjectId || undefined,
    topicId: sp.topicId || undefined,
    difficulty,
    page,
  };
}

export default async function QueuePage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const sp = await searchParams;
  const filters = parseFilters(sp);

  const [taxonomy, result] = await Promise.all([
    loadFilterTaxonomy(),
    listPendingQuestions(filters),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Cola de revisión</h1>
        <p className="text-text-secondary">
          {result.total} reactivo{result.total === 1 ? '' : 's'} pendiente
          {result.total === 1 ? '' : 's'} de verificar.
        </p>
      </div>

      <QueueFilterBar taxonomy={taxonomy} current={sp} action="/admin/questions/queue" />

      {result.items.length === 0 ? (
        <Card className="p-8 text-center text-text-secondary">
          No hay reactivos pendientes con estos filtros. 🎉
        </Card>
      ) : (
        <div className="space-y-3">
          {result.items.map((q) => (
            <Card key={q.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-text-muted">
                    {q.topic.subject.area.name} · {q.topic.subject.name} · {q.topic.name} ·{' '}
                    {q.difficulty}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm text-text-primary">
                    <LatexText text={q.stem} />
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Link href={`/admin/questions/${q.id}`}>
                    <Button variant="secondary">Ver</Button>
                  </Link>
                  <ApproveRejectActions questionId={q.id} compact />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Pagination
        page={result.page}
        totalPages={result.totalPages}
        searchParams={sp}
        basePath="/admin/questions/queue"
      />
    </div>
  );
}
