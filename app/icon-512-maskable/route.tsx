import { ImageResponse } from 'next/og';
import { BRAND_GRADIENT } from '@/lib/brand/colors';
import { OWL_MARK_DATA_URI, OWL_MARK_RATIO } from '@/lib/brand/owl-mark';

export const runtime = 'edge';

/**
 * Ícono PWA 512×512 `purpose: "maskable"` (F17 tarea 1). Los launchers de
 * Android recortan este ícono a su propia forma (círculo, "squircle", etc.):
 * la "safe zone" estándar es el 80% central, así que el contenido lleva
 * relleno (padding) generoso para que nada importante caiga fuera al recortar.
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
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%',
            fontSize: 220,
          }}
        >
          {/* G101: Tino en SVG, no el emoji del búho (ver src/lib/brand/owl-mark.ts). */}
          {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
          <img src={OWL_MARK_DATA_URI} height={250} width={Math.round(250 * OWL_MARK_RATIO)} />
        </div>
      </div>
    ),
    { width: 512, height: 512 }
  );
}
