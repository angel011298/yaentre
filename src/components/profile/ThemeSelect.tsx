'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateFontScaleAction, updateThemeAction } from '@/app/actions/profile';
import type { ThemePref } from '@/lib/profile/theme';
import type { FontScale } from '@/lib/profile/settings';
import { SegmentedChoice } from './SegmentedChoice';

/**
 * Apariencia (F17 tarea 2; G100 añade «Sistema» y el tamaño de letra).
 * Persiste en `UserProfile` (sincroniza entre dispositivos) y aplica de
 * inmediato vía `router.refresh()`: el layout de `(app)` (Server Component)
 * relee el perfil y renderiza `data-theme`/`data-font-scale` con el valor
 * nuevo. Nada de localStorage — la preferencia es de la cuenta, no del
 * navegador.
 */
const THEME_OPTIONS: { value: ThemePref; label: string }[] = [
  { value: 'dark', label: '🌙 Oscuro' },
  { value: 'light', label: '☀️ Claro' },
  { value: 'system', label: '💻 Sistema' },
];

const FONT_OPTIONS: { value: FontScale; label: string; hint: string }[] = [
  { value: 'sm', label: 'A', hint: 'Chica' },
  { value: 'md', label: 'A', hint: 'Normal' },
  { value: 'lg', label: 'A', hint: 'Grande' },
  { value: 'xl', label: 'A', hint: 'Muy grande' },
];

const FONT_PREVIEW_CLASS: Record<FontScale, string> = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
};

export function ThemeSelect({
  initialTheme,
  initialFontScale,
}: {
  initialTheme: ThemePref;
  initialFontScale: FontScale;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(fn: () => Promise<{ ok: boolean; message?: string }>) {
    if (pending) return;
    setPending(true);
    setError(null);
    const result = await fn();
    setPending(false);
    if (result.ok) router.refresh();
    else setError(result.message ?? 'No pudimos guardar el cambio. Intenta de nuevo.');
  }

  return (
    <div className="space-y-5">
      <SegmentedChoice
        label="Tema"
        options={THEME_OPTIONS}
        value={initialTheme}
        disabled={pending}
        onChange={(theme) =>
          theme !== initialTheme &&
          run(async () => {
            const r = await updateThemeAction({ theme });
            return r.ok ? { ok: true } : { ok: false, message: r.message };
          })
        }
        help={
          initialTheme === 'system'
            ? 'Cambia solo entre claro y oscuro según la configuración de tu dispositivo.'
            : undefined
        }
      />

      <SegmentedChoice
        label="Tamaño de letra"
        options={FONT_OPTIONS.map((o) => ({
          value: o.value,
          label: (
            <span className="flex flex-col items-center leading-tight">
              <span className={FONT_PREVIEW_CLASS[o.value]} aria-hidden="true">
                {o.label}
              </span>
              <span className="text-[11px] font-medium">{o.hint}</span>
            </span>
          ),
          ariaLabel: o.hint,
        }))}
        value={initialFontScale}
        disabled={pending}
        onChange={(fontScale) =>
          fontScale !== initialFontScale &&
          run(async () => {
            const r = await updateFontScaleAction({ fontScale });
            return r.ok ? { ok: true } : { ok: false, message: r.message };
          })
        }
        help="Aplica en toda la app y en el simulador. Útil para las lecturas largas."
      />

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
