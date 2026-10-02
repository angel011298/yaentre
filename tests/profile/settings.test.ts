import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  FONT_SCALE_PERCENT,
  normalizeDailyGoal,
  normalizeFontScale,
  normalizeReminderDays,
  normalizeReminderHour,
} from '@/lib/profile/settings';
import { isValidThemePref, normalizeThemePref } from '@/lib/profile/theme';

const css = readFileSync(join(process.cwd(), 'app/globals.css'), 'utf8');

/** Declaraciones `--x: y` y `color-scheme` de un bloque, sin comentarios ni sangría. */
function declarationsOf(block: string): string[] {
  return block
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split(';')
    .map((d) => d.trim())
    .filter((d) => d.length > 0 && d.includes(':'));
}

function blockAfter(marker: string): string {
  const start = css.indexOf(marker);
  expect(start, `no se encontró ${marker}`).toBeGreaterThanOrEqual(0);
  const open = css.indexOf('{', start + marker.length - 1);
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth++;
    if (css[i] === '}') {
      depth--;
      if (depth === 0) return css.slice(open + 1, i);
    }
  }
  throw new Error('bloque sin cerrar');
}

describe('tema «Sistema» (G100)', () => {
  it('acepta system y normaliza lo desconocido al default', () => {
    expect(isValidThemePref('system')).toBe(true);
    expect(normalizeThemePref('sepia')).toBe('dark');
    expect(normalizeThemePref(null)).toBe('dark');
  });

  it('el bloque claro de `system` es copia EXACTA del de `light`', () => {
    const light = declarationsOf(blockAfter("[data-theme='light'] {"));
    const system = declarationsOf(
      blockAfter("@media (prefers-color-scheme: light) {\n  [data-theme='system'] {")
    );
    expect(light.length).toBeGreaterThan(10);
    expect(system).toEqual(light);
  });

  it('`system` comparte el bloque oscuro por defecto', () => {
    expect(css).toMatch(/\[data-theme='dark'\],\s*\[data-theme='system'\] \{/);
  });
});

describe('tamaño de letra (G100)', () => {
  it('cada escala distinta de md tiene su regla CSS con el MISMO porcentaje', () => {
    for (const [scale, pct] of Object.entries(FONT_SCALE_PERCENT)) {
      if (scale === 'md') continue;
      const block = blockAfter(`:root:has([data-font-scale='${scale}']) {`);
      expect(block).toContain(`font-size: ${pct}%`);
    }
  });

  it('normaliza valores desconocidos', () => {
    expect(normalizeFontScale('xl')).toBe('xl');
    expect(normalizeFontScale('xxl')).toBe('md');
  });
});

describe('meta diaria y recordatorios', () => {
  it('solo acepta las metas ofrecidas', () => {
    expect(normalizeDailyGoal(45)).toBe(45);
    expect(normalizeDailyGoal(46)).toBe(20);
  });
  it('hora fuera de 6-22 vuelve al default', () => {
    expect(normalizeReminderHour(3)).toBe(18);
    expect(normalizeReminderHour(22)).toBe(22);
    expect(normalizeReminderHour(7.5)).toBe(18);
  });
  it('días únicos, válidos y ordenados', () => {
    expect(normalizeReminderDays([5, 1, 1, 9, -1, 0])).toEqual([0, 1, 5]);
    expect(normalizeReminderDays([])).toEqual([]);
    expect(normalizeReminderDays('x')).toEqual([1, 2, 3, 4, 5]);
  });
});
