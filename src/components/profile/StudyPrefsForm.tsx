'use client';

import { useState } from 'react';
import { updateDailyGoalAction, updateFocusSubjectsAction } from '@/app/actions/profile';
import { DAILY_GOAL_OPTIONS } from '@/lib/profile/settings';
import { SegmentedChoice } from './SegmentedChoice';
import { SettingSwitch } from './SettingSwitch';

function goalLabel(mins: number): string {
  return mins < 60 ? `${mins} min` : mins % 60 === 0 ? `${mins / 60} h` : `${Math.floor(mins / 60)} h ${mins % 60}`;
}

/**
 * G100 — preferencias de estudio: meta diaria (alimenta «Meta de hoy» en el
 * tablero) y materias a reforzar (el selector de práctica las prioriza). Las
 * horas hasta el examen se calculan con la fecha OFICIAL del examen, que el
 * alumno no edita (decisión de producto: la vigencia de los planes depende
 * de esa fecha).
 */
export function StudyPrefsForm({
  initialGoal,
  daysUntilExam,
  subjects,
  initialFocus,
}: {
  initialGoal: number;
  daysUntilExam: number | null;
  subjects: { id: string; name: string }[];
  initialFocus: string[];
}) {
  const [goal, setGoal] = useState(initialGoal);
  const [focus, setFocus] = useState<string[]>(initialFocus);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function changeGoal(next: number) {
    if (next === goal || pending) return;
    const prev = goal;
    setGoal(next);
    setPending(true);
    setError(null);
    const r = await updateDailyGoalAction({ minutes: next });
    setPending(false);
    if (!r.ok) {
      setGoal(prev);
      setError(r.message);
    }
  }

  async function toggleSubject(id: string, on: boolean) {
    const prev = focus;
    const next = on ? [...focus, id] : focus.filter((s) => s !== id);
    setFocus(next);
    setPending(true);
    setError(null);
    const r = await updateFocusSubjectsAction({ subjectIds: next });
    setPending(false);
    if (!r.ok) {
      setFocus(prev);
      setError(r.message);
    }
  }

  const hours = daysUntilExam && daysUntilExam > 0 ? Math.round((daysUntilExam * goal) / 60) : null;

  return (
    <div className="space-y-6">
      <SegmentedChoice
        label="¿Cuánto puedes estudiar al día?"
        options={DAILY_GOAL_OPTIONS.map((m) => ({ value: m, label: goalLabel(m) }))}
        value={goal}
        disabled={pending}
        onChange={changeGoal}
        help={
          hours !== null
            ? `A este ritmo llegas a tu examen con unas ${hours} horas de práctica (faltan ${daysUntilExam} días).`
            : 'Es tu meta de «Meta de hoy» en el tablero. La puedes cambiar cuando quieras.'
        }
      />

      {subjects.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-text-primary">Materias a reforzar</p>
          <p className="mt-0.5 text-xs text-text-muted">
            En tu práctica verás más reactivos de las que actives. No cambia el simulacro: ese
            siempre respeta la estructura del examen real.
          </p>
          <div className="mt-2 divide-y divide-border-subtle">
            {subjects.map((s) => (
              <SettingSwitch
                key={s.id}
                label={s.name}
                checked={focus.includes(s.id)}
                disabled={pending}
                onChange={(on) => void toggleSubject(s.id, on)}
              />
            ))}
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
