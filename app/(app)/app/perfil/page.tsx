import type { ReactNode } from 'react';
import { requireUser } from '@/lib/auth/guards';
import {
  loadFocusSubjectOptions,
  loadPlanStatus,
  loadProfileOverview,
} from '@/lib/db/profile';
import { loadExamCountdown } from '@/lib/db/dashboard';
import { loadAcademicTargetCatalog } from '@/lib/db/academic-target';
import { loadMasteredSubjectBadges } from '@/lib/db/gamification';
import { isNotificationTypeEnabled } from '@/lib/db/notifications';
import { hasVerifiedTotp } from '@/lib/auth/mfa';
import { isGoogleAuthEnabled } from '@/lib/auth/google';
import { linkGoogleAction, signOutEverywhereAction } from '@/app/actions/security';
import { ChangePasswordForm } from '@/components/profile/ChangePasswordForm';
import { DataRightsSection } from '@/components/profile/DataRightsSection';
import { EmailVerificationCard } from '@/components/profile/EmailVerificationCard';
import { PlanSection } from '@/components/profile/PlanSection';
import { ProfileBadges } from '@/components/profile/ProfileBadges';
import { ProfileIdentityCard } from '@/components/profile/ProfileIdentityCard';
import { SecuritySettings } from '@/components/profile/SecuritySettings';
import { StudyPrefsForm } from '@/components/profile/StudyPrefsForm';
import { AcademicTargetForm } from '@/components/profile/AcademicTargetForm';
import { ThemeSelect } from '@/components/profile/ThemeSelect';
import { NotificationPrefsForm } from '@/components/profile/NotificationPrefsForm';
import { Card } from '@/components/ui/Card';
import { ParentLinkCard } from '@/components/dashboard/ParentLinkCard';
import { LinkedParentsCard } from '@/components/profile/LinkedParentsCard';
import { loadLinkedParents } from '@/lib/db/parent';
import { getAuthEmails } from '@/lib/db/auth-users';
import { reportSilentDegradation } from '@/lib/observability/report';

export const metadata = { title: 'Perfil y ajustes' };

/** G100: índice de la página — anclas estables, enlazables desde el tablero
 *  («Ajustar» de «Meta de hoy» → #estudio) y desde los correos. */
const SECTIONS = [
  { id: 'cuenta', label: 'Cuenta' },
  { id: 'meta', label: 'Meta' },
  { id: 'estudio', label: 'Estudio' },
  { id: 'notificaciones', label: 'Avisos' },
  { id: 'apariencia', label: 'Apariencia' },
  { id: 'seguridad', label: 'Seguridad' },
  { id: 'plan', label: 'Plan' },
  { id: 'familia', label: 'Familia' },
  { id: 'privacidad', label: 'Privacidad' },
] as const;

function SettingsSection({
  id,
  title,
  description,
  children,
}: {
  id: (typeof SECTIONS)[number]['id'];
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    // `scroll-mt` deja el título visible bajo la barra superior al saltar al ancla.
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24 space-y-3">
      <div>
        <h2 id={`${id}-title`} className="font-display text-lg font-bold text-text-primary">
          {title}
        </h2>
        {description && <p className="text-sm text-text-muted">{description}</p>}
      </div>
      {children}
    </section>
  );
}

const GOOGLE_NOTICES: Record<string, { tone: 'success' | 'danger'; text: string }> = {
  linked: { tone: 'success', text: 'Listo: Google quedó vinculado a tu cuenta.' },
  failed: { tone: 'danger', text: 'No pudimos vincular Google. Intenta de nuevo.' },
  disabled: { tone: 'danger', text: 'El inicio con Google no está disponible por ahora.' },
};

/**
 * Perfil y ajustes (F17; G100 la reorganiza por secciones y añade apariencia
 * completa, preferencias de estudio, recordatorios con horario, verificación
 * en dos pasos, Google y cambio de correo). Server Component: toda la data se
 * resuelve en paralelo antes del primer render; cada tarjeta interactiva
 * guarda por su cuenta (no hay un «Guardar» global que olvidar).
 */
export default async function PerfilPage({
  searchParams,
}: {
  searchParams: Promise<{ google?: string }>;
}) {
  const { authUser, profile } = await requireUser();
  const { google } = await searchParams;

  const [
    overview,
    catalog,
    focusOptions,
    planStatus,
    masteredSubjects,
    countdown,
    streakRiskEnabled,
    examCountdownEnabled,
    marketingEnabled,
    studyReminderEnabled,
    simulationReminderEnabled,
    linkedParents,
  ] = await Promise.all([
    loadProfileOverview(profile.id),
    loadAcademicTargetCatalog(),
    loadFocusSubjectOptions(profile.id),
    loadPlanStatus(profile.id),
    loadMasteredSubjectBadges(profile.id),
    loadExamCountdown(profile.id),
    isNotificationTypeEnabled(profile.id, 'STREAK_RISK'),
    isNotificationTypeEnabled(profile.id, 'EXAM_COUNTDOWN'),
    isNotificationTypeEnabled(profile.id, 'MARKETING'),
    isNotificationTypeEnabled(profile.id, 'STUDY_REMINDER'),
    isNotificationTypeEnabled(profile.id, 'SIMULATION_REMINDER'),
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
  const identities = authUser.identities ?? [];
  const hasPassword = identities.some((i) => i.provider === 'email');
  const googleLinked = identities.some((i) => i.provider === 'google');
  // Un foco guardado para otra área (el alumno cambió de área en el
  // onboarding) no se muestra ni aplica: solo cuentan las materias de la suya.
  const focusIds = overview.focusSubjectIds.filter((id) => focusOptions.some((s) => s.id === id));
  const googleNotice = google ? GOOGLE_NOTICES[google] : undefined;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="space-y-3">
        <h1 className="font-display text-2xl font-bold text-text-primary">Perfil y ajustes</h1>
        <nav aria-label="Secciones de ajustes" className="-mx-4 overflow-x-auto px-4">
          <ul className="flex gap-2">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="inline-flex min-h-touch items-center whitespace-nowrap rounded-full border border-border-subtle bg-surface px-3 text-sm font-medium text-text-secondary hover:bg-elevated hover:text-text-primary"
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <SettingsSection id="cuenta" title="Cuenta">
        <ProfileIdentityCard
          initialDisplayName={overview.displayName}
          initialAvatarUrl={overview.avatarUrl}
        />
        <EmailVerificationCard verified={Boolean(authUser.email_confirmed_at)} />
        <ProfileBadges masteredSubjects={masteredSubjects} otherBadges={otherBadges} />
      </SettingsSection>

      <SettingsSection
        id="meta"
        title="Meta académica"
        description={
          countdown && countdown.daysRemaining > 0
            ? `${countdown.examName} · faltan ${countdown.daysRemaining} días (fecha oficial).`
            : undefined
        }
      >
        <Card className="p-5">
          <AcademicTargetForm catalog={catalog} currentCareerId={overview.targetCareerId} />
        </Card>
      </SettingsSection>

      <SettingsSection
        id="estudio"
        title="Preferencias de estudio"
        description="Ajusta tu ritmo y qué quieres practicar más."
      >
        <Card className="p-5">
          <StudyPrefsForm
            initialGoal={overview.dailyGoalMins}
            daysUntilExam={countdown?.daysRemaining ?? null}
            subjects={focusOptions}
            initialFocus={focusIds}
          />
        </Card>
      </SettingsSection>

      <SettingsSection id="notificaciones" title="Notificaciones y recordatorios">
        <Card className="p-5">
          <NotificationPrefsForm
            streakRiskEnabled={streakRiskEnabled}
            examCountdownEnabled={examCountdownEnabled}
            marketingEnabled={marketingEnabled}
            studyReminderEnabled={studyReminderEnabled}
            simulationReminderEnabled={simulationReminderEnabled}
            reminderHour={overview.reminderHour}
            reminderDays={overview.reminderDays}
          />
        </Card>
      </SettingsSection>

      <SettingsSection
        id="apariencia"
        title="Apariencia y accesibilidad"
        description="Se guarda en tu cuenta: la verás igual en todos tus dispositivos."
      >
        <Card className="p-5">
          <ThemeSelect initialTheme={overview.themePref} initialFontScale={overview.fontScale} />
        </Card>
      </SettingsSection>

      <SettingsSection id="seguridad" title="Cuenta y seguridad">
        {googleNotice && (
          <p
            role={googleNotice.tone === 'danger' ? 'alert' : 'status'}
            className={`rounded-md px-3 py-2 text-sm ${
              googleNotice.tone === 'danger' ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success'
            }`}
          >
            {googleNotice.text}
          </p>
        )}
        <Card className="p-5">
          <SecuritySettings
            email={authUser.email ?? ''}
            hasPassword={hasPassword}
            totpEnabled={hasVerifiedTotp(authUser.factors)}
            googleEnabled={isGoogleAuthEnabled()}
            googleLinked={googleLinked}
            linkGoogleSlot={
              <form action={linkGoogleAction}>
                <button
                  type="submit"
                  className="min-h-touch text-sm font-semibold text-brand-soft hover:underline"
                >
                  Vincular Google
                </button>
              </form>
            }
          />
        </Card>
        <Card className="p-5">
          <ChangePasswordForm hasPassword={hasPassword} />
        </Card>
        <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div>
            <p className="text-sm font-semibold text-text-primary">Sesiones abiertas</p>
            <p className="text-xs text-text-muted">
              ¿Entraste en una computadora prestada? Ciérrala en todos lados, incluido este.
            </p>
          </div>
          <form action={signOutEverywhereAction}>
            <button
              type="submit"
              className="min-h-touch rounded-md border border-border-subtle px-3 text-sm font-semibold text-text-secondary hover:bg-elevated"
            >
              Cerrar sesión en todos los dispositivos
            </button>
          </form>
        </Card>
      </SettingsSection>

      <SettingsSection id="plan" title="Plan y pagos">
        <PlanSection status={planStatus} />
      </SettingsSection>

      <SettingsSection id="familia" title="Familia">
        <ParentLinkCard />
        <LinkedParentsCard parents={linkedParents} parentNames={parentNames} />
      </SettingsSection>

      <SettingsSection id="privacidad" title="Privacidad y datos">
        <DataRightsSection />
      </SettingsSection>
    </div>
  );
}
