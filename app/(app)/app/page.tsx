import { signOutAction } from '@/app/actions/auth';
import { requireUser } from '@/lib/auth/guards';

// TODO(CC-10): reemplazar este placeholder por el dashboard real (Aciertómetro,
// racha, heatmap, temas a reforzar — ver docs/UIUX_Spec_Acierta_v1.0.md §8.1)
// y aplicar requireOnboarding una vez exista el flujo de onboarding.
export default async function DashboardPage() {
  const { authUser, profile } = await requireUser();

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
