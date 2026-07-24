import Link from 'next/link';
import { AciertometroLoader as Aciertometro } from '@/components/gamification/AciertometroLoader';
import { Tino } from '@/components/mascot/Tino';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { formatAciertometroTarget } from '@/lib/adaptive/aciertometro';
import type { SimulatorResultData } from '@/lib/db/simulator';
import { formatClock } from '@/lib/simulator/time';

/**
 * Resultados del simulacro (F12 tarea 7). Aquí regresa la calidez (UIUX §13):
 * tras el modo serio, Tino y el Aciertómetro reaparecen. Server Component; la
 * única isla es el anillo animado. La versión rica (percentil, revisar
 * falladas) es F13 — esto es el cierre honesto del flujo.
 */
export function SimulatorResult({ data }: { data: SimulatorResultData }) {
  const timedOut = data.status === 'COMPLETED_BY_TIMEOUT';
  const hadIntegrity =
    data.integrity.tabBlurCount +
      data.integrity.rightClickAttempts +
      data.integrity.keyboardShortcutAttempts >
    0;

  const target = data.strategy
    ? data.strategy.chosenTarget
    : formatAciertometroTarget({
        minAciertos: null,
        minAciertosYear: null,
        minAciertosConfidence: null,
      });

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-10">
      <div className="flex items-center gap-3">
        <Tino state="encouraging" size={64} />
        <div>
          <h1 className="font-display text-xl font-bold text-text-primary">
            Terminaste tu simulacro
          </h1>
          <p className="text-sm text-text-secondary">
            {timedOut
              ? 'Se agotó el tiempo — guardamos todo lo que respondiste. Así es el examen real.'
              : 'Bien hecho. Esto es exactamente lo que vivirás el día del examen.'}
          </p>
        </div>
      </div>

      <Card className="space-y-1 p-5 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          Aciertos del simulacro
        </p>
        <p className="font-display text-3xl font-bold text-text-primary">
          {data.score}/{data.servedCount}
        </p>
        <p className="text-sm text-text-secondary">
          Tiempo: {formatClock(data.elapsedSecs)} · {data.avgSecsPerQuestion}s por pregunta
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

      {data.subjects.length > 0 && (
        <Card className="space-y-3 p-5">
          <p className="text-sm font-semibold text-text-primary">Desglose por materia</p>
          <ul className="space-y-2">
            {data.subjects.map((s) => (
              <li
                key={s.subjectId}
                className="flex items-center justify-between gap-3 rounded-md border border-border-subtle bg-elevated p-3 text-sm"
              >
                <span className="text-text-primary">{s.subjectName}</span>
                <span className="font-mono tabular-nums text-text-secondary">
                  {s.correct}/{s.total}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {hadIntegrity && (
        <p className="text-xs text-text-muted">
          Registramos {data.integrity.tabBlurCount} cambios de pestaña y algunos atajos de teclado
          durante el examen. No afecta tu resultado — es solo para que practiques mantenerte
          enfocado como en el examen real.
        </p>
      )}

      <Link href="/app">
        <Button variant="primary" className="w-full">
          Ir a mi tablero
        </Button>
      </Link>
    </div>
  );
}
