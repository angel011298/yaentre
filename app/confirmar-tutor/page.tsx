import { loadTutorConsentByToken } from '@/lib/db/tutor-consent';
import { Card } from '@/components/ui/Card';
import { TutorConfirmForm } from '@/components/tutor/TutorConfirmForm';

export const metadata = {
  title: 'Confirmar inscripción',
  // No indexar: la URL trae un token de un solo uso.
  robots: { index: false, follow: false },
};

/**
 * Bloque 1 — página PÚBLICA (sin sesión) donde el tutor de un menor confirma su
 * inscripción desde la liga del correo. La autorización es el TOKEN de la URL,
 * no una cuenta (como el flujo de recuperación de contraseña). Server Component:
 * valida el token en el servidor antes de pintar el formulario.
 */
export default async function ConfirmarTutorPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const token = typeof sp.token === 'string' ? sp.token : '';
  const view = token ? await loadTutorConsentByToken(token) : null;

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-4 py-10">
      <div className="mb-6 text-center">
        <span className="font-display text-xl font-bold text-brand">YaEntre</span>
      </div>

      {!view ? (
        <Card className="space-y-3 p-6 text-center">
          <p className="text-3xl">⏳</p>
          <h1 className="font-display text-lg font-bold text-text-primary">
            Esta liga no es válida o ya caducó
          </h1>
          <p className="text-sm text-text-secondary">
            Las ligas de confirmación caducan a los 7 días. Pídele a tu hijo(a) que te envíe una
            nueva desde su cuenta en yaentre.com.
          </p>
        </Card>
      ) : view.alreadyConfirmed ? (
        <Card className="space-y-3 p-6 text-center">
          <p className="text-3xl">✅</p>
          <h1 className="font-display text-lg font-bold text-text-primary">
            Ya confirmaste esta inscripción
          </h1>
          <p className="text-sm text-text-secondary">
            No necesitas hacer nada más. {view.studentDisplayName ?? 'La persona a tu cargo'} ya
            puede contratar un plan.
          </p>
        </Card>
      ) : (
        <Card className="space-y-5 p-6">
          <div>
            <h1 className="font-display text-lg font-bold text-text-primary">
              Confirma la inscripción
              {view.studentDisplayName ? ` de ${view.studentDisplayName}` : ''}
            </h1>
            <p className="mt-1 text-sm text-text-secondary">
              Revisa y autoriza. Con esto confirmas que la persona menor a tu cargo puede usar
              YaEntre y decides sobre el tratamiento de sus datos.
            </p>
          </div>
          <TutorConfirmForm token={token} />
        </Card>
      )}
    </main>
  );
}
