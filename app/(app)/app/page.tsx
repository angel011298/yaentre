import Link from 'next/link';
import { signOutAction } from '@/app/actions/auth';
import { startDiagnosticAction } from '@/app/actions/onboarding';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Tino } from '@/components/mascot/Tino';
import { requireOnboarding } from '@/lib/auth/guards';

// TODO(CC-10): reemplazar este placeholder por el dashboard real (Aciertómetro,
// racha, heatmap, temas a reforzar — ver docs/UIUX_Spec_Acierta_v1.0.md §8.1).
// El Aciertómetro DEBE presentar la meta de aciertos vía
// formatAciertometroTarget (src/lib/adaptive/aciertometro.ts, CC-13) —
// nunca como una cifra absoluta. Ver docs/ACIERTOS_MINIMOS.md.
export default async function DashboardPage() {
  const { authUser, profile } = await requireOnboarding();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">¡Hola! 👋</h1>
      <p className="text-[var(--text-secondary)]">
        Sesión iniciada como{' '}
        <span className="text-[var(--text-primary)]">{authUser.email}</span>.
      </p>
      <p className="text-sm text-[var(--text-muted)]">
        Rol: {profile.role} · Onboarding: paso {profile.onboardingStep}
      </p>

      {!profile.diagnosticDone && (
        <Card className="flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Tino state="encouraging" size={56} />
            <div>
              <p className="font-display font-semibold text-text-primary">
                Completa tu diagnóstico
              </p>
              <p className="text-sm text-text-secondary">
                30 preguntas para saber en qué reforzar. Tú decides cuándo.
              </p>
            </div>
          </div>
          <form action={startDiagnosticAction}>
            <Button type="submit" variant="primary" className="whitespace-nowrap">
              Empezar ahora
            </Button>
          </form>
        </Card>
      )}

      <Link
        href="/app/examen-oficial"
        className="inline-flex min-h-touch w-fit items-center rounded-md border border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] transition-all hover:bg-[var(--elevated)] active:scale-[0.97]"
      >
        📄 Examen muestra oficial
      </Link>
      <form action={signOutAction}>
        <button
          type="submit"
          className="text-sm font-semibold text-[var(--brand-soft)] hover:underline"
        >
          Cerrar sesión
        </button>
      </form>
    </div>
  );
}
