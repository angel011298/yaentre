import { requireUser } from '@/lib/auth/guards';
import { loadCareerOptions, loadPlanStatus, loadProfileOverview } from '@/lib/db/profile';
import { loadMasteredSubjectBadges } from '@/lib/db/gamification';
import { isNotificationTypeEnabled } from '@/lib/db/notifications';
import { ChangePasswordForm } from '@/components/profile/ChangePasswordForm';
import { DataRightsSection } from '@/components/profile/DataRightsSection';
import { EmailVerificationCard } from '@/components/profile/EmailVerificationCard';
import { PlanSection } from '@/components/profile/PlanSection';
import { ProfileBadges } from '@/components/profile/ProfileBadges';
import { ProfileIdentityCard } from '@/components/profile/ProfileIdentityCard';
import { TargetCareerForm } from '@/components/profile/TargetCareerForm';
import { ThemeSelect } from '@/components/profile/ThemeSelect';
import { NotificationPrefsForm } from '@/components/profile/NotificationPrefsForm';
import { Card } from '@/components/ui/Card';
import { ParentLinkCard } from '@/components/dashboard/ParentLinkCard';
import { LinkedParentsCard } from '@/components/profile/LinkedParentsCard';
import { loadLinkedParents } from '@/lib/db/parent';
import { getAuthEmails } from '@/lib/db/auth-users';
import { reportSilentDegradation } from '@/lib/observability/report';

export const metadata = { title: 'Mi perfil' };

/**
 * Pantalla de perfil y ajustes (F17 tarea 2). Server Component: TODA la data
 * real se resuelve en paralelo antes del primer render (mismo patrón que el
 * dashboard, F11) — los Client Components son solo las islas que de verdad
 * necesitan interacción (cada tarjeta maneja su propio guardado).
 */
export default async function PerfilPage() {
  const { authUser, profile } = await requireUser();

  const [
    overview,
    careerOptions,
    planStatus,
    masteredSubjects,
    streakRiskEnabled,
    examCountdownEnabled,
    marketingEnabled,
    linkedParents,
  ] = await Promise.all([
    loadProfileOverview(profile.id),
    loadCareerOptions(profile.id),
    loadPlanStatus(profile.id),
    loadMasteredSubjectBadges(profile.id),
    isNotificationTypeEnabled(profile.id, 'STREAK_RISK'),
    isNotificationTypeEnabled(profile.id, 'EXAM_COUNTDOWN'),
    isNotificationTypeEnabled(profile.id, 'MARKETING'),
    loadLinkedParents(profile.id),
  ]);

  if (!overview) return null;

  // G65: el alumno tiene que poder identificar a quién le está quitando el
  // acceso. El correo del tutor es lo único que lo distingue (el onboarding de
  // tutor no pide nombre). Si `getAuthEmails` falla, la tarjeta muestra "Tu
  // tutor" y la desvinculación sigue funcionando igual.
  //
  // G73b — este `.catch(() => new Map())` era el otro sitio donde el defecto de
  // privilegios de F-06 se veía y se tapaba: la página renderizaba perfecta y
  // el fallo no dejaba rastro en ningún lado. La degradación se conserva; el
  // silencio no.
  const parentEmails =
    linkedParents.length > 0
      ? await getAuthEmails(linkedParents.map((p) => p.parentProfileId)).catch((err: unknown) => {
          reportSilentDegradation('email_recipients', err, { surface: 'perfil/tutores' });
          return new Map<string, string>();
        })
      : new Map<string, string>();
  const parentNames = Object.fromEntries(parentEmails);

  const otherBadges = overview.badges.filter((b) => !b.startsWith('MATERIA_DOMINADA:'));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="font-display text-2xl font-bold text-text-primary">Perfil y ajustes</h1>

      <ProfileIdentityCard
        initialDisplayName={overview.displayName}
        initialAvatarUrl={overview.avatarUrl}
      />

      <EmailVerificationCard verified={Boolean(authUser.email_confirmed_at)} />

      <ChangePasswordForm />

      <Card className="p-5">
        <ThemeSelect initialTheme={overview.themePref} />
      </Card>

      <Card className="p-5">
        <p className="mb-3 text-sm font-semibold text-text-primary">Notificaciones</p>
        <NotificationPrefsForm
          streakRiskEnabled={streakRiskEnabled}
          examCountdownEnabled={examCountdownEnabled}
          marketingEnabled={marketingEnabled}
        />
      </Card>

      {overview.targetCareerName && (
        <Card className="p-5">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-muted">
            {overview.targetExamName}
          </p>
          <TargetCareerForm options={careerOptions} currentCareerId={overview.targetCareerId} />
        </Card>
      )}

      <PlanSection status={planStatus} />

      <ProfileBadges masteredSubjects={masteredSubjects} otherBadges={otherBadges} />

      <ParentLinkCard />

      <LinkedParentsCard parents={linkedParents} parentNames={parentNames} />

      <DataRightsSection />
    </div>
  );
}
