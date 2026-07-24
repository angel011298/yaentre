import Link from 'next/link';
import { signOutAction } from '@/app/actions/auth';
import { startDiagnosticAction } from '@/app/actions/onboarding';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { RecentSimulations } from '@/components/dashboard/RecentSimulations';
import { StartSimulationButton } from '@/components/dashboard/StartSimulationButton';
import { TinoRecommendation } from '@/components/dashboard/TinoRecommendation';
import { WeakTopicCard } from '@/components/dashboard/WeakTopicCard';
import { AciertometroLoader } from '@/components/gamification/AciertometroLoader';
import { AciertometroLocked } from '@/components/gamification/Aciertometro';
import { HeatmapCalendar } from '@/components/gamification/HeatmapCalendar';
import { requireOnboarding } from '@/lib/auth/guards';
import { computeCareerStrategy, computeWeekOverWeekDelta } from '@/lib/db/adaptive';
import {
  loadAciertometroAccess,
  loadExamCountdown,
  loadHeatmapData,
  loadRecentSimulations,
  loadWeakestTopics,
} from '@/lib/db/dashboard';

function greetingName(displayName: string | null, email: string | undefined): string {
  if (displayName) return displayName;
  return email?.split('@')[0] ?? 'de vuelta';
}

function countdownCopy(daysRemaining: number): string {
  if (daysRemaining > 1) return `Faltan ${daysRemaining} días para tu examen`;
  if (daysRemaining === 1) return 'Tu examen es mañana';
  if (daysRemaining === 0) return 'Tu examen es hoy';
  return 'Tu examen ya pasó';
}

/**
 * Dashboard del alumno (F11) — pantalla principal, punto de partida diario.
 * Server Component puro: TODA la data real se resuelve aquí en paralelo
 * (Promise.all) antes del primer render; los únicos Client Components son
 * las islas que de verdad lo necesitan (el anillo animado del Aciertómetro
 * vía `AciertometroLoader`, el heatmap SVG, y el botón de simulacro) — así
 * la carga inicial ya llega con datos reales, sin esperar hidratación
 * (Task 12).
 */
export default async function DashboardPage() {
  const { authUser, profile } = await requireOnboarding();
  const displayName = greetingName(profile.displayName, authUser.email);

  // Sin diagnóstico, no hay Aciertómetro/temas/heatmap con sentido todavía —
  // el dashboard entero se degrada a un único CTA claro (Task 10).
  if (!profile.diagnosticDone) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-2xl font-bold text-text-primary">
          ¡Hola, {displayName}! 👋
        </h1>
        <EmptyState
          title="Completa tu diagnóstico"
          description="30 preguntas para armar tu ruta de estudio y calcular tu primer Aciertómetro. Tú decides cuándo."
          action={
            <form action={startDiagnosticAction}>
              <Button type="submit" variant="primary">
                Empezar ahora
              </Button>
            </form>
          }
        />
      </div>
    );
  }

  const now = new Date();
  const [countdown, weakTopics, recentSims, heatmap, aciertometroAccess, strategy, weekDelta] =
    await Promise.all([
      loadExamCountdown(profile.id, now),
      loadWeakestTopics(profile.id, 3),
      loadRecentSimulations(profile.id, 3),
      loadHeatmapData(profile.id, now),
      loadAciertometroAccess(profile.id),
      computeCareerStrategy(profile.id),
      computeWeekOverWeekDelta(profile.id, now),
    ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-text-primary">
          ¡Hola, {displayName}! 👋
        </h1>
        {countdown && (
          <p className="text-text-secondary">{countdownCopy(countdown.daysRemaining)}</p>
        )}
      </div>

      <Card className="p-6">
        <p className="mb-4 text-center text-xs font-semibold uppercase tracking-wide text-text-muted">
          Aciertómetro
        </p>
        {aciertometroAccess.unlocked ? (
          strategy && countdown ? (
            <AciertometroLoader
              predictedScore={strategy.predictedScore}
              totalQuestions={countdown.totalQuestions}
              target={strategy.chosenTarget}
              gap={strategy.gap}
              weekDelta={weekDelta}
            />
          ) : (
            <p className="text-center text-sm text-text-muted">
              Haz tu diagnóstico para ver tu predicción.
            </p>
          )
        ) : (
          <AciertometroLocked />
        )}
      </Card>

      {weakTopics.length > 0 && <TinoRecommendation weakestTopic={weakTopics[0]} />}

      <section>
        <h2 className="mb-3 font-display text-lg font-bold text-text-primary">Tu semana</h2>
        <Card className="overflow-x-auto p-4">
          <HeatmapCalendar data={heatmap} />
        </Card>
      </section>

      <section>
        <h2 className="mb-3 font-display text-lg font-bold text-text-primary">Reforzar hoy</h2>
        {weakTopics.length > 0 ? (
          <div className="flex gap-3 overflow-x-auto pb-1 sm:grid sm:grid-cols-3 sm:overflow-visible">
            {weakTopics.map((topic) => (
              <WeakTopicCard key={topic.topicId} topic={topic} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Todavía no identificamos temas débiles"
            description="Sigue practicando y aquí van a aparecer los temas donde más te conviene enfocarte."
            action={
              <Link href="#simulacro-cta" className="text-sm font-semibold text-brand hover:underline">
                Practicar ahora ↓
              </Link>
            }
          />
        )}
      </section>

      <section>
        <h2 className="mb-3 font-display text-lg font-bold text-text-primary">
          Simulacros recientes
        </h2>
        {recentSims.length > 0 ? (
          <RecentSimulations simulations={recentSims} />
        ) : (
          <EmptyState
            title="Aún no haces ningún simulacro"
            description="¡El primero es el más importante! 🦉"
            action={
              <Link href="#simulacro-cta" className="text-sm font-semibold text-brand hover:underline">
                Hacer mi primer simulacro ↓
              </Link>
            }
          />
        )}
      </section>

      {profile.targetExamId && <StartSimulationButton />}

      <div className="flex flex-wrap items-center gap-4 border-t border-border-subtle pt-4">
        <Link
          href="/app/examen-oficial"
          className="text-sm font-semibold text-text-muted hover:text-brand"
        >
          📄 Examen muestra oficial
        </Link>
        <form action={signOutAction}>
          <button type="submit" className="text-sm font-semibold text-brand-soft hover:underline">
            Cerrar sesión
          </button>
        </form>
      </div>
    </div>
  );
}
