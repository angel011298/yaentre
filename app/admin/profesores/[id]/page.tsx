import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { TeacherAdminActions } from '@/components/admin/TeacherAdminActions';
import { logAdminAction } from '@/lib/admin/audit-log';
import { isMasterAdminEmail } from '@/lib/admin/master';
import { adminTeacherIdSchema } from '@/lib/admin/schemas';
import { requireRole } from '@/lib/auth/guards';
import { getTeacherAdminDetail } from '@/lib/db/teachers';
import { SUBJECT_LABELS, isSubjectKey } from '@/lib/teachers/tariff';

export const metadata = { title: 'Profesor' };

const mask = (v: string) => `****${v.slice(-4)}`;

/**
 * Detalle de un profesor. CURP, CLABE y RFC SOLO se muestran completos al admin
 * MAESTRO, y abrir la página con esos datos queda en la bitácora ANTES de
 * pintarlos (`teacher.viewed`): ver los datos financieros de una persona es lo
 * que se audita. Para cualquier otro ADMIN salen enmascarados.
 */
export default async function AdminTeacherDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const parsed = adminTeacherIdSchema.safeParse({ teacherId: (await params).id });
  if (!parsed.success) notFound();

  const { authUser, profile } = await requireRole('ADMIN');
  const t = await getTeacherAdminDetail(parsed.data.teacherId);
  if (!t) notFound();

  const isMaster = isMasterAdminEmail(authUser.email, process.env.MASTER_ADMIN_EMAILS);
  if (isMaster) {
    await logAdminAction(
      'teacher.viewed',
      { userProfileId: profile.id, email: authUser.email },
      { targetKind: 'teacher', metadata: { teacherId: t.id } }
    );
  }

  const row = (label: string, value: string | null | undefined) => (
    <div className="flex justify-between gap-4 border-b border-border-subtle py-2 text-sm last:border-0">
      <dt className="text-text-secondary">{label}</dt>
      <dd className="text-right font-medium">{value || '—'}</dd>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/profesores" className="text-sm text-brand hover:underline">
          ← Profesores
        </Link>
        <h1 className="mt-2 font-display text-2xl font-bold">{t.fullName}</h1>
        <p className="text-text-secondary">
          Aparece como «{t.publicName}» · {t.status} · nivel {t.level}
        </p>
      </div>

      <Card className="p-4">
        <h2 className="font-display text-lg font-semibold">Identidad y pago</h2>
        <dl className="mt-2">
          {row('CURP', isMaster ? t.curp : mask(t.curp))}
          {row('RFC', t.rfc ? (isMaster ? t.rfc : mask(t.rfc)) : null)}
          {row('CLABE', isMaster ? t.clabe : mask(t.clabe))}
          {row('Banco', t.bankName)}
          {row('Teléfono', isMaster ? t.phone : mask(t.phone))}
          {row('Carril', t.paymentRail === 'ASIMILADOS' ? 'B — asimilados a salarios' : 'A — comisión mercantil')}
          {row('CLABE actualizada', t.clabeUpdatedAt ? t.clabeUpdatedAt.toISOString().slice(0, 16).replace('T', ' ') : 'La del alta')}
          {row('Constancia fiscal', t.csfDocumentUrl ? 'Subida' : 'No subió')}
        </dl>
        {!isMaster && (
          <p className="mt-3 text-xs text-text-muted">
            Los datos completos los ve solo el administrador maestro, y cada consulta queda registrada.
          </p>
        )}
      </Card>

      <Card className="p-4">
        <h2 className="font-display text-lg font-semibold">Perfil y desempeño</h2>
        <dl className="mt-2">
          {row('Materias', t.subjects.map((s) => (isSubjectKey(s.subjectKey) ? SUBJECT_LABELS[s.subjectKey] : s.subjectKey)).join(', '))}
          {row('Clases impartidas', String(t.totalClassesGiven))}
          {row('Calificación', t.ratingCount > 0 ? `${t.averageRating.toFixed(2)} (${t.ratingCount})` : 'Sin calificaciones')}
          {row('Tasa de cancelación', `${t.cancellationRate.toFixed(1)} %`)}
          {row('Contrato aceptado', t.contractAcceptedAt ? `${t.contractAcceptedAt.toISOString().slice(0, 10)} (${t.contractVersion})` : null)}
          {row('Política de grabación', t.recordingPolicyAcceptedAt ? t.recordingPolicyAcceptedAt.toISOString().slice(0, 10) : null)}
          {row('Motivo de suspensión', t.suspendReason)}
        </dl>
        {t.bio && <p className="mt-3 whitespace-pre-line text-sm text-text-secondary">{t.bio}</p>}
      </Card>

      <TeacherAdminActions
        teacherId={t.id}
        status={t.status}
        isMaster={isMaster}
        hasCsf={t.csfDocumentUrl !== null}
      />
    </div>
  );
}
