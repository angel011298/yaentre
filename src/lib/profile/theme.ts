/**
 * Tema de la app del alumno (F17 tarea 2). `UserProfile.themePref` es un
 * `String` libre en el schema (no un enum de Postgres — evita una migración
 * para algo con solo 2 valores); este módulo es la única fuente de verdad de
 * qué valores son válidos y cuál es el respaldo.
 */
export type ThemePref = 'dark' | 'light';

export const DEFAULT_THEME_PREF: ThemePref = 'dark';

export function isValidThemePref(value: unknown): value is ThemePref {
  return value === 'dark' || value === 'light';
}
