import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Marca v1.0 (G102) — contraste WCAG AA de los tokens, medido contra
 * `app/globals.css` (lo que de verdad se sirve), no contra el documento.
 *
 * El manual (docs/marca, «Tablero de color») declara 110 pares en AA; aquí se
 * recalculan los que la app usa de verdad: texto (≥ 4.5:1) y componentes de
 * interfaz e indicador de foco (≥ 3:1, WCAG 1.4.11 / 2.4.11), en los dos temas.
 * Si alguien cambia un valor en globals.css y rompe un par, esto se pone rojo.
 */
const CSS = readFileSync(join(process.cwd(), 'app/globals.css'), 'utf8');

function block(selectorStart: string): Record<string, string> {
  const at = CSS.indexOf(selectorStart);
  if (at < 0) throw new Error(`no encuentro ${selectorStart}`);
  const open = CSS.indexOf('{', at);
  const close = CSS.indexOf('}', open);
  const vars: Record<string, string> = {};
  for (const m of CSS.slice(open + 1, close).matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) vars[m[1]] = m[2].trim();
  return vars;
}

const PRIMITIVES = block('/* 1. Primitivos */\n:root');
const THEMES = {
  dark: block(":root,\n[data-theme='dark']"),
  light: block("[data-theme='light']"),
};

function resolve(theme: Record<string, string>, name: string, depth = 0): string {
  if (depth > 8) throw new Error(`ciclo en ${name}`);
  const raw = theme[name] ?? PRIMITIVES[name];
  if (!raw) throw new Error(`token sin definir: ${name}`);
  const v = raw.match(/^var\((--[\w-]+)\)$/);
  return v ? resolve(theme, v[1], depth + 1) : raw;
}

function luminance(hex: string): number {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const SURFACES = ['--bg-base', '--bg-surface', '--bg-elevated', '--bg-input'];

/** [primer plano, fondo, mínimo] */
const PAIRS: [string, string, number][] = [
  ...['--text-primary', '--text-secondary', '--text-muted'].flatMap((t) =>
    SURFACES.map((s) => [t, s, 4.5] as [string, string, number])
  ),
  ...['--brand-fg', '--brand-soft', '--accent-fg', '--success', '--warning', '--danger', '--info', '--logo-text'].flatMap(
    (t) => ['--bg-base', '--bg-surface'].map((s) => [t, s, 4.5] as [string, string, number])
  ),
  ['--brand-fg', '--brand-tint', 4.5],
  ['--accent-fg', '--accent-subtle', 4.5],
  ['--on-brand', '--brand-primary', 4.5],
  ['--on-brand', '--brand-primary-hover', 4.5],
  ['--on-accent', '--accent', 4.5],
  ['--on-accent', '--accent-hover', 4.5],
  ['--on-success', '--success', 4.5],
  ['--on-warning', '--warning', 4.5],
  ['--on-danger', '--danger', 4.5],
  ['--on-info', '--info', 4.5],
  ['--on-streak', '--streak', 4.5],
  // Componentes de interfaz y foco: 3:1.
  ...['--bg-base', '--bg-surface', '--bg-elevated'].map((s) => ['--focus-ring', s, 3] as [string, string, number]),
  ['--brand-primary-border', '--bg-surface', 3],
  ['--logo-body', '--bg-base', 3],
  ['--logo-body', '--bg-surface', 3],
  ['--meter-fill', '--meter-track', 3],
];

describe.each(Object.entries(THEMES))('tema %s: pares en AA', (_name, theme) => {
  it.each(PAIRS)('%s sobre %s ≥ %s:1', (fg, bg, min) => {
    const r = ratio(resolve(theme, fg), resolve(theme, bg));
    expect(r, `${fg} ${resolve(theme, fg)} / ${bg} ${resolve(theme, bg)} = ${r.toFixed(2)}`).toBeGreaterThanOrEqual(min);
  });
});

describe('los pares delicados que cita el manual', () => {
  it('aviso en claro: #A16207 sobre #FBFAFF = 4.74:1', () => {
    expect(resolve(THEMES.light, '--warning').toLowerCase()).toBe('#a16207');
    expect(ratio(resolve(THEMES.light, '--warning'), resolve(THEMES.light, '--bg-base'))).toBeCloseTo(4.74, 2);
  });

  it('texto sobre el botón acento en hover, claro: 4.80:1', () => {
    expect(ratio(resolve(THEMES.light, '--on-accent'), resolve(THEMES.light, '--accent-hover'))).toBeCloseTo(4.8, 1);
  });

  it('control: el Cempasúchil como TEXTO sobre fondo claro NO pasa (por eso existe --accent-fg)', () => {
    expect(ratio(resolve(THEMES.light, '--accent'), resolve(THEMES.light, '--bg-base'))).toBeLessThan(4.5);
  });

  it('control: el violeta sólido como texto sobre el fondo oscuro NO pasa (por eso existe --brand-fg)', () => {
    expect(ratio(resolve(THEMES.dark, '--brand-primary'), resolve(THEMES.dark, '--bg-base'))).toBeLessThan(4.5);
  });
});
