import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ApproveRejectActions } from '@/components/admin/ApproveRejectActions';
import { EditQuestionModal } from '@/components/admin/EditQuestionModal';
import { LatexBlock, LatexText } from '@/components/admin/LatexText';
import { Card } from '@/components/ui/Card';
import { AdminError } from '@/lib/admin/errors';
import { getQuestionDetail } from '@/lib/db/admin-questions';
import { parseQuestionOptions } from '@/lib/sessions/scoring';

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

  const options = parseQuestionOptions(question.options);
  const unresolvedReports = question.reports.filter((r) => !r.resolved).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin/questions/queue" className="text-sm text-brand hover:underline">
            ← Volver a la cola
          </Link>
          <h1 className="font-display text-2xl font-bold">Revisión de reactivo</h1>
          <p className="text-sm text-text-muted">
            {question.topic.subject.area.exam.level.institution.name} ·{' '}
            {question.topic.subject.area.name} · {question.topic.subject.name} ·{' '}
            {question.topic.name} · {question.difficulty}
            {question.isVerified && ' · ✅ Verificado'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <EditQuestionModal
            questionId={question.id}
            stem={question.stem}
            options={options}
            difficulty={question.difficulty}
            explanations={question.explanations.map((e) => ({
              layer: e.layer,
              title: e.title,
              content: e.content,
              latexContent: e.latexContent,
            }))}
          />
          {!question.isVerified && (
            <ApproveRejectActions questionId={question.id} redirectTo="/admin/questions/queue" />
          )}
        </div>
      </div>

      <Card className="space-y-4 p-6">
        <p className="text-lg text-text-primary">
          <LatexText text={question.stem} />
        </p>

        <div className="grid gap-2 sm:grid-cols-2">
          {options.map((opt) => (
            <div
              key={opt.id}
              className={`rounded-md border p-3 text-sm ${
                opt.isCorrect
                  ? 'border-success bg-success/10 text-text-primary'
                  : 'border-border-subtle text-text-secondary'
              }`}
            >
              <span className="font-semibold">{opt.id}. </span>
              <LatexText text={opt.text} />
              {opt.isCorrect && <span className="ml-2 text-success">✓ correcta</span>}
            </div>
          ))}
        </div>
      </Card>

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
