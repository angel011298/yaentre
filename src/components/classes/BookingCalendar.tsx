'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { bookClassAction } from '@/app/actions/classes';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatMxnShort } from '@/lib/format/mx';

interface Slot {
  date: string;
  startTime: string;
  endTime: string;
  startsAt: string;
  priceCents: number;
}

const WEEKDAYS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DAY_LONG = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

/** Aritmética de fechas `YYYY-MM-DD` en UTC: igual en servidor y navegador (sin desajuste de hidratación). */
function parts(key: string) {
  const [y, m, d] = key.split('-').map(Number);
  return { y, m, d };
}
function keyOf(y: number, m: number, d: number) {
  return new Date(Date.UTC(y, m - 1, d)).toISOString().slice(0, 10);
}
function dow(key: string) {
  const { y, m, d } = parts(key);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}
function longLabel(key: string) {
  const { m, d } = parts(key);
  return `${DAY_LONG[dow(key)]} ${d} de ${MONTHS[m - 1]}`;
}
function addDays(key: string, n: number) {
  const { y, m, d } = parts(key);
  return keyOf(y, m, d + n);
}

/**
 * G103 — calendario de reserva (spec §1.6). Los horarios y su PRECIO FINAL
 * vienen del servidor; el alumno nunca ve la fórmula. Un clic: con tarjeta
 * guardada el cobro sale de inmediato (si el banco pide verificación 3D Secure
 * se abre su página y vuelve aquí); sin tarjeta, la página segura de Stripe la
 * guarda para la siguiente vez. La reserva queda firme SOLO cuando Stripe
 * confirma el pago (webhook).
 *
 * Doble clic: el botón se deshabilita y cada intento lleva su `idempotencyKey`;
 * un reintento del mismo intento no crea otra reserva ni otro cobro.
 */
export function BookingCalendar({
  teacherId,
  track,
  subjects,
  initialSubject,
  today,
  savedCard,
  salesOpen,
  adultDeclarationText,
}: {
  teacherId: string;
  track: 'ADMISION' | 'REGULARIZACION';
  subjects: Array<{ key: string; label: string }>;
  initialSubject: string;
  today: string;
  savedCard: { brand: string; last4: string } | null;
  salesOpen: boolean;
  adultDeclarationText: string;
}) {
  const id = useId();
  const router = useRouter();
  const [subject, setSubject] = useState(initialSubject);
  const [duration, setDuration] = useState<50 | 80>(50);
  // Resultado de la última consulta, con la llave que lo produjo: si la llave
  // actual no coincide, se está cargando. Así el efecto nunca hace un setState
  // síncrono (solo al terminar la petición).
  const [nonce, setNonce] = useState(0);
  const [result, setResult] = useState<{ key: string; slots?: Slot[]; error?: string } | null>(null);
  const [month, setMonth] = useState(() => today.slice(0, 7));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selected, setSelected] = useState<Slot | null>(null);
  const [adult, setAdult] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const attempt = useRef<string | null>(null);
  const confirmRef = useRef<HTMLDivElement>(null);

  const queryKey = `${subject}|${duration}|${track}|${nonce}`;
  const slots = result?.key === queryKey ? (result.slots ?? null) : null;
  const loadError = result?.key === queryKey ? (result.error ?? null) : null;
  const load = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let alive = true;
    const q = new URLSearchParams({ duration: String(duration), subject, track, days: '31' });
    fetch(`/api/classes/teachers/${teacherId}/slots?${q}`, { cache: 'no-store' })
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as { slots?: Slot[]; error?: string };
        if (!res.ok || !data.slots) throw new Error(data.error ?? 'No pudimos cargar los horarios.');
        if (alive) setResult({ key: queryKey, slots: data.slots });
      })
      .catch((err: unknown) => {
        if (alive) setResult({ key: queryKey, error: err instanceof Error ? err.message : 'No pudimos cargar los horarios.' });
      });
    return () => {
      alive = false;
    };
  }, [queryKey, duration, subject, teacherId, track]);

  const byDate = useMemo(() => {
    const map = new Map<string, Slot[]>();
    for (const s of slots ?? []) map.set(s.date, [...(map.get(s.date) ?? []), s]);
    return map;
  }, [slots]);

  const lastDay = addDays(today, 30);
  const { y: my, m: mm } = parts(`${month}-01`);
  const firstKey = keyOf(my, mm, 1);
  const leading = (dow(firstKey) + 6) % 7; // lunes primero
  const daysInMonth = new Date(Date.UTC(my, mm, 0)).getUTCDate();
  const canPrev = month > today.slice(0, 7);
  const canNext = month < lastDay.slice(0, 7);

  function shiftMonth(delta: number) {
    const d = new Date(Date.UTC(my, mm - 1 + delta, 1));
    setMonth(d.toISOString().slice(0, 7));
  }

  function choose(slot: Slot) {
    setSelected(slot);
    setError(null);
    attempt.current = null;
    requestAnimationFrame(() => confirmRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
  }

  async function book(useNewCard = false) {
    if (!selected) return;
    if (!adult) {
      setError({ code: 'ADULT', message: 'Confirma que eres mayor de edad para reservar.' });
      return;
    }
    setPending(true);
    setError(null);
    if (!attempt.current || useNewCard) attempt.current = crypto.randomUUID();
    const r = await bookClassAction({
      teacherId,
      subjectKey: subject,
      track,
      startsAt: selected.startsAt,
      durationMinutes: duration,
      idempotencyKey: attempt.current,
      adultDeclared: true,
      useNewCard,
    }).catch(() => null);

    if (!r) {
      setPending(false);
      setError({ code: 'NETWORK', message: 'No pudimos conectarnos. Revisa tu conexión e intenta de nuevo.' });
      return;
    }
    if (r.ok) {
      if ((r.data.status === 'requires_action' || r.data.status === 'checkout') && r.data.url) {
        window.location.assign(r.data.url);
        return;
      }
      router.push(`/clases/reserva/${r.data.classSessionId}`);
      return;
    }
    setPending(false);
    attempt.current = null;
    setError({ code: r.code, message: r.message });
    if (r.code === 'SLOT_TAKEN') {
      setSelected(null);
      load();
    }
  }

  const daySlots = selectedDate ? byDate.get(selectedDate) ?? [] : [];

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor={`${id}-subject`} className="text-sm font-medium text-text-secondary">
              Materia
            </label>
            <select
              id={`${id}-subject`}
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value);
                setSelected(null);
              }}
              className="min-h-touch w-full rounded-md border border-border-subtle bg-input px-3 text-text-primary"
            >
              {subjects.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <fieldset className="space-y-1.5">
            <legend className="text-sm font-medium text-text-secondary">Duración</legend>
            <div className="grid grid-cols-2 gap-2">
              {([50, 80] as const).map((d) => (
                <label
                  key={d}
                  className={`flex min-h-touch cursor-pointer items-center justify-center rounded-md border text-sm font-semibold ${
                    duration === d ? 'border-brand bg-brand-tint text-brand-fg' : 'border-border-subtle bg-surface text-text-secondary'
                  }`}
                >
                  <input
                    type="radio"
                    name={`${id}-duration`}
                    value={d}
                    checked={duration === d}
                    onChange={() => {
                      setDuration(d);
                      setSelected(null);
                    }}
                    className="sr-only"
                  />
                  {d} min
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <div className="rounded-lg border border-border-subtle bg-surface p-3">
          <div className="mb-2 flex items-center justify-between">
            <button type="button" onClick={() => shiftMonth(-1)} disabled={!canPrev} className="min-h-touch min-w-touch rounded-md text-text-secondary disabled:opacity-40" aria-label="Mes anterior">
              <Icon name="chevronRight" className="h-5 w-5 rotate-180" />
            </button>
            <p className="font-display font-bold capitalize text-text-primary" aria-live="polite">
              {MONTHS[mm - 1]} {my}
            </p>
            <button type="button" onClick={() => shiftMonth(1)} disabled={!canNext} className="min-h-touch min-w-touch rounded-md text-text-secondary disabled:opacity-40" aria-label="Mes siguiente">
              <Icon name="chevronRight" className="h-5 w-5" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-text-muted" aria-hidden>
            {WEEKDAYS.map((w) => (
              <span key={w}>{w}</span>
            ))}
          </div>
          {slots === null && !loadError ? (
            <Skeleton className="mt-2 h-56 w-full" />
          ) : (
            <div className="mt-1 grid grid-cols-7 gap-1" role="group" aria-label="Días del mes">
              {Array.from({ length: leading }, (_, i) => (
                <span key={`e${i}`} />
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const key = keyOf(my, mm, i + 1);
                const count = byDate.get(key)?.length ?? 0;
                const available = count > 0;
                const isToday = key === today;
                const isSel = key === selectedDate;
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={!available}
                    onClick={() => {
                      setSelectedDate(key);
                      setSelected(null);
                    }}
                    aria-pressed={isSel}
                    aria-label={`${longLabel(key)}${isToday ? ', hoy' : ''}: ${available ? `${count} horarios` : 'sin horarios'}`}
                    className={`relative flex min-h-touch flex-col items-center justify-center rounded-md text-sm tabular-nums ${
                      isSel
                        ? 'bg-brand text-on-brand'
                        : available
                          ? 'bg-elevated font-semibold text-text-primary hover:bg-brand-tint'
                          : 'text-text-muted opacity-50'
                    } ${isToday && !isSel ? 'ring-2 ring-brand-soft' : ''}`}
                  >
                    {i + 1}
                    {available && <span className={`mt-0.5 h-1.5 w-1.5 rounded-full ${isSel ? 'bg-on-brand' : 'bg-success'}`} aria-hidden />}
                  </button>
                );
              })}
            </div>
          )}
          {loadError && (
            <div role="alert" className="mt-2 space-y-2 text-sm text-danger">
              <p>{loadError}</p>
              <Button type="button" variant="secondary" onClick={load}>
                Reintentar
              </Button>
            </div>
          )}
          {slots && slots.length === 0 && (
            <p className="mt-2 text-sm text-text-secondary">Este profesor no tiene horarios libres en los próximos 30 días.</p>
          )}
          <p className="mt-2 text-xs text-text-muted">Los días con punto tienen horarios. Hora de la Ciudad de México.</p>
        </div>
      </div>

      <div className="space-y-4">
        {selectedDate && (
          <section aria-labelledby={`${id}-day`} className="space-y-2">
            <h2 id={`${id}-day`} className="font-display text-lg font-bold capitalize text-text-primary">
              {longLabel(selectedDate)}
            </h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {daySlots.map((s) => (
                <button
                  key={s.startsAt}
                  type="button"
                  onClick={() => choose(s)}
                  aria-pressed={selected?.startsAt === s.startsAt}
                  className={`flex min-h-touch flex-col items-center justify-center rounded-md border px-2 py-1 text-sm ${
                    selected?.startsAt === s.startsAt ? 'border-brand bg-brand text-on-brand' : 'border-border-subtle bg-surface text-text-primary hover:bg-elevated'
                  }`}
                >
                  <span className="font-semibold tabular-nums">{s.startTime}</span>
                  <span className="text-xs opacity-80">{formatMxnShort(s.priceCents)}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {selected && (
          <div ref={confirmRef} className="space-y-3 rounded-lg border border-border-subtle bg-surface p-4">
            <p className="text-sm text-text-secondary">
              <span className="font-semibold text-text-primary capitalize">{longLabel(selected.date)}</span> · {selected.startTime}–
              {selected.endTime} ({duration} min)
            </p>
            <p className="font-display text-2xl font-bold text-text-primary">{formatMxnShort(selected.priceCents)}</p>
            <p className="flex items-center gap-2 text-sm text-text-secondary">
              <Icon name="lock" className="h-4 w-4" />
              {savedCard
                ? `Se cobra a tu tarjeta ${savedCard.brand.toUpperCase()} ****${savedCard.last4}.`
                : 'Pagas con tarjeta en la página segura de Stripe; la guardamos para tus siguientes clases.'}
            </p>
            <label className="flex min-h-touch items-start gap-3">
              <input type="checkbox" checked={adult} onChange={(e) => setAdult(e.target.checked)} className="mt-1 h-5 w-5" />
              <span className="text-sm text-text-secondary">{adultDeclarationText}</span>
            </label>
            {!salesOpen ? (
              <p role="status" className="rounded-md bg-warning-subtle p-3 text-sm text-text-primary">
                Las reservas todavía no están abiertas.
              </p>
            ) : (
              <Button type="button" variant="primary" className="w-full" disabled={pending} onClick={() => void book(false)}>
                {pending ? 'Reservando…' : `Agendar clase — ${formatMxnShort(selected.priceCents)}`}
              </Button>
            )}
            <p className="text-xs text-text-muted">Cancelación sin costo hasta 24 horas antes.</p>
            <div aria-live="assertive">
              {error && (
                <div role="alert" className="space-y-2 text-sm text-danger">
                  <p>{error.message}</p>
                  {error.code === 'CARD_DECLINED' && (
                    <Button type="button" variant="secondary" disabled={pending} onClick={() => void book(true)}>
                      Pagar con otra tarjeta
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
