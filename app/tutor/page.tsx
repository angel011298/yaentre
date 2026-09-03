import { requireUser } from '@/lib/auth/guards';
import { loadLinkedStudents, loadParentDashboardData } from '@/lib/db/parent';
import { isNotificationTypeEnabled } from '@/lib/db/notifications';
import { LinkCodeForm } from '@/components/tutor/LinkCodeForm';
import { ParentDashboard } from '@/components/tutor/ParentDashboard';
import { ParentLockedPreview } from '@/components/tutor/ParentLockedPreview';
import { ParentShell } from '@/components/tutor/ParentShell';
import { StudentSwitcher } from '@/components/tutor/StudentSwitcher';
import { UnlinkStudentForm } from '@/components/tutor/UnlinkStudentForm';

export const metadata = { title: 'Panel del tutor' };

/**
 * Entrada del panel parental (F16). Server Component: resuelve TODO server-
 * side (alumnos vinculados, datos agregados, preferencia de correo) antes
 * del primer render — nada que un WebView restringido (Facebook in-app,
 * tarea 7) pueda romper por depender de hidratación de cliente.
 */
export default async function TutorPage({
  searchParams,
}: {
  searchParams: Promise<{ student?: string }>;
}) {
  const { profile } = await requireUser();
  const students = await loadLinkedStudents(profile.id);

  if (students.length === 0) {
    return (
      <ParentShell>
        <div className="mx-auto max-w-sm">
          <LinkCodeForm />
        </div>
      </ParentShell>
    );
  }

  const sp = await searchParams;
  const requested = sp.student;
  const selected = students.find((s) => s.studentProfileId === requested) ?? students[0];

  const [dashboardResult, weeklyEmailEnabled] = await Promise.all([
    loadParentDashboardData(profile.id, selected.studentProfileId),
    isNotificationTypeEnabled(profile.id, 'PARENT_WEEKLY'),
  ]);

  return (
    <ParentShell
      studentSwitcher={
        <StudentSwitcher students={students} selectedId={selected.studentProfileId} />
      }
    >
      <div className="space-y-8">
        {dashboardResult.kind === 'unlocked' && (
          <ParentDashboard data={dashboardResult.data} weeklyEmailEnabled={weeklyEmailEnabled} />
        )}
        {dashboardResult.kind === 'locked' && (
          <ParentLockedPreview studentName={dashboardResult.studentName} />
        )}
        {dashboardResult.kind === 'not_linked' && (
          <ParentLockedPreview studentName={selected.displayName} />
        )}

        {/* G65: la desvinculación vive junto al tablero del alumno
            seleccionado — es sobre ESE vínculo, no sobre la cuenta. */}
        <UnlinkStudentForm
          studentProfileId={selected.studentProfileId}
          studentName={selected.displayName}
        />

        <div className="border-t border-border-subtle pt-6">
          <LinkCodeForm />
        </div>
      </div>
    </ParentShell>
  );
}
