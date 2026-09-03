import { startDiagnosticAction } from '@/app/actions/onboarding';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { EntrometroLocked } from '@/components/gamification/Entrometro';
import { EntrometroHistoryChart } from '@/components/progress/EntrometroHistoryChart';
import { CumulativeStatsGrid } from '@/components/progress/CumulativeStatsGrid';
import { SimulationHistoryList } from '@/components/progress/SimulationHistoryList';
import { SubjectMasteryList } from '@/components/progress/SubjectMasteryList';
import { ProfileBadges } from '@/components/profile/ProfileBadges';
import { requireOnboarding } from '@/lib/auth/guards';
import { loadEntrometroAccess } from '@/lib/db/dashboard';
import { loadMasteredSubjectBadges } from '@/lib/db/gamification';
import { loadProfileOverview } from '@/lib/db/profile';
import {
  loadEntrometroHistory,
  loadCumulativeStats,
  loadSimulationHistory,
  loadSubjectMastery,
} from '@/lib/db/progress';

export const metadata = { title: 'Mi progreso' };

/**
 * Pantalla de trayectoria a largo plazo (F18): evolución del Entrómetro,
 * dominio por materia, historial completo de simulacros, estadísticas
 * acumuladas e insignias. Server Component: todos los loaders son de solo
 * lectura y corren en paralelo (mismo patrón que el dashboard, F11).
 */
export default async function ProgresoPage() {
  const { profile } = await requireOnboarding();

  // Mismo criterio que el dashboard (F11 Task 10): sin diagnóstico no hay
  // historial real que mostrar todavía — un único CTA claro en vez de una
  // pantalla con seis secciones vacías.
  if (!profile.diagnosticDone) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-2xl font-bold text-text-primary">Tu progreso</h1>
        <EmptyState
          title="Completa tu diagnóstico"
          description="En cuanto termines tu primer diagnóstico vas a ver aquí tu evolución completa."
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

  const [access, history, subjects, simulations, stats, masteredSubjects, overview] = await Promise.all([
    loadEntrometroAccess(profile.id),
    loadEntrometroHistory(profile.id),
    loadSubjectMastery(profile.id),
    loadSimulationHistory(profile.id),
    loadCumulativeStats(profile.id),
    loadMasteredSubjectBadges(profile.id),
    loadProfileOverview(profile.id),
  ]);

  const otherBadges = (overview?.badges ?? []).filter((b) => !b.startsWith('MATERIA_DOMINADA:'));

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-text-primary">Tu progreso</h1>

      <Card className="p-5">
        <p className="mb-3 text-sm font-semibold text-text-primary">Evolución del Entrómetro</p>
        {access.unlocked ? (
          history.length > 0 ? (
            <EntrometroHistoryChart data={history} />
          ) : (
            <p className="text-sm text-text-secondary">
              Termina una sesión para empezar a ver tu evolución aquí.
            </p>
          )
        ) : (
          <EntrometroLocked />
        )}
      </Card>

      <section>
        <h2 className="mb-3 font-display text-lg font-bold text-text-primary">Estadísticas acumuladas</h2>
        <CumulativeStatsGrid stats={stats} />
      </section>

      <Card className="p-5">
        <p className="text-sm font-semibold text-text-primary">Dominio por materia</p>
        <p className="mb-2 text-xs text-text-muted">De lo más débil a lo más fuerte</p>
        {subjects.length > 0 ? (
          <SubjectMasteryList subjects={subjects} />
        ) : (
          <p className="text-sm text-text-secondary">
            Aún no hay suficiente actividad para mostrar tu dominio por materia.
          </p>
        )}
      </Card>

      <Card className="p-5">
        <p className="mb-3 text-sm font-semibold text-text-primary">Historial de simulacros</p>
        {simulations.length > 0 ? (
          <SimulationHistoryList simulations={simulations} />
        ) : (
          <p className="text-sm text-text-secondary">Aún no haces ningún simulacro completo.</p>
        )}
      </Card>

      <ProfileBadges masteredSubjects={masteredSubjects} otherBadges={otherBadges} />
    </div>
  );
}
