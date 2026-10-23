/**
 * Marca v1.0 — el símbolo de YaEntre: el personaje se asoma sobre una barra
 * Cempasúchil con la mano levantada, como quien tiene una duda. Es solo la
 * cabeza (sin ropa); el personaje completo es Chilo (`chilo-geometry.ts`).
 *
 * Geometría exacta del handoff (docs/marca/README.md, viewBox 0 0 100 100) en
 * DOS versiones: la completa, desde 32 px, y la chica (16–31 px: ojos más
 * grandes, sin boca ni mano izquierda). Cada pieza lleva su `role`:
 *   - `body`: cuerpo, brazo y manos — violeta, violeta-400 o blanco según fondo.
 *   - `bar`:  la barra — siempre Cempasúchil, salvo en un solo color.
 *   - `hole`: ojos y boca — el COLOR DEL FONDO. El componente `Logo` los
 *     recorta con una máscara (transparentes de verdad); los íconos y el
 *     favicon, que van sobre el degradado, los pintan de `#7431E3`.
 * El orden importa: la barra tapa la base de la cabeza y la mano izquierda
 * va encima de la barra.
 *
 * Mismo patrón que `owl-mark.ts` (obsoleto): SVG solo ASCII, `data:` URI en
 * base64 con `btoa` —existe en Edge y en Node— porque Satori (`next/og`) no
 * acepta SVG en línea con `var()` ni `currentColor`.
 */

export type LogoRole = 'body' | 'bar' | 'hole';

export interface LogoPiece {
  tag: 'path' | 'ellipse' | 'circle' | 'rect';
  role: LogoRole;
  /** `stroke` = la pieza es un trazo (brazo, boca), no un relleno. */
  stroke?: number;
  attrs: Record<string, string | number>;
}

export const LOGO_VIEWBOX = '0 0 100 100';

/** Símbolo completo (32 px o más). */
export const LOGO_FULL: readonly LogoPiece[] = [
  { tag: 'path', role: 'body', attrs: { d: 'M22.5 76 A34 34 0 1 1 77.5 76 Z' } },
  { tag: 'ellipse', role: 'hole', attrs: { cx: 40, cy: 52, rx: 4.8, ry: 6 } },
  { tag: 'ellipse', role: 'hole', attrs: { cx: 60, cy: 52, rx: 4.8, ry: 6 } },
  { tag: 'path', role: 'hole', stroke: 3.4, attrs: { d: 'M44 63 q6 5 12 0' } },
  { tag: 'path', role: 'body', stroke: 14, attrs: { d: 'M80 78 L91 65' } },
  { tag: 'circle', role: 'body', attrs: { cx: 91, cy: 64, r: 8.5 } },
  { tag: 'rect', role: 'bar', attrs: { x: 12, y: 76, width: 76, height: 9, rx: 4.5 } },
  { tag: 'rect', role: 'body', attrs: { x: 19, y: 68, width: 14, height: 12, rx: 6 } },
];

/** Versión chica (16–31 px). */
export const LOGO_SMALL: readonly LogoPiece[] = [
  { tag: 'path', role: 'body', attrs: { d: 'M20 74 A36 36 0 1 1 80 74 Z' } },
  { tag: 'ellipse', role: 'hole', attrs: { cx: 38, cy: 50, rx: 7, ry: 8.5 } },
  { tag: 'ellipse', role: 'hole', attrs: { cx: 62, cy: 50, rx: 7, ry: 8.5 } },
  { tag: 'path', role: 'body', stroke: 13, attrs: { d: 'M84 77 L92 63' } },
  { tag: 'circle', role: 'body', attrs: { cx: 92, cy: 62, r: 8 } },
  { tag: 'rect', role: 'bar', attrs: { x: 8, y: 74, width: 84, height: 12, rx: 6 } },
];

/** Por debajo de este tamaño (px) se usa `LOGO_SMALL`. */
export const LOGO_FULL_MIN_PX = 32;

export function logoPieces(sizePx: number): readonly LogoPiece[] {
  return sizePx < LOGO_FULL_MIN_PX ? LOGO_SMALL : LOGO_FULL;
}

export interface LogoColors {
  body: string;
  bar: string;
  hole: string;
}

/** Colores del handoff por fondo. `hole` = color del fondo. */
export const LOGO_COLORS = {
  claro: { body: '#7C3AED', bar: '#FC9712', hole: '#FFFFFF' },
  oscuro: { body: '#A78BFA', bar: '#FC9712', hole: '#131119' },
  violeta: { body: '#FFFFFF', bar: '#FC9712', hole: '#7C3AED' },
  /** Blanco sobre el degradado de los íconos: el hueco toma el tono medio. */
  degradado: { body: '#FFFFFF', bar: '#FC9712', hole: '#7431E3' },
  monoNegro: { body: '#131119', bar: '#131119', hole: '#FFFFFF' },
  monoBlanco: { body: '#FFFFFF', bar: '#FFFFFF', hole: '#131119' },
} as const satisfies Record<string, LogoColors>;

/** Degradado de 135° del ícono de app: violeta-600 → violeta-700. */
export const LOGO_GRADIENT_FROM = '#7C3AED';
export const LOGO_GRADIENT_TO = '#6D28D9';

function attrString(attrs: Record<string, string | number>): string {
  return Object.entries(attrs)
    .map(([k, v]) => `${k}="${v}"`)
    .join(' ');
}

/** Las piezas como elementos SVG con colores literales (mismo orden). */
export function logoInnerSvg(pieces: readonly LogoPiece[], colors: LogoColors): string {
  return pieces
    .map((p) => {
      const color = colors[p.role];
      const paint = p.stroke
        ? `stroke="${color}" stroke-width="${p.stroke}" fill="none" stroke-linecap="round"`
        : `fill="${color}"`;
      return `<${p.tag} ${attrString(p.attrs)} ${paint}></${p.tag}>`;
    })
    .join('');
}

export function logoSvg(pieces: readonly LogoPiece[], colors: LogoColors): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${LOGO_VIEWBOX}">${logoInnerSvg(pieces, colors)}</svg>`;
}

function toDataUri(svg: string): string {
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

/** Logo blanco para ir SOBRE el degradado violeta (íconos de app, OG). */
export const LOGO_ON_GRADIENT_DATA_URI = toDataUri(logoSvg(LOGO_FULL, LOGO_COLORS.degradado));
/** Igual, versión chica (favicon a 16–31 px). */
export const LOGO_SMALL_ON_GRADIENT_DATA_URI = toDataUri(
  logoSvg(LOGO_SMALL, LOGO_COLORS.degradado)
);

/** El símbolo es cuadrado. */
export const LOGO_MARK_RATIO = 1;

/** Fracción del lienzo que ocupa el logo en el ícono `any` y en el maskable. */
export const APP_ICON_LOGO_SCALE = 0.7;
export const APP_ICON_MASKABLE_LOGO_SCALE = 0.6;

/**
 * Favicon (docs/marca/svg/favicon.svg): degradado con radio de 22.5 % y la
 * versión chica al 74 %. Fuente de `app/icon.svg` y del `favicon.ico`
 * (`scripts/brand/build-favicon.ts`); `tests/brand/logo-mark.test.ts`
 * comprueba que los tres digan lo mismo.
 */
export function faviconSvg(): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="${LOGO_GRADIENT_FROM}"></stop>` +
    `<stop offset="1" stop-color="${LOGO_GRADIENT_TO}"></stop></linearGradient></defs>` +
    `<rect width="100" height="100" rx="22.5" fill="url(#g)"></rect>` +
    `<g transform="translate(13 13) scale(.74)">${logoInnerSvg(LOGO_SMALL, LOGO_COLORS.degradado)}</g>` +
    `</svg>`
  );
}
