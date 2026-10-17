import { ImageResponse } from 'next/og';
import { BRAND_GRADIENT } from '@/lib/brand/colors';
import { OWL_MARK_DATA_URI, OWL_MARK_RATIO } from '@/lib/brand/owl-mark';

export const runtime = 'edge';

/** Ícono PWA 512×512 `purpose: "any"` (F17 tarea 1). Ver `icon-192/route.tsx`. */
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
          fontSize: 320,
        }}
      >
        {/* G101: Tino en SVG, no el emoji del búho (ver src/lib/brand/owl-mark.ts). */}
        {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
        <img src={OWL_MARK_DATA_URI} height={300} width={Math.round(300 * OWL_MARK_RATIO)} />
      </div>
    ),
    { width: 512, height: 512 }
  );
}
