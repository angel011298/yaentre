'use client';

import { useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { enrollFreeCourseAction, startCoursePurchaseAction } from '@/app/actions/courses-student';
import { Button } from '@/components/ui/Button';
import { LinkButton } from '@/components/ui/LinkButton';
import { formatMxnShort } from '@/lib/format/mx';

/**
 * G103 — panel de compra/inscripción del detalle de un curso. Pantalla de
 * pago: sin mascota. La casilla del art. 56 es obligatoria y nunca va
 * premarcada; el servidor la vuelve a exigir. La inscripción de un curso de
 * pago la crea el webhook, no este botón.
 */
export function CourseBuyPanel({
  slug,
  isFree,
  priceCents,
  originalPriceCents,
  loggedIn,
  enrolled,
  salesOpen,
  consentText,
  cancelled,
}: {
  slug: string;
  isFree: boolean;
  priceCents: number;
  originalPriceCents: number | null;
  loggedIn: boolean;
  enrolled: boolean;
  salesOpen: boolean;
  consentText: string;
  cancelled: boolean;
}) {
  const id = useId();
  const router = useRouter();
  const [accepted, setAccepted] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const checkbox = useRef<HTMLInputElement>(null);

  async function buy() {
    if (!accepted) {
      setError('Para continuar, marca la casilla.');
      checkbox.current?.focus();
      return;
    }
    setPending(true);
    setError(null);
    const r = await startCoursePurchaseAction({ slug, acceptImmediateAccess: true }).catch(() => null);
    if (r?.ok) {
      window.location.assign(r.data.url);
      return;
    }
    setPending(false);
    setError(r?.message ?? 'No pudimos iniciar el pago. Intenta de nuevo.');
  }

  async function enroll() {
    setPending(true);
    setError(null);
    const r = await enrollFreeCourseAction({ slug }).catch(() => null);
    if (r?.ok) {
      router.push(`/aprender/${slug}`);
      return;
    }
    setPending(false);
    setError(r?.message ?? 'No pudimos inscribirte. Intenta de nuevo.');
  }

  return (
    <div className="space-y-4 rounded-lg border border-border-subtle bg-surface p-5 shadow-md">
      <div className="flex items-baseline gap-2">
        <p className="font-display text-3xl font-bold text-text-primary">{isFree ? 'Gratis' : formatMxnShort(priceCents)}</p>
        {!isFree && originalPriceCents && <p className="text-text-muted line-through">{formatMxnShort(originalPriceCents)}</p>}
      </div>
      <p className="text-sm text-text-secondary">{isFree ? 'Inscríbete y empieza ahora.' : 'Pago único, IVA incluido. Acceso permanente al curso.'}</p>

      {cancelled && (
        <p role="status" className="rounded-md bg-elevated p-2 text-sm text-text-secondary">
          Cancelaste el pago. No se hizo ningún cargo.
        </p>
      )}

      {enrolled ? (
        <LinkButton href={`/aprender/${slug}`} variant="primary" className="w-full">
          Ir al curso
        </LinkButton>
      ) : !loggedIn ? (
        <LinkButton href={`/login?next=${encodeURIComponent(`/cursos/${slug}`)}`} variant="primary" className="w-full">
          Inicia sesión para {isFree ? 'inscribirte' : 'comprar'}
        </LinkButton>
      ) : isFree ? (
        <Button type="button" variant="primary" className="w-full" disabled={pending} onClick={enroll}>
          {pending ? 'Inscribiendo…' : 'Inscribirme gratis'}
        </Button>
      ) : !salesOpen ? (
        <p role="status" className="rounded-md bg-warning-subtle p-3 text-sm text-text-primary">
          La compra de cursos todavía no está abierta.
        </p>
      ) : (
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <input
              ref={checkbox}
              id={`${id}-consent`}
              type="checkbox"
              checked={accepted}
              onChange={(e) => {
                setAccepted(e.target.checked);
                if (e.target.checked) setError(null);
              }}
              className="mt-1 h-5 w-5 shrink-0"
            />
            <label htmlFor={`${id}-consent`} className="text-xs leading-relaxed text-text-secondary">
              {consentText}
            </label>
          </div>
          <Button type="button" variant="primary" className="w-full" disabled={pending} onClick={buy}>
            {pending ? 'Abriendo el pago…' : `Comprar curso — ${formatMxnShort(priceCents)}`}
          </Button>
          <p className="text-xs text-text-muted">Tarjeta, OXXO o transferencia SPEI.</p>
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
