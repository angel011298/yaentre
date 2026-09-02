'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateThemeAction } from '@/app/actions/profile';
import type { ThemePref } from '@/lib/profile/theme';

/**
 * Selector de tema (F17 tarea 2): persiste en `UserProfile.themePref` (antes
 * solo vivía en localStorage, sin sincronizar entre dispositivos). Aplica de
 * inmediato vía `router.refresh()` — el layout de `(app)` (Server Component)
 * relee el perfil y renderiza `data-theme` con el valor nuevo.
 */
export function ThemeSelect({ initialTheme }: { initialTheme: ThemePref }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function select(theme: ThemePref) {
    if (theme === initialTheme || pending) return;
    setPending(true);
    setError(null);
    const result = await updateThemeAction({ theme });
    setPending(false);
    if (result.ok) {
      router.refresh();
    } else {
      setError(result.message);
    }
  }

  const OPTIONS: { value: ThemePref; label: string }[] = [
    { value: 'dark', label: '🌙 Oscuro' },
    { value: 'light', label: '☀️ Claro' },
  ];

  return (
    <div>
      <p id="theme-label" className="text-sm font-semibold text-text-primary">
        Tema
      </p>
      {/* G63: `aria-pressed` — antes el tema activo solo se distinguía por
          color de borde/fondo, invisible para un lector de pantalla. */}
      <div className="mt-2 flex gap-2" role="group" aria-labelledby="theme-label">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            disabled={pending}
            aria-pressed={initialTheme === opt.value}
            onClick={() => select(opt.value)}
            className={`min-h-touch rounded-md border px-4 text-sm font-semibold transition-all disabled:opacity-50 ${
              initialTheme === opt.value
                ? 'border-brand bg-brand-tint text-brand'
                : 'border-border-subtle bg-surface text-text-secondary hover:bg-elevated'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" className="mt-1 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
