import Link from 'next/link';
import { StatusPoller } from '@/components/checkout/StatusPoller';
import { Card } from '@/components/ui/Card';
import { requireUser } from '@/lib/auth/guards';
import { prisma } from '@/lib/db/prisma';
import { readOwnCheckoutSession } from '@/lib/stripe/session-readback';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Tu compra' };

/** G103 — resultado de la compra de un curso. Solo LEE: la inscripción la crea el webhook. */
export default async function CompraCursoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { profile } = await requireUser();
  const sp = await searchParams;
  const sessionId = typeof sp.session_id === 'string' ? sp.session_id : '';
  const session = sessionId ? await readOwnCheckoutSession(sessionId, profile.id, 'course_purchase') : null;

  const course = session?.metadata.courseId
    ? await prisma.course.findUnique({ where: { id: session.metadata.courseId }, select: { slug: true, title: true } })
    : null;
  const enrollment = course
    ? await prisma.courseEnrollment.findFirst({
        where: { userProfileId: profile.id, stripeCheckoutSessionId: sessionId, status: { in: ['ACTIVE', 'COMPLETED'] } },
        select: { id: true },
      })
    : null;

  let title = 'No encontramos tu compra';
  let body = 'Si ya pagaste, tu curso aparece en «Mis cursos» en cuanto se confirme el pago.';
  let wait = false;
  if (session && enrollment && course) {
    title = '¡Listo! Ya tienes el curso';
    body = `«${course.title}» ya está en tus cursos. El acceso es permanente.`;
  } else if (session?.paymentStatus === 'paid') {
    title = 'Confirmando tu pago…';
    body = 'Esto tarda unos segundos. No cierres esta pantalla.';
    wait = true;
  } else if (session?.paymentStatus === 'unpaid' && session.status === 'complete') {
    title = 'Tu pago está pendiente';
    body = 'Cuando se confirme tu pago en OXXO o por SPEI, el curso aparece en «Mis cursos» automáticamente.';
    wait = true;
  }

  return (
    <div className="mx-auto max-w-xl">
      {wait && <StatusPoller intervalMs={5000} />}
      <Card className="space-y-3 p-6" role="status" aria-live="polite">
        <h1 className="font-display text-xl font-bold text-text-primary">{title}</h1>
        <p className="text-sm text-text-secondary">{body}</p>
        <div className="flex flex-wrap gap-3 pt-1">
          {enrollment && course ? (
            <Link href={`/aprender/${course.slug}`} className="inline-flex min-h-touch items-center text-sm font-semibold text-brand-soft hover:underline">
              Empezar el curso
            </Link>
          ) : null}
          {session?.voucherUrl && (
            <a href={session.voucherUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-touch items-center text-sm font-semibold text-brand-soft hover:underline">
              Ver mi comprobante de pago
            </a>
          )}
          <Link href="/mis-cursos" className="inline-flex min-h-touch items-center text-sm font-semibold text-text-secondary hover:underline">
            Ir a mis cursos
          </Link>
        </div>
      </Card>
    </div>
  );
}
