import { ImageResponse } from 'next/og';
import { BRAND_GRADIENT } from '@/lib/brand/colors';

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
        🦉
      </div>
    ),
    { ...size }
  );
}
