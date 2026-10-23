import { useId, type CSSProperties } from 'react';
import { LOGO_VIEWBOX, logoPieces, type LogoPiece } from '@/lib/brand/logo-mark';

/**
 * Marca v1.0 — el logo de YaEntre (docs/marca/README.md §Logo).
 *
 * Variantes:
 *   - `horizontal`    símbolo + «YaEntre» a 0.7× el alto del símbolo, a 0.2× de distancia.
 *   - `vertical`      símbolo arriba, texto a 0.46× debajo.
 *   - `mark`          solo el símbolo.
 *   - `sin-personaje` «YaEntre» con la barra Cempasúchil debajo (alto 0.13× el
 *                     texto, a 0.1×). Es el de pagos, facturas, el panel de
 *                     madres y padres y los documentos legales: ahí no va Chilo.
 *
 * Temas: `auto` (por defecto) sigue al `data-theme` más cercano con las
 * variables `--logo-*` de globals.css —violeta-600 en claro, violeta-400 en
 * oscuro—; `claro`, `oscuro` y `violeta` fijan los colores del manual.
 *
 * `size` es el alto del símbolo en px (en `sin-personaje`, el tamaño del
 * texto). Por debajo de 32 px el símbolo pasa solo a la versión chica.
 * Mínimos del manual: horizontal 96 px de ancho (símbolo ≥ 28), sin personaje
 * 80 px (texto ≥ 22). El texto es texto real en Outfit 700, así que la
 * variante con letras ya se anuncia como «YaEntre»; el símbolo siempre es
 * decorativo. Si el símbolo va SOLO dentro de un enlace, pasa `label` y se
 * anuncia como imagen con nombre.
 *
 * Los ojos y la boca son el «color del fondo»: se recortan con una máscara,
 * así son transparentes sobre cualquier superficie sin saber cuál es.
 */

export type LogoVariante = 'horizontal' | 'vertical' | 'mark' | 'sin-personaje';
export type LogoTema = 'auto' | 'claro' | 'oscuro' | 'violeta';

const TEMAS: Record<LogoTema, { body: string; bar: string; text: string }> = {
  auto: { body: 'var(--logo-body)', bar: 'var(--logo-bar)', text: 'var(--logo-text)' },
  claro: { body: 'var(--ye-violeta-600)', bar: 'var(--ye-cempasuchil-500)', text: 'var(--ye-neutro-950)' },
  oscuro: { body: 'var(--ye-violeta-400)', bar: 'var(--ye-cempasuchil-500)', text: 'var(--ye-neutro-50)' },
  violeta: { body: 'var(--ye-neutro-0)', bar: 'var(--ye-cempasuchil-500)', text: 'var(--ye-neutro-0)' },
};

const WORDMARK = 'YaEntre';
const TEXT_STYLE: CSSProperties = { letterSpacing: '-0.02em', lineHeight: 1 };

function pieceProps(p: LogoPiece, color: string) {
  return p.stroke
    ? { stroke: color, strokeWidth: p.stroke, fill: 'none', strokeLinecap: 'round' as const }
    : { fill: color };
}

function Piece({ p, color, mask }: { p: LogoPiece; color: string; mask?: string }) {
  const Tag = p.tag;
  return <Tag {...p.attrs} {...pieceProps(p, color)} mask={mask} />;
}

/** El símbolo en SVG en línea. Exportado para quien necesite solo el dibujo. */
export function LogoMark({
  size,
  tema = 'auto',
  className,
}: {
  size: number;
  tema?: LogoTema;
  className?: string;
}) {
  const colors = TEMAS[tema];
  const pieces = logoPieces(size);
  // `useId` puede traer caracteres que no valen en `url(#…)`.
  const maskId = `logo-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox={LOGO_VIEWBOX}
      className={`shrink-0 ${className ?? ''}`}
      aria-hidden
      focusable="false"
    >
      <defs>
        <mask id={maskId} maskUnits="userSpaceOnUse" x="-10" y="-10" width="120" height="120">
          <rect x="-10" y="-10" width="120" height="120" fill="#fff" />
          {pieces
            .filter((p) => p.role === 'hole')
            .map((p, i) => (
              <Piece key={i} p={p} color="#000" />
            ))}
        </mask>
      </defs>
      {pieces
        .filter((p) => p.role !== 'hole')
        .map((p, i) =>
          p.role === 'body' ? (
            <Piece key={i} p={p} color={colors.body} mask={`url(#${maskId})`} />
          ) : (
            <Piece key={i} p={p} color={colors.bar} />
          )
        )}
    </svg>
  );
}

export function Logo({
  variante = 'horizontal',
  tema = 'auto',
  size = 32,
  label,
  className = '',
}: {
  variante?: LogoVariante;
  tema?: LogoTema;
  size?: number;
  /** Solo para `mark` solo dentro de un enlace o botón: nombre accesible. */
  label?: string;
  className?: string;
}) {
  const colors = TEMAS[tema];

  if (variante === 'sin-personaje') {
    return (
      <span
        className={`inline-flex flex-col font-display font-bold ${className}`}
        style={{ gap: size * 0.1, color: colors.text, fontSize: size }}
      >
        <span style={TEXT_STYLE}>{WORDMARK}</span>
        <span
          aria-hidden
          className="block w-full"
          style={{ height: Math.max(2, Math.round(size * 0.13)), borderRadius: size, background: colors.bar }}
        />
      </span>
    );
  }

  if (variante === 'mark') {
    return (
      <span
        className={`inline-flex ${className}`}
        {...(label ? { role: 'img', 'aria-label': label } : {})}
      >
        <LogoMark size={size} tema={tema} />
      </span>
    );
  }

  const vertical = variante === 'vertical';
  return (
    <span
      className={`inline-flex items-center ${vertical ? 'flex-col' : ''} ${className}`}
      style={{ gap: size * (vertical ? 0.08 : 0.2) }}
    >
      <LogoMark size={size} tema={tema} />
      <span
        className="font-display font-bold"
        style={{ ...TEXT_STYLE, color: colors.text, fontSize: size * (vertical ? 0.46 : 0.7) }}
      >
        {WORDMARK}
      </span>
    </span>
  );
}
