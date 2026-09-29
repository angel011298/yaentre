import { redirect } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { TeacherApplicationForm } from '@/components/teachers/TeacherApplicationForm';
import { requireVerifiedUser } from '@/lib/auth/guards';
import { prisma } from '@/lib/db/prisma';
import { TEACHER_APPLICATIONS_CLOSED_MESSAGE, teacherLegalTextsFinal } from '@/lib/legal/teacher-texts';

export const metadata = { title: 'Solicitud de profesor' };

export default async function TeacherApplicationPage() {
  const { profile } = await requireVerifiedUser().catch(() => redirect('/login?next=/profesor/solicitud'));

  // Una cuenta con solicitud (en cualquier estado) va a su panel: no hay segunda solicitud.
  const existing = await prisma.teacher.findUnique({ where: { userProfileId: profile.id }, select: { id: true } });
  if (existing) redirect('/profesor');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Da clases en YaEntre</h1>
        <p className="mt-1 text-text-secondary">
          Como profesor independiente verificado, tú prestas el servicio directamente al alumno y YaEntre actúa como
          comisionista. Revisamos cada solicitud antes de publicar tu perfil.
        </p>
      </div>
      {teacherLegalTextsFinal() ? (
        <TeacherApplicationForm />
      ) : (
        <Card className="p-6 text-text-secondary">{TEACHER_APPLICATIONS_CLOSED_MESSAGE}</Card>
      )}
    </div>
  );
}
