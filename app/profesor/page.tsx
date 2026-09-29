import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { buttonClassName } from '@/components/ui/Button';
import { AvailabilityEditor } from '@/components/teachers/AvailabilityEditor';
import { TeacherClassActions } from '@/components/teachers/TeacherClassActions';
import { TeacherSectionForm } from '@/components/teachers/TeacherSectionForm';
import { TextField } from '@/components/ui/TextField';
import { VisibilityToggle } from '@/components/teachers/VisibilityToggle';
import { requireUser } from '@/lib/auth/guards';
import { formatClassWhen } from '@/lib/classes/format';
import { listTeacherClasses } from '@/lib/db/classes';
import { getOwnTeacherView } from '@/lib/db/teachers';
import { SUBJECT_KEYS, SUBJECT_LABELS, formatMxnFromCents } from '@/lib/teachers/tariff';

export const metadata = { title: 'Mi panel de profesor' };

const STATUS_TEXT: Record<string, string> = {
  BOOKED: 'Por confirmar',
  CONFIRMED: 'Confirmada',
  IN_PROGRESS: 'En curso',
  COMPLETED: 'Impartida',
  CANCELLED: 'Cancelada',
  NO_SHOW_STUDENT: 'El alumno no llegó',
  NO_SHOW_TEACHER: 'No te presentaste',
  DISPUTED: 'En revisión',
};

const LEVEL_TEXT = { INICIAL: 'Inicial', VERIFICADO: 'Verificado', DESTACADO: 'Destacado' } as const;

/**
 * Panel del profesor. Ve SU información: sus clases (su parte, no lo que pagó el
 * alumno, y del alumno solo el primer nombre), su nivel y su avance. CURP y
 * CLABE salen enmascaradas incluso para él. NO hay pantalla de liquidaciones
 * todavía: el pago semanal depende de un proceso que aún no se activa.
 */
export default async function TeacherDashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const { profile } = await requireUser();
  const now = new Date();
  const teacher = await getOwnTeacherView(profile.id, now);

  if (!teacher) {
    return (
      <Card className="space-y-3 p-6">
        <h1 className="font-display text-2xl font-bold">Da clases en YaEntre</h1>
        <p className="text-text-secondary">
          Aún no tienes un perfil de profesor. Envía tu solicitud y la revisamos.
        </p>
        <Link href="/profesor/solicitud" className={buttonClassName('primary')}>
          Enviar mi solicitud
        </Link>
      </Card>
    );
  }

  if (teacher.status === 'PENDING_REVIEW') {
    return (
      <Card className="space-y-2 p-6">
        <h1 className="font-display text-2xl font-bold">Estamos revisando tu solicitud</h1>
        <p className="text-text-secondary">
          {sp.solicitud === 'enviada' ? '¡Recibimos tu solicitud! ' : ''}Verificamos tu identidad y tus datos de pago.
          Te avisamos por correo en cuanto esté lista.
        </p>
      </Card>
    );
  }

  if (teacher.status === 'SUSPENDED') {
    return (
      <Card className="space-y-2 p-6">
        <h1 className="font-display text-2xl font-bold">Tu perfil está suspendido</h1>
        <p className="text-text-secondary">
          Tu perfil no aparece en el directorio y tus clases futuras se cancelaron. Escríbenos a soporte si tienes
          dudas.
        </p>
      </Card>
    );
  }

  const classes = await listTeacherClasses(teacher.id, now);
  const upcoming = classes.filter((c) => ['BOOKED', 'CONFIRMED', 'IN_PROGRESS'].includes(c.status)).reverse();
  const past = classes.filter((c) => !['BOOKED', 'CONFIRMED', 'IN_PROGRESS'].includes(c.status));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Hola, {teacher.publicName}</h1>
        <p className="text-text-secondary">
          Nivel {LEVEL_TEXT[teacher.level]} · {teacher.metrics.totalClassesGiven} clases impartidas
          {teacher.metrics.averageRating !== null
            ? ` · ${teacher.metrics.averageRating.toFixed(1)}★ (${teacher.metrics.ratingCount})`
            : ''}
        </p>
      </div>

      <Card className="space-y-3 p-4">
        <VisibilityToggle active={teacher.status === 'ACTIVE'} />
      </Card>

      <Card className="space-y-3 p-4">
        <h2 className="font-display text-lg font-semibold">Próximas clases</h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-text-secondary">Todavía no tienes clases reservadas.</p>
        ) : (
          upcoming.map((c) => (
            <div key={c.id} className="rounded-lg border border-border-subtle p-3">
              <p className="font-medium">
                {c.subjectLabel} con {c.studentLabel}
              </p>
              <p className="text-sm text-text-secondary">
                {formatClassWhen(c.scheduledAt)} · {c.durationMinutes} min · {STATUS_TEXT[c.status]} ·{' '}
                {formatMxnFromCents(c.payCents)} para ti
              </p>
              {c.joinUrl && (
                <a href={c.joinUrl} className="mt-1 inline-block text-sm font-medium text-brand hover:underline">
                  Entrar a la clase
                </a>
              )}
              {c.willBeRecorded && <p className="text-xs text-text-muted">Esta clase se graba con consentimiento.</p>}
              <TeacherClassActions
                classId={c.id}
                canConfirm={c.canConfirm}
                canComplete={c.canComplete}
                canDeclareStudentNoShow={c.canDeclareStudentNoShow}
                canCancel={c.canCancel}
              />
            </div>
          ))
        )}
      </Card>

      {teacher.progress.nextLevel && (
        <Card className="space-y-2 p-4">
          <h2 className="font-display text-lg font-semibold">
            Progreso a {LEVEL_TEXT[teacher.progress.nextLevel]}
          </h2>
          <p className="text-xs text-text-muted">El nivel se gana por mérito: nadie lo asigna ni se elige.</p>
          <ul className="space-y-1 text-sm">
            {teacher.progress.criteria.map((c) => (
              <li key={c.key}>
                {c.met ? '✅' : '⬜'} {c.label}: {Number.isInteger(c.current) ? c.current : c.current.toFixed(1)} /{' '}
                {c.kind === 'max' ? `máx. ${c.required}` : c.required}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {past.length > 0 && (
        <Card className="space-y-2 p-4">
          <h2 className="font-display text-lg font-semibold">Historial</h2>
          <ul className="space-y-1 text-sm text-text-secondary">
            {past.slice(0, 20).map((c) => (
              <li key={c.id}>
                {formatClassWhen(c.scheduledAt)} · {c.subjectLabel} · {STATUS_TEXT[c.status]}
                {c.rating ? ` · ${c.rating}★` : ''}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="space-y-2 p-4">
        <h2 className="font-display text-lg font-semibold">Mis pagos</h2>
        <p className="text-sm text-text-secondary">
          Tus liquidaciones aparecerán aquí cuando se active el pago semanal. Por ahora esta sección no muestra
          montos.
        </p>
      </Card>

      <Card className="space-y-6 p-4">
        <h2 className="font-display text-lg font-semibold">Mi perfil</h2>
        <TeacherSectionForm
          title="Materias"
          render={() => (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {SUBJECT_KEYS.map((key) => (
                <label key={key} className="flex min-h-touch items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="subjects"
                    value={key}
                    defaultChecked={teacher.subjects.includes(key)}
                    className="h-4 w-4"
                  />
                  {SUBJECT_LABELS[key]}
                </label>
              ))}
            </div>
          )}
        />
        <TeacherSectionForm
          title="Disponibilidad"
          render={(errors) => <AvailabilityEditor initial={teacher.availability} error={errors.availability?.[0]} />}
        />
        <TeacherSectionForm
          title="Cuenta para recibir pagos"
          render={(errors) => (
            <>
              <p className="text-sm text-text-secondary">
                Cuenta actual: {teacher.clabeMasked} ({teacher.bankName}). Al cambiarla te enviamos un correo de
                aviso.
              </p>
              <TextField name="bankName" label="Banco" defaultValue={teacher.bankName} required errors={errors.bankName} />
              <TextField
                name="clabe"
                label="Nueva CLABE (18 dígitos)"
                inputMode="numeric"
                autoComplete="off"
                required
                errors={errors.clabe}
              />
            </>
          )}
        />
      </Card>
    </div>
  );
}
