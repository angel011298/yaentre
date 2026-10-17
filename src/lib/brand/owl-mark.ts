import { BRAND_PRIMARY_HEX } from './colors';

/**
 * G101 — marca de Tino para los íconos de la app (favicon, PWA, Apple) y la
 * imagen de vista previa en redes. Antes era el emoji 🦉: Satori (`next/og`)
 * lo dibujaba con la fuente de emojis que descarga en cada render, distinto
 * del Tino que el alumno ve dentro de la app y sin control de color.
 *
 * Misma geometría que `src/components/mascot/Tino.tsx` (viewBox 100×120), en
 * blanco sobre el degradado de marca, con los ojos en el morado de marca.
 * Como `data:` URI en base64 porque Satori no acepta SVG en línea con
 * `var()` ni `currentColor`, y `btoa` existe tanto en el runtime Edge como en
 * Node. Solo ASCII dentro del SVG, para que `btoa` no falle.
 */
const OWL_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120">
<circle cx="50" cy="72" r="30" fill="#FFFFFF"/>
<circle cx="50" cy="38" r="26" fill="#FFFFFF"/>
<polygon points="28,18 22,4 38,14" fill="#FFFFFF"/>
<polygon points="72,18 78,4 62,14" fill="#FFFFFF"/>
<circle cx="39" cy="36" r="9" fill="${BRAND_PRIMARY_HEX}"/>
<circle cx="61" cy="36" r="9" fill="${BRAND_PRIMARY_HEX}"/>
<circle cx="41" cy="34" r="3.2" fill="#FFFFFF"/>
<circle cx="63" cy="34" r="3.2" fill="#FFFFFF"/>
<polygon points="50,46 45,53 55,53" fill="#F59E0B"/>
<path d="M36 78 Q50 88 64 78" stroke="${BRAND_PRIMARY_HEX}" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.35"/>
</svg>`;

export const OWL_MARK_DATA_URI = `data:image/svg+xml;base64,${btoa(OWL_SVG)}`;

/** Proporción del dibujo (ancho / alto). */
export const OWL_MARK_RATIO = 100 / 120;
