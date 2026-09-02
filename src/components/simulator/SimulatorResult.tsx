import Link from 'next/link';
import { EntrometroLoader as Entrometro } from '@/components/gamification/EntrometroLoader';
import { CelebrationDisplay } from '@/components/gamification/CelebrationDisplayLazy';
import { StreakFlame } from '@/components/gamification/StreakFlame';
import { Tino } from '@/components/mascot/Tino';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { formatEntrometroTarget } from '@/lib/adaptive/entrometro';
import type { Celebration } from '@/lib/gamification/celebrations';
import type { SimulatorResultData } from '@/lib/db/simulator';
import { isPerfectRound } from '@/lib/simulator/config';
import { summarizeIntegrityEvents } from '@/lib/simulator/integrity';
import { formatClock } from '@/lib/simulator/time';
import { predictionUp, simulatorResult as simulatorResultCopy } from '@/lib/tino/copy';

/**
 * Resultados del simulacro (F13). Aquí regresa la calidez (UIUX §13): tras el
 * modo serio del simulador, Tino, el color y la celebración reaparecen.
 * Server Component — las únicas islas de cliente son el anillo animado
 * (`Entrometro`) y `CelebrationDisplay` (que respeta `prefers-reduced-motion`
 * por sí solo).
 *
 * Guardrail de acceso (tarea 1): esta función NUNCA se llama sin que
 * `loadSimulatorResult`/`loadOwnedFinishedSession` ya hayan confirmado que la
 * sesión es del dueño Y ya terminó — es lo único que hace legítimo mostrar la
 * respuesta correcta de cada reactivo (tarea 8).
 *
 * `celebration` (F15): la ÚNICA celebración grande que `selectCelebration` ya
 * decidió mostrar para esta sesión (o `null`) — viaja desde la página vía query
 * params porque `finishSimulationAction` redirige antes de que este componente
 * se monte. El tag textual "¡Ronda perfecta!" bajo el score es independiente
 * (informativo, no es "una celebración grande") y se muestra siempre que
 * aplique, gane o no la prioridad.
 */
export function SimulatorResult({
  data,
  currentStreak,
  celebration,
}: {
  data: SimulatorResultData;
  currentStreak: number;
  celebration?: Celebration | null;
}) {
  const timedOut = data.status === 'COMPLETED_BY_TIMEOUT';
  const failedCount = data.servedCount - data.score;
  const perfectRound = isPerfectRound(data.score, data.servedCount);
  const integrityItems = summarizeIntegrityEvents(data.integrity, data.suspicionEvents);

  const target = data.strategy
    ? data.strategy.chosenTarget
    : formatEntrometroTarget({
        minAciertos: null,
        minAciertosYear: null,
        minAciertosConfidence: null,
      });

  const fraction = data.servedCount > 0 ? data.score / data.servedCount : 0;
  const tino = simulatorResultCopy({ timedOut, perfectRound, fraction });

  return (
    <main className="yaentre-safe-viewport mx-auto max-w-2xl space-y-6 px-4">
      <div className="flex items-center gap-3">
        <Tino state={tino.state} size={64} />
        <div>
          <h1 className="font-display text-xl font-bold text-text-primary">
            Terminaste tu simulacro
          </h1>
          <p className="text-sm text-text-secondary">{tino.message}</p>
        </div>
      </div>

      {celebration && <CelebrationDisplay celebration={celebration} />}

      <Card className="relative space-y-1 overflow-hidden p-5 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          Aciertos del simulacro
        </p>
        <p className="font-display text-3xl font-bold text-text-primary">
          {data.score}/{data.servedCount}
        </p>
        {perfectRound && <p className="text-sm font-semibold text-success">¡Ronda perfecta! 🎉</p>}
        <p className="text-sm text-text-secondary">
          Tiempo total: {formatClock(data.elapsedSecs)} · {data.avgSecsPerQuestion}s en promedio
          por pregunta
        </p>
      </Card>

      {data.percentile != null && (
        <Card className="p-5 text-center">
          <p className="text-sm text-text-secondary">
            Le ganaste al <span className="font-semibold text-text-primary">{data.percentile}%</span>{' '}
            de quienes ya presentaron este examen en este ciclo.
          </p>
        </Card>
      )}

      {data.strategy && (
        <Card className="flex flex-col items-center gap-4 p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Tu Entrómetro
          </p>
          <Entrometro
            predictedScore={data.strategy.predictedScore}
            totalQuestions={data.examTotalQuestions}
            target={target}
            gap={data.strategy.gap}
            weekDelta={data.predictionDelta}
            deltaLabel="por este simulacro"
          />
          {data.predictionDelta != null && data.predictionDelta > 0 && (
            <div className="flex items-center gap-2">
              <Tino state={predictionUp(data.predictionDelta).state} size={32} />
              <p className="text-sm font-semibold text-success">
                {predictionUp(data.predictionDelta).message}
              </p>
            </div>
          )}
        </Card>
      )}

      {currentStreak > 0 && (
        <div className="flex items-center justify-center gap-2 text-sm text-text-secondary">
          <StreakFlame days={currentStreak} />
          <span>¡sigue así!</span>
        </div>
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
                <span className="flex items-center gap-2 text-text-primary">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: s.colorHex }}
                    aria-hidden
                  />
                  {s.subjectName}
                </span>
                <span className="font-mono tabular-nums text-text-secondary">
                  {s.correct}/{s.total}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {integrityItems.length > 0 && (
        <Card className="space-y-2 p-5">
          <p className="text-sm font-semibold text-text-primary">Durante tu simulacro</p>
          <ul className="space-y-1 text-sm text-text-secondary">
            {integrityItems.map((item) => (
              <li key={item.key}>
                {item.label}: <span className="font-mono tabular-nums">{item.count}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-text-muted">
            No afecta tu resultado aquí — es solo para practicar. En el examen real, salir de
            pantalla completa o usar estos atajos puede anular tu evaluación.
          </p>
        </Card>
      )}

      {failedCount > 0 && (
        <Link href={`/simulador?view=review&session=${data.sessionId}`}>
          <Button variant="secondary" className="w-full">
            Revisar las {failedCount} que fallé
          </Button>
        </Link>
      )}

      <Link href="/app">
        <Button variant="primary" className="w-full">
          Ir a mi tablero
        </Button>
      </Link>
    </main>
  );
}
