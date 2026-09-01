import { Suspense } from 'react';
import Link from 'next/link';
import { signOutAction } from '@/app/actions/auth';
import { startDiagnosticAction } from '@/app/actions/onboarding';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { RecentSimulations } from '@/components/dashboard/RecentSimulations';
import { StartSimulationButton } from '@/components/dashboard/StartSimulationButton';
import { TinoRecommendation } from '@/components/dashboard/TinoRecommendation';
import { WeakTopicCard } from '@/components/dashboard/WeakTopicCard';
import { EntrometroLoader } from '@/components/gamification/EntrometroLoader';
import { EntrometroLocked } from '@/components/gamification/Entrometro';
import { HeatmapCalendar } from '@/components/gamification/HeatmapCalendar';
import { MasteredSubjectBadges } from '@/components/gamification/MasteredSubjectBadges';
import { StreakRiskBanner } from '@/components/gamification/StreakRiskBanner';
import { requireOnboarding } from '@/lib/auth/guards';
import { computeCareerStrategy, computeWeekOverWeekDelta } from '@/lib/db/adaptive';
import {
  loadEntrometroAccess,
  loadExamCountdown,
  loadHeatmapData,
  loadRecentSimulations,
  loadWeakestTopics,
} from '@/lib/db/dashboard';
import { loadMasteredSubjectBadges, loadStreakStatus } from '@/lib/db/gamification';
import { emptySimulations, noWeakTopicsYet } from '@/lib/tino/copy';

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
 *
 * G62 (rendimiento): el saludo pinta apenas responde el servidor y cada
 * tarjeta cuelga de su propio `<Suspense>` — así el `<h1>` es el LCP temprano
 * y cada sección aparece en cuanto SU consulta resuelve, no cuando termina la
 * más lenta. Antes toda la página esperaba un `Promise.all` de 9 loaders
 * antes del primer byte de contenido (TTFB ~2,3 s medido desde una máquina
 * lejos de la base; LCP ~4,5 s). Los esqueletos conservan la altura del
 * contenido real (disciplina heredada del `loading.tsx` de F20 t4) para que
 * el relleno no provoque saltos (CLS).
 */
export default async function DashboardPage() {
  const { authUser, profile } = await requireOnboarding();
  const displayName = greetingName(profile.displayName, authUser.email);

  // Sin diagnóstico, no hay Entrómetro/temas/heatmap con sentido todavía —
  // el dashboard entero se degrada a un único CTA claro (Task 10).
  if (!profile.diagnosticDone) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-2xl font-bold text-text-primary">
          ¡Hola, {displayName}! 👋
        </h1>
        <EmptyState
          title="Completa tu diagnóstico"
          description="30 preguntas para armar tu ruta de estudio y calcular tu primer Entrómetro. Tú decides cuándo."
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

  const pid = profile.id;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-text-primary">
          ¡Hola, {displayName}! 👋
        </h1>
        <Suspense fallback={<Skeleton className="mt-1 h-5 w-56" />}>
          <ExamCountdownLine profileId={pid} />
        </Suspense>
      </div>

      <Suspense fallback={null}>
        <StreakAndBadges profileId={pid} />
      </Suspense>

      <Suspense
        fallback={
          <Card className="space-y-4 p-6">
            <Skeleton className="mx-auto h-3 w-24" />
            <Skeleton className="mx-auto h-40 w-40 rounded-full" />
            <Skeleton className="mx-auto h-4 w-40" />
            <Skeleton className="mx-auto h-4 w-56" />
          </Card>
        }
      >
        <EntrometroCard profileId={pid} />
      </Suspense>

      {/* `h-[123px]` = alto real de `TinoRecommendation` (Tino 48px + 3 líneas
          de texto en `p-4`); antes el esqueleto era más bajo y el contenido
          real empujaba lo de abajo al llegar. */}
      <Suspense fallback={<Skeleton className="h-[123px] w-full rounded-lg" />}>
        <TinoRecommendationSection profileId={pid} />
      </Suspense>

      <section>
        <h2 className="mb-3 font-display text-lg font-bold text-text-primary">Tu semana</h2>
        {/* Altura fija (G62): el heatmap (react-calendar-heatmap) recalcula el
            alto de su SVG al hidratar en el cliente; sin reservar el espacio,
            ese reajuste empujaba las secciones de abajo (CLS ~0.09 medido). */}
        <Suspense
          fallback={
            <Card className="h-[254px] p-4">
              <Skeleton className="h-full w-full" />
            </Card>
          }
        >
          <WeekHeatmapCard profileId={pid} />
        </Suspense>
      </section>

      <section>
        <h2 className="mb-3 font-display text-lg font-bold text-text-primary">Reforzar hoy</h2>
        <Suspense
          fallback={
            <div className="flex gap-3 overflow-hidden">
              <Skeleton className="h-[226px] min-w-[160px] flex-1" />
              <Skeleton className="h-[226px] min-w-[160px] flex-1" />
              <Skeleton className="h-[226px] min-w-[160px] flex-1" />
            </div>
          }
        >
          <ReforzarHoySection profileId={pid} />
        </Suspense>
      </section>

      <section>
        <h2 className="mb-3 font-display text-lg font-bold text-text-primary">
          Simulacros recientes
        </h2>
        <Suspense fallback={<Skeleton className="h-[100px] w-full rounded-lg" />}>
          <RecentSimulationsSection profileId={pid} />
        </Suspense>
      </section>

      {profile.targetExamId && <StartSimulationButton />}

      <div className="flex flex-wrap items-center gap-4 border-t border-border-subtle pt-4">
        <Link
          href="/app/examen-oficial"
          className="text-sm font-semibold text-text-muted hover:text-brand-soft"
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

async function ExamCountdownLine({ profileId }: { profileId: string }) {
  const countdown = await loadExamCountdown(profileId);
  if (!countdown) return null;
  return <p className="mt-1 text-text-secondary">{countdownCopy(countdown.daysRemaining)}</p>;
}

async function StreakAndBadges({ profileId }: { profileId: string }) {
  const [streakStatus, masteredBadges] = await Promise.all([
    loadStreakStatus(profileId, new Date()),
    loadMasteredSubjectBadges(profileId),
  ]);
  return (
    <>
      {streakStatus.atRisk && <StreakRiskBanner days={streakStatus.currentStreak} />}
      <MasteredSubjectBadges badges={masteredBadges} />
    </>
  );
}

async function EntrometroCard({ profileId }: { profileId: string }) {
  const [entrometroAccess, strategy, countdown, weekDelta] = await Promise.all([
    loadEntrometroAccess(profileId),
    computeCareerStrategy(profileId),
    loadExamCountdown(profileId),
    computeWeekOverWeekDelta(profileId, new Date()),
  ]);

  return (
    <Card className="p-6">
      <p className="mb-4 text-center text-xs font-semibold uppercase tracking-wide text-text-muted">
        Entrómetro
      </p>
      {entrometroAccess.unlocked ? (
        strategy && countdown ? (
          <EntrometroLoader
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
        <EntrometroLocked />
      )}
    </Card>
  );
}

async function TinoRecommendationSection({ profileId }: { profileId: string }) {
  const weakTopics = await loadWeakestTopics(profileId, 3);
  if (weakTopics.length === 0) return null;
  return <TinoRecommendation weakestTopic={weakTopics[0]} />;
}

async function WeekHeatmapCard({ profileId }: { profileId: string }) {
  const heatmap = await loadHeatmapData(profileId, new Date());
  // `h-[254px]` = mismo alto que el esqueleto de `<Suspense>` (ver arriba),
  // para que el swap no mueva nada aunque el SVG del heatmap se reajuste.
  return (
    <Card className="h-[254px] overflow-auto p-4">
      <HeatmapCalendar data={heatmap} />
    </Card>
  );
}

async function ReforzarHoySection({ profileId }: { profileId: string }) {
  const weakTopics = await loadWeakestTopics(profileId, 3);
  if (weakTopics.length === 0) {
    return (
      <EmptyState
        title="Todavía no identificamos temas débiles"
        description={noWeakTopicsYet().message}
        action={
          <Link href="#simulacro-cta" className="text-sm font-semibold text-brand-soft hover:underline">
            Practicar ahora ↓
          </Link>
        }
      />
    );
  }
  return (
    <div className="flex gap-3 overflow-x-auto pb-1 sm:grid sm:grid-cols-3 sm:overflow-visible">
      {weakTopics.map((topic) => (
        <WeakTopicCard key={topic.topicId} topic={topic} />
      ))}
    </div>
  );
}

async function RecentSimulationsSection({ profileId }: { profileId: string }) {
  const recentSims = await loadRecentSimulations(profileId, 3);
  if (recentSims.length === 0) {
    return (
      <EmptyState
        title="Aún no haces ningún simulacro"
        description={emptySimulations().message}
        action={
          <Link href="#simulacro-cta" className="text-sm font-semibold text-brand-soft hover:underline">
            Hacer mi primer simulacro ↓
          </Link>
        }
      />
    );
  }
  return <RecentSimulations simulations={recentSims} />;
}
