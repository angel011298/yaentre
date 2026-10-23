import type { ReactNode, SVGProps } from 'react';

/**
 * G101 — íconos de la interfaz, en SVG y sin dependencias.
 *
 * Reemplazan a los emojis que había en toda la app: un emoji se dibuja con la
 * fuente de cada sistema (distinto en Android, iOS y Windows, a veces en
 * blanco y negro), no hereda el color del texto, no respeta el tema claro u
 * oscuro y su tamaño depende de la línea. Estos trazos sí: usan
 * `currentColor`, escalan con la clase de tamaño y se ven igual en todos los
 * dispositivos.
 *
 * Trazo de 24×24, 2 px, puntas redondeadas — un solo lenguaje visual.
 * Marca v1.0 (G102): home, book, target, chart, flame, clock, check, x, lock,
 * user, search y arrowRight usan el trazo del manual de marca; sliders, bell,
 * calendar, play, trophy, bulb, flag, plus y door son nuevos. Los demás
 * (pencil, alert, award…) se conservan: el manual no los define.
 * Decorativos por defecto (`aria-hidden`): casi siempre acompañan a un texto
 * que ya dice lo mismo. Si un ícono va SOLO, se le pasa `label` y se anuncia
 * como imagen con nombre.
 */

const PATHS = {
  home: (
    <>
      <path d="M3 11l9-8 9 8" />
      <path d="M5 10v10h5v-6h4v6h5V10" />
    </>
  ),
  pencil: (
    <>
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
      <path d="m15 5 4 4" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
    </>
  ),
  chart: <path d="M5 20v-7M12 20V5M19 20v-10" />,
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  flame: <path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z" />,
  check: <path d="M5 12l5 5 9-10" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  checkCircle: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12 2.5 2.5 4.5-5" />
    </>
  ),
  xCircle: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m15 9-6 6" />
      <path d="m9 9 6 6" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
  unlock: (
    <>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 7.6-1.7" />
    </>
  ),
  alert: (
    <>
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 16v-5" />
      <path d="M12 8h.01" />
    </>
  ),
  star: (
    <path d="m12 2.5 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.3l-5.8 3.1 1.1-6.5-4.7-4.6 6.5-.9Z" />
  ),
  award: (
    <>
      <circle cx="12" cy="9" r="6" />
      <path d="M8.6 13.9 7 22l5-3 5 3-1.6-8.1" />
    </>
  ),
  graduation: (
    <>
      <path d="M22 9.5 12 4.5 2 9.5l10 5 10-5Z" />
      <path d="M6 11.5v5c3.5 2.2 8.5 2.2 12 0v-5" />
      <path d="M22 9.5V15" />
    </>
  ),
  file: (
    <>
      <path d="M14 2.5H6.5a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2.5V8h5.5" />
      <path d="M8.5 13h7" />
      <path d="M8.5 17h4.5" />
    </>
  ),
  book: (
    <>
      <path d="M5 20a2 2 0 0 1 2-2h12V4H7a2 2 0 0 0-2 2z" />
      <path d="M9 8h6" />
    </>
  ),
  anchor: (
    <>
      <circle cx="12" cy="5" r="2.5" />
      <path d="M12 7.5V22" />
      <path d="M5 13H3a9 9 0 0 0 18 0h-2" />
    </>
  ),
  cpu: (
    <>
      <rect x="5" y="5" width="14" height="14" rx="2" />
      <path d="M9 9h6v6H9Z" />
      <path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-4-4" />
    </>
  ),
  trash: (
    <>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="m19 6-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  arrowRight: <path d="M5 12h14M13 6l6 6-6 6" />,
  chevronRight: <path d="m9 18 6-6-6-6" />,
  monitor: (
    <>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8" />
      <path d="M12 17v4" />
    </>
  ),
  smartphone: (
    <>
      <rect x="6" y="2" width="12" height="20" rx="2.5" />
      <path d="M11 18h2" />
    </>
  ),
  shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />,
  moon: <path d="M20.5 13.2A8.5 8.5 0 1 1 10.8 3.5a6.5 6.5 0 0 0 9.7 9.7Z" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  wifiOff: (
    <>
      <path d="m3 3 18 18" />
      <path d="M8.5 16.4a5 5 0 0 1 7 0" />
      <path d="M5 12.8a10 10 0 0 1 4.4-2.6" />
      <path d="M2 8.8a15 15 0 0 1 4.2-2.6" />
      <path d="M18.9 12.8a10 10 0 0 0-2.2-1.5" />
      <path d="M12 20h.01" />
    </>
  ),
  sparkles: (
    <>
      <path d="M11 3.5 12.8 9l5.7 1.9-5.7 1.9L11 18.5 9.2 12.8 3.5 11l5.7-1.9Z" />
      <path d="M19 3v4M17 5h4" />
    </>
  ),
  logout: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </>
  ),
  layers: (
    <>
      <path d="m12 2 10 5-10 5L2 7Z" />
      <path d="m2 12 10 5 10-5" />
      <path d="m2 17 10 5 10-5" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8" />
      <path d="M18.5 14a6.5 6.5 0 0 1 3 6" />
    </>
  ),
  // ── Marca v1.0: resto del set del manual (docs/marca/referencia, `IC`). ──
  sliders: (
    <>
      <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="8" cy="17" r="2" />
    </>
  ),
  bell: (
    <>
      <path d="M6 17v-6a6 6 0 0 1 12 0v6l2 2H4z" />
      <path d="M10 21h4" />
    </>
  ),
  calendar: (
    <>
      <rect x="4" y="5" width="16" height="16" rx="2" />
      <path d="M4 10h16M8 3v4M16 3v4" />
    </>
  ),
  play: <path d="M8 5l11 7-11 7z" />,
  trophy: (
    <path d="M7 4h10v5a5 5 0 0 1-10 0zM7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3M12 14v4M8 21h8" />
  ),
  bulb: (
    <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10c1 1 1 2 1 3h6c0-1 0-2 1-3a6 6 0 0 0-4-10z" />
  ),
  flag: <path d="M5 21V4M5 4h12l-2 4 2 4H5" />,
  plus: <path d="M12 5v14M5 12h14" />,
  door: (
    <>
      <path d="M6 21V4h9v17M3 21h18" />
      <circle cx="12" cy="12.5" r="0.8" fill="currentColor" />
    </>
  ),
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof PATHS;

export function Icon({
  name,
  label,
  className = 'h-4 w-4',
  ...props
}: {
  name: IconName;
  /** Solo si el ícono va sin texto al lado: lo anuncia como imagen con nombre. */
  label?: string;
  className?: string;
} & Omit<SVGProps<SVGSVGElement>, 'name'>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`inline-block shrink-0 ${className}`}
      focusable="false"
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
      {...props}
    >
      {PATHS[name]}
    </svg>
  );
}
