import { redirect } from 'next/navigation';
import { TeacherApplicationForm } from '@/components/teachers/TeacherApplicationForm';
import { AuthError } from '@/lib/auth/errors';
import { requireUser } from '@/lib/auth/guards';
import { getTeacherByProfile } from '@/lib/db/teachers';
import { readMarketplaceFlags, regularizacionClassesOn } from '@/lib/marketplace/flags';
import { subjectsForTrack } from '@/lib/teachers/subject-catalog';
import { publicPriceRange } from '@/lib/teachers/tariff';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Solicitud para dar clases' };

/**
 * G103 — alta del profesor (spec del marketplace §3 + selección de pistas y
 * materias, spec §2.10). Solo si no hay solicitud, o si la anterior fue
 * rechazada. Cada materia muestra su RANGO de tarifa, nunca la fórmula.
 */
export default async function SolicitudPage() {
  let profileId: string;
  let emailVerified: boolean;
  try {
    const { authUser, profile } = await requireUser();
    profileId = profile.id;
    emailVerified = Boolean(authUser.email_confirmed_at);
  } catch (err) {
    if (err instanceof AuthError) redirect('/login?next=/profesor/solicitud');
    throw err;
  }
  const flags = readMarketplaceFlags();
  if (!flags.liveClasses) redirect('/profesor');

  const existing = await getTeacherByProfile(profileId);
  if (existing && existing.status !== 'REJECTED') redirect('/profesor');

  const tracks = regularizacionClassesOn(flags) ? (['ADMISION', 'REGULARIZACION'] as const) : (['ADMISION'] as const);
  const catalog = tracks.map((track) => ({
    track,
    subjects: subjectsForTrack(track).map((s) => ({ ...s, range: publicPriceRange(track, s.key)! })),
  }));

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold text-text-primary">Da clases en YaEntre</h1>
        <p className="text-sm text-text-secondary">
          Como profesor independiente verificado en YaEntre das clases en línea, 1 a 1, en los horarios
          que tú eliges. YaEntre se queda con el 25 % de cada clase; tú recibes el 75 % cada semana por SPEI.
        </p>
      </div>
      {!emailVerified ? (
        <p role="alert" className="rounded-md bg-warning-subtle p-3 text-sm text-text-primary">
          Verifica tu correo antes de enviar tu solicitud: por ahí te avisaremos del resultado.
        </p>
      ) : (
        <TeacherApplicationForm catalog={catalog} previous={existing ? { displayName: existing.displayName } : null} />
      )}
    </div>
  );
}
