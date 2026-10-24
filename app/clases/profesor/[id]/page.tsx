import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BookingCalendar } from '@/components/classes/BookingCalendar';
import { Card } from '@/components/ui/Card';
import { LinkButton } from '@/components/ui/LinkButton';
import { requireUser } from '@/lib/auth/guards';
import { findStudentStripeCustomerId, getBookableTeacher } from '@/lib/db/classes';
import { hasPremiumAccess } from '@/lib/db/premium-access';
import { readMarketplaceFlags } from '@/lib/marketplace/flags';
import { getStripe } from '@/lib/stripe/client';
import { isSalesOpen } from '@/lib/stripe/sales-gate';
import { mexicoDayKey } from '@/lib/subscriptions/access-check';
import { LEVEL_LABELS } from '@/lib/teachers/level-engine';
import { subjectLabel, TRACK_LABELS } from '@/lib/teachers/subject-catalog';
import { ADULT_DECLARATION, canSeeTrack, TRACK_DENIAL_MESSAGES } from '@/lib/teachers/track-access';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Agendar clase' };

async function savedCard(profileId: string): Promise<{ brand: string; last4: string } | null> {
  try {
    const customer = await findStudentStripeCustomerId(profileId);
    if (!customer) return null;
    const pm = (await getStripe().paymentMethods.list({ customer, type: 'card', limit: 1 })).data[0];
    return pm?.card ? { brand: pm.card.brand, last4: pm.card.last4 } : null;
  } catch {
    return null;
  }
}

/** G103 — calendario de reserva del alumno (spec §1.6). */
export default async function TeacherBookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { profile } = await requireUser();
  const { id } = await params;
  const sp = await searchParams;
  const flags = readMarketplaceFlags();
  const track = sp.pista === 'regularizacion' ? 'REGULARIZACION' : 'ADMISION';
  if (!canSeeTrack(track, flags) || !/^c[a-z0-9]{20,40}$/.test(id)) notFound();

  if (track === 'ADMISION' && !(await hasPremiumAccess(profile.id))) {
    return (
      <Card className="space-y-3 p-5">
        <h1 className="font-display text-xl font-bold text-text-primary">Disponible con Premium</h1>
        <p className="text-sm text-text-secondary">{TRACK_DENIAL_MESSAGES.PREMIUM_REQUIRED}</p>
        <LinkButton href="/precios" variant="primary">
          Ver Premium
        </LinkButton>
      </Card>
    );
  }

  const teacher = await getBookableTeacher(id, track);
  if (!teacher) notFound();
  const subjects = teacher.subjects.map((s) => ({ key: s.subjectKey, label: subjectLabel(s.subjectKey) }));
  const initialSubject = subjects.find((s) => s.key === sp.materia)?.key ?? subjects[0].key;
  const card = await savedCard(profile.id);

  return (
    <div className="space-y-4">
      <Link href={`/clases?pista=${track === 'ADMISION' ? 'admision' : 'regularizacion'}`} className="inline-flex min-h-touch items-center text-sm font-semibold text-brand-soft hover:underline">
        Volver al directorio
      </Link>
      <div>
        <h1 className="font-display text-2xl font-bold text-text-primary">Agendar clase con {teacher.displayName}</h1>
        <p className="text-sm text-text-secondary">
          {TRACK_LABELS[track]} · Nivel {LEVEL_LABELS[teacher.level]}
          {teacher.totalRatings > 0 ? ` · ${teacher.averageRating.toFixed(1)} de 5` : ''}
        </p>
        {teacher.bio && <p className="mt-2 whitespace-pre-wrap text-sm text-text-secondary">{teacher.bio}</p>}
      </div>
      <BookingCalendar
        teacherId={teacher.id}
        track={track}
        subjects={subjects}
        initialSubject={initialSubject}
        today={mexicoDayKey(new Date())}
        savedCard={card}
        salesOpen={isSalesOpen()}
        adultDeclarationText={ADULT_DECLARATION.text}
      />
    </div>
  );
}
