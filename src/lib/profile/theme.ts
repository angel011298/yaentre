/**
 * Tema de la app del alumno (F17 tarea 2). `UserProfile.themePref` es un
 * `String` libre en el schema (no un enum de Postgres — evita una migración
 * por cada valor nuevo); este módulo es la única fuente de verdad de qué
 * valores son válidos y cuál es el respaldo.
 *
 * G100: `system` sigue al sistema operativo (`prefers-color-scheme`). Se
 * resuelve en CSS (`app/globals.css`), no en JavaScript: así no hay destello
 * del tema equivocado antes de hidratar, y el cambio del sistema a media
 * sesión (modo oscuro automático al anochecer) se aplica solo.
 */
export type ThemePref = 'dark' | 'light' | 'system';

export const THEME_PREFS: readonly ThemePref[] = ['dark', 'light', 'system'];

export const DEFAULT_THEME_PREF: ThemePref = 'dark';

export function isValidThemePref(value: unknown): value is ThemePref {
  return typeof value === 'string' && (THEME_PREFS as readonly string[]).includes(value);
}

/** Lo que haya en la base, reducido a un valor válido. */
export function normalizeThemePref(value: unknown): ThemePref {
  return isValidThemePref(value) ? value : DEFAULT_THEME_PREF;
}
