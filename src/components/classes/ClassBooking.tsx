'use client';

import { useMemo, useState } from 'react';
import { formatMxnFromCents } from '@/lib/teachers/tariff';

/**
 * Reserva de una clase (spec §6.1). Todo lo que decide esta pantalla se
 * VUELVE A DECIDIR en el servidor: el precio que se cobra es el que el servidor
 * calcula, y solo se cobra si coincide con el que la persona vio
 * (`expectedPriceCents`). La pantalla nunca ve la fórmula ni los multiplicadores
 * (spec §5.0): `calculate-tariff` devuelve únicamente el precio final.
 *
 * Hora de México (UTC−6 fijo): se arma el instante con `-06:00` explícito, para
 * que el navegador no lo mueva a la zona del dispositivo.
 */

interface TeacherCard {
  id: string;
  publicName: string;
  level: 'INICIAL' | 'VERIFICADO' | 'DESTACADO';
  averageRating: number | null;
  ratingCount: number;
  subjects: Array<{ key: string; label: string }>;
  fromPriceCents: number | null;
}

interface Block {
  weekday: number;
  startMinute: number;
  endMinute: number;
}

const LEVEL_TEXT = { INICIAL: 'Inicial', VERIFICADO: 'Verificado', DESTACADO: 'Destacado' } as const;
const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

/** Día de la semana (0 = domingo) de una fecha `YYYY-MM-DD`, sin depender de la zona horaria del dispositivo. */
function weekdayOf(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!)).getUTCDay();
}

function slotsFor(blocks: Block[], date: string, duration: number): number[] {
  if (!date) return [];
  const wd = weekdayOf(date);
  const out: number[] = [];
  for (const b of blocks.filter((x) => x.weekday === wd)) {
    for (let start = b.startMinute; start + duration <= b.endMinute; start += 30) out.push(start);
  }
  return out;
}

type Phase =
  | { kind: 'form' }
  | { kind: 'quoted'; priceCents: number }
  | { kind: 'processing'; classId: string }
  | { kind: 'done'; classId: string }
  | { kind: 'delayed'; classId: string };

async function api<T>(url: string, init?: RequestInit): Promise<{ ok: true; data: T } | { ok: false; message: string }> {
  try {
    const res = await fetch(url, init);
    const body = (await res.json().catch(() => null)) as
      | { ok: true; data: T }
      | { ok: false; message?: string }
      | null;
    if (body && body.ok) return body;
    return { ok: false, message: (body && !body.ok && body.message) || 'No se pudo completar. Intenta de nuevo.' };
  } catch {
    return { ok: false, message: 'No pudimos conectar. Revisa tu conexión e intenta de nuevo.' };
  }
}

export function ClassBooking({ teachers, isMinor }: { teachers: TeacherCard[]; isMinor: boolean }) {
  const [teacherId, setTeacherId] = useState<string>('');
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [subjectKey, setSubjectKey] = useState('');
  const [duration, setDuration] = useState<50 | 80>(50);
  const [date, setDate] = useState('');
  const [minute, setMinute] = useState<number | null>(null);
  const [recording, setRecording] = useState(false);
  const [phase, setPhase] = useState<Phase>({ kind: 'form' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const teacher = teachers.find((t) => t.id === teacherId);
  const slots = useMemo(() => slotsFor(blocks, date, duration), [blocks, date, duration]);

  async function pickTeacher(id: string) {
    setTeacherId(id);
    setBlocks([]);
    setMinute(null);
    setError(null);
    setPhase({ kind: 'form' });
    const t = teachers.find((x) => x.id === id);
    setSubjectKey(t?.subjects[0]?.key ?? '');
    if (!id) return;
    const res = await api<{ availability: Block[] }>(`/api/classes/teachers/${id}`);
    if (res.ok) setBlocks(res.data.availability);
    else setError(res.message);
  }

  const scheduledAt = date && minute !== null ? `${date}T${hhmm(minute)}:00-06:00` : null;

  async function quote() {
    if (!teacher || !scheduledAt) return;
    setBusy(true);
    setError(null);
    const res = await api<{ priceCents: number }>('/api/classes/calculate-tariff', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ teacherId, subjectKey, scheduledAt, durationMinutes: duration }),
    });
    setBusy(false);
    if (res.ok) setPhase({ kind: 'quoted', priceCents: res.data.priceCents });
    else setError(res.message);
  }

  async function book(priceCents: number) {
    setBusy(true);
    setError(null);
    const res = await api<
      | { status: 'PROCESSING'; classId: string; priceCents: number }
      | { status: 'REQUIRES_CHECKOUT'; classId: string; checkoutUrl: string }
    >('/api/classes/book', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        teacherId,
        subjectKey,
        scheduledAt,
        durationMinutes: duration,
        recordingConsent: isMinor ? false : recording,
        expectedPriceCents: priceCents,
      }),
    });
    if (!res.ok) {
      setBusy(false);
      // Si el precio cambió, se vuelve a cotizar para que la persona vea el nuevo antes de confirmar.
      setPhase({ kind: 'form' });
      setError(res.message);
      return;
    }
    if (res.data.status === 'REQUIRES_CHECKOUT') {
      // Solo se sigue una URL de Checkout de Stripe: nunca se redirige a un destino arbitrario.
      if (!res.data.checkoutUrl.startsWith('https://checkout.stripe.com/')) {
        setBusy(false);
        setPhase({ kind: 'form' });
        setError('No pudimos abrir el pago. Intenta de nuevo.');
        return;
      }
      window.location.assign(res.data.checkoutUrl);
      return;
    }
    setPhase({ kind: 'processing', classId: res.data.classId });
    await waitForBooking(res.data.classId);
    setBusy(false);
  }

  /** La clase queda BOOKED cuando llega el webhook de Stripe: se consulta su estado real, nunca se da por hecho. */
  async function waitForBooking(classId: string) {
    for (let i = 0; i < 20; i += 1) {
      await new Promise((r) => setTimeout(r, 3000));
      const res = await api<{ status: string }>(`/api/classes/${classId}`);
      if (res.ok && res.data.status === 'BOOKED') return setPhase({ kind: 'done', classId });
      if (res.ok && res.data.status === 'CANCELLED') {
        setPhase({ kind: 'form' });
        return setError('El pago no se completó y la clase se liberó. Puedes intentar de nuevo.');
      }
    }
    setPhase({ kind: 'delayed', classId });
  }

  if (phase.kind === 'processing') {
    return (
      <p role="status" className="rounded-lg bg-elevated p-4 text-sm">
        Estamos confirmando tu pago… no cierres esta página.
      </p>
    );
  }
  if (phase.kind === 'done') {
    return (
      <p role="status" className="rounded-lg bg-elevated p-4 text-sm font-medium text-success">
        ¡Listo! Tu clase quedó reservada. El profesor la confirma y te mandamos el enlace poco antes de empezar.
      </p>
    );
  }
  if (phase.kind === 'delayed') {
    return (
      <p role="status" className="rounded-lg bg-elevated p-4 text-sm">
        Tu pago sigue en proceso. Revisa «Mis clases» en unos minutos: si se confirma, aparecerá ahí; si no, no se te
        cobra.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <label className="block text-sm">
        <span className="font-medium">Profesor</span>
        <select
          className="mt-1 min-h-touch w-full rounded-md border border-border-subtle bg-input px-2"
          value={teacherId}
          onChange={(e) => void pickTeacher(e.target.value)}
        >
          <option value="">Elige un profesor</option>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.publicName} · {LEVEL_TEXT[t.level]}
              {t.averageRating !== null ? ` · ${t.averageRating}★` : ''}
            </option>
          ))}
        </select>
      </label>

      {teacher && (
        <>
          <label className="block text-sm">
            <span className="font-medium">Materia</span>
            <select
              className="mt-1 min-h-touch w-full rounded-md border border-border-subtle bg-input px-2"
              value={subjectKey}
              onChange={(e) => {
                setSubjectKey(e.target.value);
                setPhase({ kind: 'form' });
              }}
            >
              {teacher.subjects.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>

          <fieldset className="text-sm">
            <legend className="font-medium">Duración</legend>
            <div className="mt-1 flex gap-4">
              {([50, 80] as const).map((d) => (
                <label key={d} className="flex min-h-touch items-center gap-2">
                  <input
                    type="radio"
                    name="duration"
                    checked={duration === d}
                    onChange={() => {
                      setDuration(d);
                      setMinute(null);
                      setPhase({ kind: 'form' });
                    }}
                  />
                  {d} min
                </label>
              ))}
            </div>
          </fieldset>

          <label className="block text-sm">
            <span className="font-medium">Día</span>
            <input
              type="date"
              className="mt-1 min-h-touch w-full rounded-md border border-border-subtle bg-input px-2"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setMinute(null);
                setPhase({ kind: 'form' });
              }}
            />
          </label>

          {date && (
            <div className="text-sm">
              <p className="font-medium">Hora (México)</p>
              {slots.length === 0 ? (
                <p className="text-text-secondary">Ese día el profesor no tiene horarios para esta duración.</p>
              ) : (
                <div className="mt-1 flex flex-wrap gap-2">
                  {slots.map((m) => (
                    <button
                      key={m}
                      type="button"
                      aria-pressed={minute === m}
                      onClick={() => {
                        setMinute(m);
                        setPhase({ kind: 'form' });
                      }}
                      className={`min-h-touch rounded-md border px-3 ${
                        minute === m ? 'border-brand bg-brand text-white' : 'border-border-subtle hover:bg-elevated'
                      }`}
                    >
                      {hhmm(m)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {isMinor ? (
            <p className="text-xs text-text-muted">
              La grabación de las clases la decide tu tutor al confirmar tu inscripción.
            </p>
          ) : (
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={recording} onChange={(e) => setRecording(e.target.checked)} className="mt-1 h-4 w-4" />
              <span>
                Acepto que esta clase se grabe.
                <span className="block text-xs text-text-muted">
                  Es opcional: sin tu consentimiento no se graba.
                </span>
              </span>
            </label>
          )}

          {phase.kind === 'quoted' ? (
            <div className="space-y-2 rounded-lg border border-border-subtle p-3">
              <p className="text-lg font-semibold">{formatMxnFromCents(phase.priceCents)}</p>
              <p className="text-xs text-text-muted">
                Precio final de esta clase. Se cobra a tu tarjeta guardada; si no hay una, te llevamos a pagar.
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={() => void book(phase.priceCents)}
                className="min-h-touch w-full rounded-md bg-brand px-4 font-medium text-white hover:bg-brand-hover disabled:opacity-50"
              >
                {busy ? 'Reservando…' : `Reservar y pagar ${formatMxnFromCents(phase.priceCents)}`}
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={busy || !scheduledAt}
              onClick={() => void quote()}
              className="min-h-touch w-full rounded-md bg-brand px-4 font-medium text-white hover:bg-brand-hover disabled:opacity-50"
            >
              Ver precio
            </button>
          )}
        </>
      )}

      {error && (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
