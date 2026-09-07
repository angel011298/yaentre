import Link from 'next/link';
import { LatexText } from '@/components/admin/LatexText';
import { ResolveReportsButton } from '@/components/admin/ResolveReportsButton';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { listUnresolvedReportedQuestions, REPORT_THRESHOLD } from '@/lib/db/admin-questions';

export const metadata = { title: 'Reportes de reactivos' };

export default async function ReportsPage() {
  const questions = await listUnresolvedReportedQuestions();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Reactivos reportados</h1>
        <p className="text-text-secondary">
          Reactivos con {REPORT_THRESHOLD} o más reportes sin resolver de usuarios.
        </p>
      </div>

      {questions.length === 0 ? (
        <Card className="p-8 text-center text-text-secondary">
          No hay reactivos con reportes pendientes por encima del umbral. 🎉
        </Card>
      ) : (
        <div className="space-y-3">
          {questions.map((q) => (
            <Card key={q.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-text-muted">
                    {q.topic.subject.area.name} · {q.topic.subject.name} · {q.topic.name}
                  </p>
                  <p className="mt-1 text-sm text-text-primary">
                    <LatexText text={q.stem} />
                  </p>
                  <p className="mt-1 text-sm font-semibold text-danger">
                    ⚠️ {q.unresolvedCount} reporte{q.unresolvedCount === 1 ? '' : 's'} sin resolver
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Link href={`/admin/questions/${q.id}`}>
                    <Button variant="secondary">Ver</Button>
                  </Link>
                  <ResolveReportsButton questionId={q.id} />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
