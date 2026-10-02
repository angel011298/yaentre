/**
 * G100 — ajustes del alumno guardados en `UserProfile` como strings/enteros
 * libres (mismo criterio que `themePref`, ver ./theme.ts). Módulo PURO: es la
 * única fuente de verdad de qué valores son válidos, para que la Server
 * Action, la lectura de la base y la interfaz no puedan discrepar.
 */

// ─────────────────────────────── Tamaño de letra ───────────────────────────────

export type FontScale = 'sm' | 'md' | 'lg' | 'xl';

export const FONT_SCALES: readonly FontScale[] = ['sm', 'md', 'lg', 'xl'];

export const DEFAULT_FONT_SCALE: FontScale = 'md';

/**
 * Porcentaje del tamaño raíz. Escala `rem`, así que crecen a la vez el texto
 * y el espaciado — el mismo efecto que el zoom del navegador, que es lo que
 * conserva las proporciones del diseño. Se replica en `app/globals.css`; el
 * test `tests/profile/settings.test.ts` comprueba que no se separen.
 */
export const FONT_SCALE_PERCENT: Record<FontScale, number> = {
  sm: 93.75,
  md: 100,
  lg: 112.5,
  xl: 125,
};

export function normalizeFontScale(value: unknown): FontScale {
  return typeof value === 'string' && (FONT_SCALES as readonly string[]).includes(value)
    ? (value as FontScale)
    : DEFAULT_FONT_SCALE;
}

// ─────────────────────────────── Meta diaria ───────────────────────────────

/** Opciones de la interfaz. La Server Action acepta solo estas. */
export const DAILY_GOAL_OPTIONS: readonly number[] = [10, 20, 30, 45, 60, 90, 120];

export const DEFAULT_DAILY_GOAL_MINS = 20;

export function normalizeDailyGoal(value: unknown): number {
  return typeof value === 'number' && DAILY_GOAL_OPTIONS.includes(value)
    ? value
    : DEFAULT_DAILY_GOAL_MINS;
}

// ─────────────────────────────── Recordatorios ───────────────────────────────

export const DEFAULT_REMINDER_HOUR = 18;
export const DEFAULT_REMINDER_DAYS: readonly number[] = [1, 2, 3, 4, 5];

/** Rango ofrecido: de 6:00 a 22:00. Un recordatorio de madrugada a un
 *  público de 15 a 22 años no es un recordatorio, es una molestia. */
export const REMINDER_HOUR_MIN = 6;
export const REMINDER_HOUR_MAX = 22;

export function normalizeReminderHour(value: unknown): number {
  return typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= REMINDER_HOUR_MIN &&
    value <= REMINDER_HOUR_MAX
    ? value
    : DEFAULT_REMINDER_HOUR;
}

/** Días únicos 0-6 (0 = domingo), ordenados. Vacío es válido: "ningún día". */
export function normalizeReminderDays(value: unknown): number[] {
  if (!Array.isArray(value)) return [...DEFAULT_REMINDER_DAYS];
  const days = new Set<number>();
  for (const d of value) {
    if (typeof d === 'number' && Number.isInteger(d) && d >= 0 && d <= 6) days.add(d);
  }
  return [...days].sort((a, b) => a - b);
}

export const WEEKDAY_LABELS: readonly { value: number; short: string; long: string }[] = [
  { value: 1, short: 'L', long: 'Lunes' },
  { value: 2, short: 'M', long: 'Martes' },
  { value: 3, short: 'M', long: 'Miércoles' },
  { value: 4, short: 'J', long: 'Jueves' },
  { value: 5, short: 'V', long: 'Viernes' },
  { value: 6, short: 'S', long: 'Sábado' },
  { value: 0, short: 'D', long: 'Domingo' },
];

export function formatHour(hour: number): string {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:00 ${hour < 12 ? 'a.m.' : 'p.m.'}`;
}
