import { ImageResponse } from 'next/og';
import { BRAND_GRADIENT } from '@/lib/brand/colors';
import { OWL_MARK_DATA_URI, OWL_MARK_RATIO } from '@/lib/brand/owl-mark';

export const runtime = 'edge';

/**
 * Ícono PWA 192×192 (F17 tarea 1). Generado al vuelo con `next/og` — mismo
 * patrón que `opengraph-image.tsx` (F10) — en vez de depender de un archivo
 * de diseño que no existe. Círculo relleno (sin margen "safe zone"): es el
 * ícono `purpose: "any"` del manifest, los launchers lo recortan ellos
 * mismos si su forma de ícono no es circular.
 */
export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: BRAND_GRADIENT,
          fontSize: 120,
        }}
      >
        {/* G101: Tino en SVG, no el emoji del búho (ver src/lib/brand/owl-mark.ts). */}
        {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
        <img src={OWL_MARK_DATA_URI} height={120} width={Math.round(120 * OWL_MARK_RATIO)} />
      </div>
    ),
    { width: 192, height: 192 }
  );
}
