import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { LinkButton } from '@/components/ui/LinkButton';
import { requireUserPage } from '@/lib/auth/guards';
import { listDirectory } from '@/lib/db/classes';
import { hasPremiumAccess } from '@/lib/db/premium-access';
import { formatMxnShort } from '@/lib/format/mx';
import { readMarketplaceFlags } from '@/lib/marketplace/flags';
import { LEVEL_LABELS } from '@/lib/teachers/level-engine';
import { subjectLabel, subjectsForTrack, TRACK_LABELS } from '@/lib/teachers/subject-catalog';
import { canSeeTrack, TRACK_DENIAL_MESSAGES } from '@/lib/teachers/track-access';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Profesores' };

type Track = 'ADMISION' | 'REGULARIZACION';
const PARAM: Record<Track, string> = { ADMISION: 'admision', REGULARIZACION: 'regularizacion' };

/**
 * G103 — directorio de profesores independientes verificados en YaEntre, por
 * pista (spec §2.10). Sin Premium, la pista de ADMISIÓN muestra la invitación
 * a Premium y no la lista (el servidor tampoco deja reservar ni ver horarios).
 * El alumno ve «desde $X por clase», nunca la fórmula.
 */
export default async function ClasesDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { profile } = await requireUserPage('/clases');
  const sp = await searchParams;
  const flags = readMarketplaceFlags();
  const premium = await hasPremiumAccess(profile.id);

  const visible = (['ADMISION', 'REGULARIZACION'] as const).filter((t) => canSeeTrack(t, flags));
  const requested = sp.pista === 'regularizacion' ? 'REGULARIZACION' : sp.pista === 'admision' ? 'ADMISION' : null;
  const track: Track =
    requested && visible.includes(requested)
      ? requested
      : !premium && visible.includes('REGULARIZACION')
        ? 'REGULARIZACION'
        : 'ADMISION';
  const subjectParam = typeof sp.materia === 'string' ? sp.materia : undefined;
  const subjects = subjectsForTrack(track);
  const subject = subjects.some((s) => s.key === subjectParam) ? subjectParam : undefined;
  const locked = track === 'ADMISION' && !premium;
  const teachers = locked ? [] : await listDirectory(track, subject);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold text-text-primary">Clases en vivo</h1>
        <p className="text-sm text-text-secondary">
          Clases 1 a 1 en línea con profesores independientes verificados en YaEntre. Agenda cuando
          quieras y paga solo lo que uses.
        </p>
      </div>

      {visible.length > 1 && (
        <div role="tablist" aria-label="Tipo de clase" className="flex flex-wrap gap-2">
          {visible.map((t) => (
            <Link
              key={t}
              role="tab"
              aria-selected={t === track}
              href={`/clases?pista=${PARAM[t]}`}
              className={`inline-flex min-h-touch items-center rounded-full px-4 text-sm font-semibold ${
                t === track ? 'bg-brand text-on-brand' : 'border border-border-subtle bg-surface text-text-secondary'
              }`}
            >
              {TRACK_LABELS[t]}
            </Link>
          ))}
        </div>
      )}

      {locked ? (
        <Card className="space-y-3 p-5">
          <p className="flex items-center gap-2 font-semibold text-text-primary">
            <Icon name="lock" className="h-5 w-5" />
            Disponible con Premium
          </p>
          <p className="text-sm text-text-secondary">{TRACK_DENIAL_MESSAGES.PREMIUM_REQUIRED}</p>
          <div className="flex flex-wrap gap-2">
            <LinkButton href="/precios" variant="primary">
              Ver Premium
            </LinkButton>
            {visible.includes('REGULARIZACION') && (
              <LinkButton href="/clases?pista=regularizacion" variant="secondary">
                Ver clases de regularización
              </LinkButton>
            )}
          </div>
        </Card>
      ) : (
        <>
          <nav aria-label="Materias" className="flex flex-wrap gap-2">
            <Link
              href={`/clases?pista=${PARAM[track]}`}
              aria-current={!subject ? 'page' : undefined}
              className={`inline-flex min-h-touch items-center rounded-md px-3 text-sm ${!subject ? 'bg-elevated font-semibold text-text-primary' : 'text-text-secondary hover:bg-elevated'}`}
            >
              Todas
            </Link>
            {subjects.map((s) => (
              <Link
                key={s.key}
                href={`/clases?pista=${PARAM[track]}&materia=${s.key}`}
                aria-current={subject === s.key ? 'page' : undefined}
                className={`inline-flex min-h-touch items-center rounded-md px-3 text-sm ${subject === s.key ? 'bg-elevated font-semibold text-text-primary' : 'text-text-secondary hover:bg-elevated'}`}
              >
                {s.label}
              </Link>
            ))}
          </nav>

          {teachers.length === 0 ? (
            <p className="rounded-lg border border-border-subtle bg-surface p-4 text-sm text-text-secondary">
              Todavía no hay profesores con horarios en {subject ? subjectLabel(subject).toLowerCase() : 'esta sección'}.
            </p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {teachers.map((t) => (
                <li key={t.id}>
                  <Card className="flex h-full flex-col gap-2 p-4 hover:shadow-md active:scale-100">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-display text-lg font-bold text-text-primary">{t.displayName}</p>
                      <span className="rounded-md border border-border-subtle px-2 py-0.5 text-xs font-semibold text-text-secondary">
                        {LEVEL_LABELS[t.level]}
                      </span>
                    </div>
                    <p className="text-xs text-text-muted">
                      {t.totalRatings > 0 ? `${t.averageRating.toFixed(1)} de 5 · ${t.totalRatings} calificaciones` : 'Profesor nuevo'}
                    </p>
                    <p className="text-sm text-text-secondary">{t.subjects.map(subjectLabel).join(', ')}</p>
                    {t.bio && <p className="line-clamp-3 whitespace-pre-wrap text-sm text-text-secondary">{t.bio}</p>}
                    <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                      {t.fromPriceCents !== null && (
                        <span className="text-sm font-semibold text-text-primary">Desde {formatMxnShort(t.fromPriceCents)} por clase</span>
                      )}
                      <LinkButton
                        href={`/clases/profesor/${t.id}?pista=${PARAM[track]}${subject ? `&materia=${subject}` : ''}`}
                        variant="primary"
                      >
                        Ver horarios
                      </LinkButton>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
