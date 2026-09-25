import Link from 'next/link';
import { requireOnboarding } from '@/lib/auth/guards';
import { requiresTutorConsent } from '@/lib/legal/age';
import { getTutorConsentStatus } from '@/lib/db/tutor-consent';
import { Card } from '@/components/ui/Card';
import { Tino } from '@/components/mascot/Tino';
import { TutorConsentRequestForm } from '@/components/tutor/TutorConsentRequestForm';

export const metadata = { title: 'Confirmación de tu tutor' };

/**
 * Bloque 1 — pantalla donde un ALUMNO menor de 18 pide la confirmación de su
 * tutor antes de poder pagar (handoff §3.1). El checkout redirige aquí con el
 * código `TUTOR_CONSENT_REQUIRED`. Server Component: resuelve el estado real
 * (edad + confirmación) en el servidor.
 */
export default async function VerificacionTutorPage() {
  const { profile } = await requireOnboarding();

  // Sin fecha de nacimiento no podemos ubicar al usuario en el modelo por
  // capas — lo mandamos a completarla (el registro nuevo siempre la trae).
  const isMinor = profile.birthDate ? requiresTutorConsent(profile.birthDate, new Date()) : null;
  const status = await getTutorConsentStatus(profile.id);

  return (
    <main className="mx-auto max-w-lg space-y-6 px-4 py-8">
      <div className="flex items-center gap-3">
        <Tino state="encouraging" size={56} />
        <div>
          <h1 className="font-display text-xl font-bold text-text-primary">
            Confirmación de tu tutor
          </h1>
          <p className="text-sm text-text-secondary">
            Como eres menor de edad, tu madre, padre o tutor debe confirmar tu inscripción antes de
            contratar un plan de pago. Puedes seguir usando el plan gratuito mientras tanto.
          </p>
        </div>
      </div>

      {isMinor === null && (
        <Card className="space-y-2 p-5">
          <p className="text-sm text-text-secondary">
            Nos falta tu fecha de nacimiento para continuar. Escríbenos desde tu perfil para
            completarla.
          </p>
        </Card>
      )}

      {isMinor === false && (
        <Card className="space-y-3 p-5 text-center">
          <p className="text-sm text-text-secondary">
            Ya eres mayor de edad: no necesitas la confirmación de un tutor para contratar un plan.
          </p>
          <Link href="/paywall" className="font-semibold text-brand-soft hover:underline">
            Ver planes →
          </Link>
        </Card>
      )}

      {isMinor === true && status.confirmed && (
        <Card className="space-y-3 p-5 text-center">
          <p className="text-2xl">✅</p>
          <p className="text-sm text-text-secondary">
            Tu tutor ya confirmó tu inscripción. Ya puedes contratar el plan que quieras.
          </p>
          <Link href="/paywall" className="font-semibold text-brand-soft hover:underline">
            Ver planes →
          </Link>
        </Card>
      )}

      {isMinor === true && !status.confirmed && (
        <Card className="space-y-4 p-5">
          {status.exists && status.tutorEmail && (
            <p className="rounded-md border border-info/40 bg-info/10 px-3 py-2 text-sm text-text-secondary">
              Ya enviamos una liga a <strong className="text-text-primary">{status.tutorEmail}</strong> y
              sigue pendiente de confirmar. Puedes reenviarla o cambiar el correo abajo.
            </p>
          )}
          <p className="text-sm text-text-secondary">
            Escribe el correo de tu tutor. Le enviaremos una liga para que revise y confirme tu
            inscripción, decida sobre tus datos y active tu acceso a los planes de pago.
          </p>
          <TutorConsentRequestForm
            defaultEmail={status.tutorEmail}
            alreadyRequested={status.exists}
          />
        </Card>
      )}
    </main>
  );
}
