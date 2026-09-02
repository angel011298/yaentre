import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import type { ParentDashboardData } from '@/lib/db/parent';
import { WeekActivityStrip } from './WeekActivityStrip';
import { WeeklyEmailToggle } from './WeeklyEmailToggle';

function countdownCopy(daysRemaining: number): string {
  if (daysRemaining > 1) return `Faltan ${daysRemaining} días para su examen`;
  if (daysRemaining === 1) return 'Su examen es mañana';
  if (daysRemaining === 0) return 'Su examen es hoy';
  return 'Su examen ya pasó';
}

/**
 * Panel parental desbloqueado (F16 tarea 3, PRD F-06): racha, predicción +
 * cambio semanal, actividad de la semana, últimos 3 simulacros, cuenta
 * regresiva, alerta de inactividad y el toggle de resumen semanal. Todo lo
 * que recibe ya viene agregado desde `loadParentDashboardData` — este
 * componente solo presenta, nunca vuelve a tocar la DB.
 */
export function ParentDashboard({
  data,
  weeklyEmailEnabled,
}: {
  data: ParentDashboardData;
  weeklyEmailEnabled: boolean;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-text-primary">
          Progreso de {data.studentName}
        </h1>
        {data.countdown && (
          <p className="text-text-secondary">{countdownCopy(data.countdown.daysRemaining)}</p>
        )}
      </div>

      {data.isInactive && (
        <Card className="border-danger/40 bg-danger/10 p-4">
          <p className="text-sm font-semibold text-danger">
            ⚠️ Sin actividad en 3 días o más — {data.studentName} no ha estudiado recientemente.
          </p>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Racha actual
          </p>
          <p className="mt-1 font-display text-3xl font-bold text-streak">
            🔥 {data.currentStreak} {data.currentStreak === 1 ? 'día' : 'días'}
          </p>
        </Card>

        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Predicción de aciertos
          </p>
          <p className="mt-1 font-display text-3xl font-bold text-text-primary">
            {data.predictedScore ?? '—'}
          </p>
          {data.weekDelta != null && (
            <p className="mt-1 text-xs text-text-secondary">
              {data.weekDelta >= 0 ? '+' : ''}
              {data.weekDelta} vs. la semana pasada
            </p>
          )}
        </Card>
      </div>

      <Card className="p-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-muted">
          Actividad de la semana
        </p>
        <WeekActivityStrip data={data.weekActivity} />
      </Card>

      <Card className="p-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-muted">
          Últimos simulacros
        </p>
        {data.recentSimulations.length > 0 ? (
          <ul className="space-y-2">
            {data.recentSimulations.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between rounded-md border border-border-subtle bg-elevated p-3 text-sm"
              >
                <span className="text-text-primary">
                  {s.finishedAt.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                </span>
                <span className="font-mono tabular-nums text-text-secondary">
                  {s.score ?? 0}/{s.totalQuestions}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-text-secondary">Todavía no completa ningún simulacro.</p>
        )}
      </Card>

      <Card className="p-5">
        <WeeklyEmailToggle initialEnabled={weeklyEmailEnabled} />
      </Card>

      <p className="text-center text-xs text-text-muted">
        Este panel solo muestra métricas de actividad y progreso — nunca reactivos ni respuestas.
      </p>

      <div className="text-center">
        <Link
          href="/"
          className="inline-flex min-h-touch items-center text-sm font-semibold text-text-secondary hover:text-brand"
        >
          Ir a yaentre.com
        </Link>
      </div>
    </div>
  );
}
