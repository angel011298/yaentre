import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ApproveRejectActions } from '@/components/admin/ApproveRejectActions';
import { EditQuestionModal } from '@/components/admin/EditQuestionModal';
import { GroundingBadge } from '@/components/admin/GroundingBadge';
import { LatexBlock, LatexText } from '@/components/admin/LatexText';
import { OptionCard } from '@/components/admin/OptionCard';
import { PassageBlock } from '@/components/admin/PassageBlock';
import { ReviewDecisionPanel } from '@/components/admin/ReviewDecisionPanel';
import { Card } from '@/components/ui/Card';
import { AdminError } from '@/lib/admin/errors';
import { parseAdminOptions, parseVerificationRecord } from '@/lib/admin/verification';
import { getQuestionDetail } from '@/lib/db/admin-questions';

export default async function QuestionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let question;
  try {
    question = await getQuestionDetail(id);
  } catch (err) {
    if (err instanceof AdminError && err.code === 'NOT_FOUND') {
      notFound();
    }
    throw err;
  }

  const options = parseAdminOptions(question.options);
  const unresolvedReports = question.reports.filter((r) => !r.resolved).length;

  // F3: si el pipeline lo dejó UNPUBLISHED (y nadie lo resolvió ya a mano),
  // el panel de decisión reemplaza la vista de solo-lectura.
  const record = parseVerificationRecord(question.verification);
  const isPendingReview = record?.decision === 'UNPUBLISHED' && !record.manualReview;

  const explanationsForEdit = question.explanations.map((e) => ({
    layer: e.layer,
    title: e.title,
    content: e.content,
    latexContent: e.latexContent,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <Link href="/admin/questions/queue" className="text-sm text-brand hover:underline">
            ← Volver a la cola
          </Link>
          <h1 className="font-display text-2xl font-bold">Revisión de reactivo</h1>
          <p className="flex flex-wrap items-center gap-2 text-sm text-text-muted">
            <span>
              {question.topic.subject.area.exam.level.institution.name} ·{' '}
              {question.topic.subject.area.name} · {question.topic.subject.name} ·{' '}
              {question.topic.name} · {question.difficulty}
              {question.isVerified && ' · ✅ Verificado'}
            </span>
            <GroundingBadge status={question.groundingStatus} />
          </p>
        </div>
        {!isPendingReview && (
          <div className="flex items-center gap-2">
            <EditQuestionModal
              questionId={question.id}
              stem={question.stem}
              options={options}
              difficulty={question.difficulty}
              explanations={explanationsForEdit}
            />
            {!question.isVerified && (
              <ApproveRejectActions questionId={question.id} redirectTo="/admin/questions/queue" />
            )}
          </div>
        )}
      </div>

      {question.passage && (
        <PassageBlock
          title={question.passage.title}
          content={question.passage.content}
          sourceRef={question.passage.sourceRef}
        />
      )}

      {question.groundingStatus === 'SOURCED' && question.sourceChunks.length > 0 && (
        <Card className="space-y-2 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Fragmento(s) fuente citado(s)
          </p>
          {question.sourceChunks.map(({ sourceChunk }) => (
            <div
              key={sourceChunk.id}
              className="rounded-md border border-info/30 bg-info/5 p-3 text-sm text-text-secondary"
            >
              <p className="text-xs text-text-muted">
                {sourceChunk.contentSource.name}
                {sourceChunk.locationRef ? ` · ${sourceChunk.locationRef}` : ''}
              </p>
              <p className="mt-1">{sourceChunk.excerpt}</p>
            </div>
          ))}
        </Card>
      )}

      {isPendingReview && record ? (
        <ReviewDecisionPanel
          questionId={question.id}
          stem={question.stem}
          imageUrl={question.imageUrl}
          options={options}
          difficulty={question.difficulty}
          explanations={explanationsForEdit}
          record={record}
        />
      ) : (
        <Card className="space-y-4 p-6">
          <p className="text-lg text-text-primary">
            <LatexText text={question.stem} />
          </p>
          {question.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={question.imageUrl}
              alt="Reactivo"
              className="max-h-72 w-auto rounded-md border border-border-subtle"
            />
          )}

          <div className="grid gap-2 sm:grid-cols-2">
            {options.map((opt) => (
              <OptionCard key={opt.id} {...opt} />
            ))}
          </div>

          {record && (
            <details className="rounded-md border border-border-subtle p-3 text-sm">
              <summary className="cursor-pointer font-medium text-text-secondary">
                Veredicto del pipeline (
                {record.decision === 'AUTO_APPROVED' ? 'auto-aprobado' : 'resuelto manualmente'})
              </summary>
              <div className="mt-2 space-y-1 text-text-secondary">
                <p>
                  Generador: <strong>{record.generatorOption}</strong> · Verificador:{' '}
                  <strong>{record.verdict.chosenOption}</strong> · confianza{' '}
                  {(record.verdict.confidence * 100).toFixed(0)}%
                </p>
                <p>{record.verdict.reasoning}</p>
                {record.manualReview && (
                  <p className="text-xs text-text-muted">
                    Resuelto a mano ({record.manualReview.action}) el{' '}
                    {new Date(record.manualReview.at).toLocaleString('es-MX')}
                  </p>
                )}
              </div>
            </details>
          )}
        </Card>
      )}

      <div className="space-y-4">
        {question.explanations.map((exp) => (
          <Card key={exp.id} className="space-y-2 p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              Capa {exp.layer} — {exp.title}
            </p>
            <p className="text-text-primary">
              <LatexText text={exp.content} />
            </p>
            {exp.latexContent && <LatexBlock latex={exp.latexContent} />}
          </Card>
        ))}
      </div>

      {question.reports.length > 0 && (
        <Card className="space-y-2 p-6">
          <p className="font-semibold text-text-primary">
            Reportes ({unresolvedReports} sin resolver de {question.reports.length})
          </p>
          <ul className="space-y-1 text-sm text-text-secondary">
            {question.reports.map((r) => (
              <li key={r.id}>
                {r.resolved ? '✅' : '⚠️'} {r.reason ?? 'Sin razón especificada'} —{' '}
                {r.createdAt.toLocaleDateString('es-MX')}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
