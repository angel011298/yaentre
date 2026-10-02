'use client';

import { useState } from 'react';
import { updateNotificationPrefAction, updateReminderScheduleAction } from '@/app/actions/profile';
import {
  REMINDER_HOUR_MAX,
  REMINDER_HOUR_MIN,
  WEEKDAY_LABELS,
  formatHour,
} from '@/lib/profile/settings';
import { SettingSwitch } from './SettingSwitch';

type StudentNotificationType =
  | 'STREAK_RISK'
  | 'EXAM_COUNTDOWN'
  | 'MARKETING'
  | 'STUDY_REMINDER'
  | 'SIMULATION_REMINDER';

function PrefSwitch({
  type,
  label,
  hint,
  initialEnabled,
  onSaved,
}: {
  type: StudentNotificationType;
  label: string;
  hint?: string;
  initialEnabled: boolean;
  onSaved?: (enabled: boolean) => void;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(next: boolean) {
    setEnabled(next);
    setPending(true);
    setError(null);
    const result = await updateNotificationPrefAction({ type, enabled: next });
    setPending(false);
    if (result.ok) {
      onSaved?.(next);
    } else {
      setEnabled(!next);
      setError('No pudimos guardar el cambio. Intenta de nuevo.');
    }
  }

  return (
    <div>
      <SettingSwitch
        label={label}
        hint={hint}
        checked={enabled}
        disabled={pending}
        onChange={handleChange}
      />
      {error && (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

const HOURS = Array.from(
  { length: REMINDER_HOUR_MAX - REMINDER_HOUR_MIN + 1 },
  (_, i) => REMINDER_HOUR_MIN + i
);

/**
 * Horario de los recordatorios (G100): hora de la Ciudad de México y días.
 * Guarda al cambiar, como el resto de los ajustes.
 */
function ReminderSchedule({ initialHour, initialDays }: { initialHour: number; initialDays: number[] }) {
  const [hour, setHour] = useState(initialHour);
  const [days, setDays] = useState<number[]>(initialDays);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  async function save(nextHour: number, nextDays: number[]) {
    const prev = { hour, days };
    setHour(nextHour);
    setDays(nextDays);
    setStatus('saving');
    const result = await updateReminderScheduleAction({ hour: nextHour, days: nextDays });
    if (result.ok) {
      setStatus('saved');
    } else {
      setHour(prev.hour);
      setDays(prev.days);
      setStatus('error');
    }
  }

  function toggleDay(day: number) {
    const next = days.includes(day) ? days.filter((d) => d !== day) : [...days, day];
    void save(hour, next);
  }

  return (
    <div className="space-y-3 rounded-md border border-border-subtle p-3">
      <label className="flex min-h-touch items-center justify-between gap-3 text-sm text-text-primary">
        <span>Hora del recordatorio</span>
        <select
          value={hour}
          disabled={status === 'saving'}
          onChange={(e) => void save(Number(e.target.value), days)}
          className="min-h-touch rounded-md border border-border-subtle bg-input px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand"
        >
          {HOURS.map((h) => (
            <option key={h} value={h}>
              {formatHour(h)}
            </option>
          ))}
        </select>
      </label>
      <div>
        <p id="reminder-days-label" className="text-sm text-text-primary">
          Días
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-labelledby="reminder-days-label">
          {WEEKDAY_LABELS.map((d) => {
            const active = days.includes(d.value);
            return (
              <button
                key={d.value}
                type="button"
                aria-pressed={active}
                aria-label={d.long}
                disabled={status === 'saving'}
                onClick={() => toggleDay(d.value)}
                className={`min-h-touch min-w-touch rounded-full border text-sm font-semibold transition-all disabled:opacity-50 ${
                  active
                    ? 'border-brand bg-brand-tint text-brand'
                    : 'border-border-subtle bg-surface text-text-secondary hover:bg-elevated'
                }`}
              >
                {d.short}
              </button>
            );
          })}
        </div>
      </div>
      <p className="text-xs text-text-muted" aria-live="polite">
        {status === 'saving' && 'Guardando…'}
        {status === 'saved' && 'Guardado. Hora del centro de México.'}
        {status === 'error' && 'No pudimos guardar el horario. Intenta de nuevo.'}
        {status === 'idle' && 'Hora del centro de México.'}
      </p>
    </div>
  );
}

/** Preferencias de notificación del ALUMNO (F17 tarea 2; G100 añade el
 *  recordatorio diario con horario y el aviso de simulacro del sábado). El
 *  resumen semanal del tutor (PARENT_WEEKLY) vive en /tutor. */
export function NotificationPrefsForm({
  streakRiskEnabled,
  examCountdownEnabled,
  marketingEnabled,
  studyReminderEnabled,
  simulationReminderEnabled,
  reminderHour,
  reminderDays,
}: {
  streakRiskEnabled: boolean;
  examCountdownEnabled: boolean;
  marketingEnabled: boolean;
  studyReminderEnabled: boolean;
  simulationReminderEnabled: boolean;
  reminderHour: number;
  reminderDays: number[];
}) {
  const [studyOn, setStudyOn] = useState(studyReminderEnabled);
  const [simOn, setSimOn] = useState(simulationReminderEnabled);

  return (
    <div className="space-y-3">
      <PrefSwitch
        type="STUDY_REMINDER"
        label="Recordatorio diario para estudiar"
        hint="Un correo corto a tu hora, solo los días que elijas y solo si aún no estudias ese día."
        initialEnabled={studyReminderEnabled}
        onSaved={setStudyOn}
      />
      <PrefSwitch
        type="SIMULATION_REMINDER"
        label="Aviso de simulacro el sábado"
        hint="Para practicar el examen completo con tiempo, a tu misma hora."
        initialEnabled={simulationReminderEnabled}
        onSaved={setSimOn}
      />
      {(studyOn || simOn) && <ReminderSchedule initialHour={reminderHour} initialDays={reminderDays} />}
      <PrefSwitch
        type="STREAK_RISK"
        label="Avisarme por correo si mi racha está en riesgo"
        initialEnabled={streakRiskEnabled}
      />
      <PrefSwitch
        type="EXAM_COUNTDOWN"
        label="Recordatorios de cuenta regresiva al examen"
        initialEnabled={examCountdownEnabled}
      />
      {/* G98: MARKETING es opt-in — sin fila, apagado. Este es el interruptor
          donde se retira lo aceptado en «Avísame cuando abra» (/paywall), sin
          depender del enlace de baja de un correo. */}
      <PrefSwitch
        type="MARKETING"
        label="Novedades, promociones y apertura de la preventa"
        hint="Correo ocasional sobre precios y nuevas funciones. Puedes apagarlo cuando quieras."
        initialEnabled={marketingEnabled}
      />
    </div>
  );
}
