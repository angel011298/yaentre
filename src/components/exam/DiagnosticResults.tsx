import Link from 'next/link';
import { AciertometroLoader as Aciertometro } from '@/components/gamification/AciertometroLoader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Tino } from '@/components/mascot/Tino';
import { formatAciertometroTarget } from '@/lib/adaptive/aciertometro';
import type { DiagnosticResultsData } from '@/lib/db/diagnostic';

function tinoMessage(data: DiagnosticResultsData): string {
  if (!data.strategy?.hasTarget) {
    return '¡Terminaste tu diagnóstico! Ya sé por dónde empezar a ayudarte a mejorar.';
  }
  if (data.strategy.onTrack) {
    return '¡Vas muy bien encaminado hacia tu meta! Sigamos afinando los temas que te faltan.';
  }
  return 'Este es tu punto de partida, no tu límite. Empecemos por tus temas más débiles.';
}

/**
 * Pantalla de resultados del diagnóstico (F7 Task 3): score obtenido,
 * Aciertómetro inicial animado, comparación vs. meta de carrera con el hueco
 * visible, 3 temas prioritarios y mensaje de Tino. Server Component — la
 * única pieza interactiva (el anillo animado) es `Aciertometro`.
 */
export function DiagnosticResults({ data }: { data: DiagnosticResultsData }) {
  const target = data.strategy
    ? data.strategy.chosenTarget
    : formatAciertometroTarget({ minAciertos: null, minAciertosYear: null, minAciertosConfidence: null });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Tino state={data.strategy?.onTrack ? 'celebrating' : 'encouraging'} size={64} />
        <div>
          <h1 className="font-display text-xl font-bold text-text-primary">Tu diagnóstico está listo</h1>
          <p className="text-sm text-text-secondary">{tinoMessage(data)}</p>
        </div>
      </div>

      <Card className="space-y-1 p-5 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Resultado del diagnóstico</p>
        <p className="font-display text-2xl font-bold text-text-primary">
          {data.diagnosticScore}/{data.diagnosticTotal} aciertos
        </p>
      </Card>

      {data.strategy && (
        <Card className="flex flex-col items-center gap-4 p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Tu Aciertómetro
          </p>
          <Aciertometro
            predictedScore={data.strategy.predictedScore}
            totalQuestions={data.examTotalQuestions}
            target={target}
            gap={data.strategy.gap}
          />
        </Card>
      )}

      {data.weakTopics.length > 0 && (
        <Card className="space-y-3 p-5">
          <p className="text-sm font-semibold text-text-primary">Tus 3 temas prioritarios</p>
          <ul className="space-y-2">
            {data.weakTopics.map((topic) => (
              <li
                key={topic.topicId}
                className="flex items-center justify-between gap-3 rounded-md border border-border-subtle bg-elevated p-3"
              >
                <div>
                  <p className="text-sm font-semibold text-text-primary">{topic.topicName}</p>
                  <p className="text-xs text-text-muted">
                    {topic.subjectName} · {Math.round(topic.hitRate * 100)}% de aciertos
                  </p>
                </div>
                <Link href="/app">
                  <Button variant="secondary" className="whitespace-nowrap text-xs">
                    Ir a practicar
                  </Button>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Link href="/app">
        <Button variant="primary" className="w-full">
          Ir a mi tablero
        </Button>
      </Link>
    </div>
  );
}
