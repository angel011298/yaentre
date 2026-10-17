import { ImageResponse } from 'next/og';
import { BRAND_GRADIENT } from '@/lib/brand/colors';
import { OWL_MARK_DATA_URI, OWL_MARK_RATIO } from '@/lib/brand/owl-mark';

export const runtime = 'edge';
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

/**
 * Ícono de pantalla de inicio para iOS (F17 tarea 1). Convención de archivo
 * de Next.js: se detecta solo y agrega `<link rel="apple-touch-icon">` al
 * `<head>` — sin esto, "Agregar a inicio" en Safari usa una captura fea de
 * la página en vez de un ícono real.
 */
export default function AppleIcon() {
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
          fontSize: 110,
        }}
      >
        {/* G101: Tino en SVG, no el emoji del búho (ver src/lib/brand/owl-mark.ts). */}
        {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
        <img src={OWL_MARK_DATA_URI} height={112} width={Math.round(112 * OWL_MARK_RATIO)} />
      </div>
    ),
    { ...size }
  );
}
