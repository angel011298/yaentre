import Link from 'next/link';
import { GroundingBadge } from '@/components/admin/GroundingBadge';
import { LatexText } from '@/components/admin/LatexText';
import { Pagination } from '@/components/admin/Pagination';
import { QueueFilterBar } from '@/components/admin/QueueFilterBar';
import { ReviewTabs } from '@/components/admin/ReviewTabs';
import { Card } from '@/components/ui/Card';
import { loadFilterTaxonomy } from '@/lib/db/admin-questions';
import { listReviewQueue } from '@/lib/db/review-queue';
import { REVIEW_QUEUE_LABELS, REVIEW_QUEUE_ORDER, type ReviewQueueKind } from '@/lib/admin/verification';

/**
 * Panel de revisión de contenido (F3): reactivos que el pipeline adversarial
 * (F2) NO auto-aprobó, en 3 colas separadas según la razón. Reemplaza la
 * cola "plana" de CC-06 (isVerified=false sin distinción de causa) — todo
 * reactivo GENERATED pasa por F2 ahora, así que la cola relevante es "por
 * qué el pipeline no lo aprobó", no solo "sin verificar".
 *
 * Revisar esto es OPCIONAL: el producto funciona sin que nadie lo abra — es
 * una herramienta de consulta, no un paso obligatorio de publicación.
 */

interface RawSearchParams {
  kind?: string;
  areaId?: string;
  subjectId?: string;
  topicId?: string;
  page?: string;
  [key: string]: string | undefined;
}

function parseKind(raw: string | undefined): ReviewQueueKind {
  return REVIEW_QUEUE_ORDER.includes(raw as ReviewQueueKind) ? (raw as ReviewQueueKind) : 'discrepancy';
}

export default async function QueuePage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const sp = await searchParams;
  const kind = parseKind(sp.kind);
  const page = sp.page ? Math.max(1, parseInt(sp.page, 10) || 1) : 1;

  const [taxonomy, result] = await Promise.all([
    loadFilterTaxonomy(),
    listReviewQueue(kind, {
      areaId: sp.areaId,
      subjectId: sp.subjectId,
      topicId: sp.topicId,
      page,
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Revisión de contenido</h1>
        <p className="text-text-secondary">
          Reactivos que el pipeline adversarial (F2) no auto-aprobó. Consultarlos es opcional — el
          producto funciona sin hacerlo.
        </p>
      </div>

      <ReviewTabs
        active={kind}
        counts={result.counts}
        basePath="/admin/questions/queue"
        extraParams={{ areaId: sp.areaId, subjectId: sp.subjectId, topicId: sp.topicId }}
      />

      <QueueFilterBar
        taxonomy={taxonomy}
        current={sp}
        action="/admin/questions/queue"
        hiddenFields={{ kind }}
      />

      <p className="text-sm text-text-secondary">
        {result.total} reactivo{result.total === 1 ? '' : 's'} en &ldquo;{REVIEW_QUEUE_LABELS[kind]}&rdquo;.
      </p>

      {result.items.length === 0 ? (
        <Card className="p-8 text-center text-text-secondary">Nada en esta cola. 🎉</Card>
      ) : (
        <div className="space-y-3">
          {result.items.map((q) => {
            const v = q.verificationRecord;
            return (
              <Card key={q.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
                      <span>
                        {q.topic.subject.area.name} · {q.topic.subject.name} · {q.topic.name}
                      </span>
                      <GroundingBadge status={q.groundingStatus} />
                    </div>
                    <p className="line-clamp-2 text-sm text-text-primary">
                      <LatexText text={q.stem} />
                    </p>
                    <p className="text-xs text-text-secondary">
                      🤖 Generador: <strong>{v.generatorOption}</strong> · 🔍 Verificador:{' '}
                      <strong>{v.verdict.chosenOption}</strong> · confianza{' '}
                      {(v.verdict.confidence * 100).toFixed(0)}%
                      {v.audit && (
                        <>
                          {' '}
                          · auditoría: <strong>{v.audit.verdict.chosenOption}</strong>
                        </>
                      )}
                    </p>
                  </div>
                  <Link
                    href={`/admin/questions/${q.id}`}
                    className="min-h-touch inline-flex shrink-0 items-center rounded-md bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-hover"
                  >
                    Revisar
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Pagination
        page={result.page}
        totalPages={result.totalPages}
        searchParams={{ ...sp, kind }}
        basePath="/admin/questions/queue"
      />
    </div>
  );
}
