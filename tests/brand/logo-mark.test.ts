import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Logo } from '@/components/brand/Logo';
import {
  APP_ICON_LOGO_SCALE,
  APP_ICON_MASKABLE_LOGO_SCALE,
  LOGO_COLORS,
  LOGO_FULL,
  LOGO_SMALL,
  faviconSvg,
  logoInnerSvg,
  logoPieces,
  logoSvg,
} from '@/lib/brand/logo-mark';

/**
 * Marca v1.0 (G102) — el símbolo, contra los SVG finales del handoff
 * (docs/marca/svg) al carácter, y el favicon versionado contra su fuente.
 */
const ROOT = process.cwd();
const svgFile = (name: string) => readFileSync(join(ROOT, 'docs/marca/svg', name), 'utf8').trim();

describe('símbolo: idéntico a los SVG del manual', () => {
  it.each([
    ['logo-sobre-claro.svg', LOGO_FULL, LOGO_COLORS.claro],
    ['logo-sobre-oscuro.svg', LOGO_FULL, LOGO_COLORS.oscuro],
    ['logo-blanco-sobre-violeta.svg', LOGO_FULL, LOGO_COLORS.violeta],
    ['logo-mono-negro.svg', LOGO_FULL, LOGO_COLORS.monoNegro],
    ['logo-mono-blanco.svg', LOGO_FULL, LOGO_COLORS.monoBlanco],
    ['logo-chico-16-31.svg', LOGO_SMALL, LOGO_COLORS.claro],
  ] as const)('%s', (file, pieces, colors) => {
    expect(logoSvg(pieces, colors)).toBe(svgFile(file));
  });

  it('favicon.svg', () => {
    expect(faviconSvg()).toBe(svgFile('favicon.svg'));
  });

  it('app-icon-1024.svg: logo blanco al 70 % sobre el degradado, huecos #7431E3', () => {
    const icon = svgFile('app-icon-1024.svg');
    expect(icon).toContain(`<g transform="translate(15 15) scale(.7)">${logoInnerSvg(LOGO_FULL, LOGO_COLORS.degradado)}</g>`);
    expect(APP_ICON_LOGO_SCALE).toBe(0.7);
    expect(APP_ICON_MASKABLE_LOGO_SCALE).toBe(0.6);
  });

  it('por debajo de 32 px se usa la versión chica', () => {
    expect(logoPieces(16)).toBe(LOGO_SMALL);
    expect(logoPieces(31)).toBe(LOGO_SMALL);
    expect(logoPieces(32)).toBe(LOGO_FULL);
  });
});

describe('favicon versionado', () => {
  it('app/icon.svg es exactamente faviconSvg() (si cambia el logo: pnpm brand:favicon)', () => {
    expect(readFileSync(join(ROOT, 'app/icon.svg'), 'utf8').trim()).toBe(faviconSvg());
  });

  it('app/favicon.ico trae 16, 32 y 48 px en PNG', () => {
    const ico = readFileSync(join(ROOT, 'app/favicon.ico'));
    expect(ico.readUInt16LE(2)).toBe(1); // tipo ícono
    const count = ico.readUInt16LE(4);
    const sizes: number[] = [];
    for (let i = 0; i < count; i++) {
      const entry = 6 + 16 * i;
      sizes.push(ico.readUInt8(entry));
      const offset = ico.readUInt32LE(entry + 12);
      // Firma PNG: el contenido es una imagen real, no un hueco.
      expect(ico.subarray(offset, offset + 8).toString('hex')).toBe('89504e470d0a1a0a');
    }
    expect(sizes).toEqual([16, 32, 48]);
  });
});

const html = (props: Parameters<typeof Logo>[0]) => renderToStaticMarkup(createElement(Logo, props));

describe('<Logo />', () => {
  it('horizontal: el texto es texto real y el símbolo es decorativo', () => {
    const out = html({ size: 40 });
    expect(out).toContain('>YaEntre<');
    expect(out).toContain('aria-hidden="true"');
    expect(out).toContain('font-size:28px'); // 0.7 × 40
    expect(out).toContain('gap:8px'); // 0.2 × 40
  });

  it('vertical: texto a 0.46× el símbolo', () => {
    expect(html({ variante: 'vertical', size: 100 })).toContain('font-size:46px');
  });

  it('los ojos y la boca se recortan con máscara (transparentes sobre cualquier fondo)', () => {
    const out = html({ variante: 'mark', size: 48 });
    expect(out).toMatch(/<mask id="logo-[\w-]+"/);
    expect(out).toContain('M44 63 q6 5 12 0'); // la boca, dentro de la máscara
    expect(out).toMatch(/mask="url\(#logo-[\w-]+\)"/);
  });

  it('a menos de 32 px pasa a la versión chica (sin boca)', () => {
    const out = html({ variante: 'mark', size: 24 });
    expect(out).not.toContain('M44 63');
    expect(out).toContain('M20 74 A36 36 0 1 1 80 74 Z');
  });

  it('sin personaje: solo texto y barra, ningún dibujo', () => {
    const out = html({ variante: 'sin-personaje', size: 30 });
    expect(out).toContain('>YaEntre<');
    expect(out).not.toContain('<svg');
    expect(out).toContain('background:var(--logo-bar)');
    expect(out).toContain('height:4px'); // 0.13 × 30
  });

  it('mark solo en un enlace: con `label` se anuncia como imagen', () => {
    const out = html({ variante: 'mark', size: 32, label: 'YaEntre' });
    expect(out).toContain('role="img"');
    expect(out).toContain('aria-label="YaEntre"');
  });

  it('tema auto: colores por variables, así sigue al data-theme', () => {
    const out = html({ size: 40 });
    expect(out).toContain('fill="var(--logo-body)"');
    expect(out).toContain('fill="var(--logo-bar)"');
    expect(html({ size: 40, tema: 'violeta' })).toContain('fill="var(--ye-neutro-0)"');
  });
});
