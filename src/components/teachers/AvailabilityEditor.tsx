'use client';

import { useState } from 'react';

/**
 * Editor de disponibilidad semanal (hora de México). Emite el arreglo como JSON
 * en un campo oculto `availability`; el servidor lo valida y normaliza
 * (`availabilitySchema`): esta pantalla solo evita que se capture algo imposible.
 */

export interface AvailabilityBlockValue {
  weekday: number;
  startMinute: number;
  endMinute: number;
}

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
// 08:00 a 22:00 cada 30 min (la ventana reservable y la rejilla de las clases).
const MINUTES = Array.from({ length: 29 }, (_, i) => 8 * 60 + i * 30);
const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

const SELECT = 'min-h-touch rounded-md border border-border-subtle bg-input px-2 text-sm text-text-primary';

export function AvailabilityEditor({
  initial = [],
  error,
}: {
  initial?: AvailabilityBlockValue[];
  error?: string;
}) {
  const [blocks, setBlocks] = useState<AvailabilityBlockValue[]>(initial);

  const update = (i: number, patch: Partial<AvailabilityBlockValue>) =>
    setBlocks((prev) => prev.map((b, idx) => (idx === i ? { ...b, ...patch } : b)));

  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium text-text-secondary">Tu disponibilidad semanal (hora de México)</legend>
      <input type="hidden" name="availability" value={JSON.stringify(blocks)} />

      {blocks.map((b, i) => (
        <div key={i} className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Día"
            className={SELECT}
            value={b.weekday}
            onChange={(e) => update(i, { weekday: Number(e.target.value) })}
          >
            {DAYS.map((d, idx) => (
              <option key={d} value={idx}>
                {d}
              </option>
            ))}
          </select>
          <select
            aria-label="Desde"
            className={SELECT}
            value={b.startMinute}
            onChange={(e) => update(i, { startMinute: Number(e.target.value) })}
          >
            {MINUTES.slice(0, -1).map((m) => (
              <option key={m} value={m}>
                {hhmm(m)}
              </option>
            ))}
          </select>
          <span className="text-sm text-text-muted">a</span>
          <select
            aria-label="Hasta"
            className={SELECT}
            value={b.endMinute}
            onChange={(e) => update(i, { endMinute: Number(e.target.value) })}
          >
            {MINUTES.slice(1).map((m) => (
              <option key={m} value={m}>
                {hhmm(m)}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setBlocks((prev) => prev.filter((_, idx) => idx !== i))}
            className="min-h-touch rounded-md px-3 text-sm text-danger hover:bg-elevated"
          >
            Quitar
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={() => setBlocks((prev) => [...prev, { weekday: 1, startMinute: 16 * 60, endMinute: 20 * 60 }])}
        className="min-h-touch rounded-md border border-border-subtle px-3 text-sm font-medium hover:bg-elevated"
      >
        + Agregar horario
      </button>
      {error && (
        <p role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </fieldset>
  );
}
