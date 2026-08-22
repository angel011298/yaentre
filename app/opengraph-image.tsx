import { ImageResponse } from 'next/og';
import { BRAND_GRADIENT } from '@/lib/brand/colors';

export const alt = 'YaEntre — Tu entrenador de admisión con IA';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/**
 * Imagen de vista previa (F10 Task 3) generada al vuelo — sin depender de un
 * archivo de diseño que todavía no existe. Cascada por defecto a `/precios` y
 * cualquier otra ruta pública que no defina la suya propia.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: BRAND_GRADIENT,
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 140,
            height: 140,
            borderRadius: '9999px',
            background: 'rgba(255,255,255,0.15)',
            fontSize: 72,
            marginBottom: 32,
          }}
        >
          🦉
        </div>
        <div style={{ display: 'flex', fontSize: 88, fontWeight: 800, color: 'white' }}>
          YaEntre
        </div>
        <div
          style={{
            display: 'flex',
            marginTop: 20,
            fontSize: 32,
            color: 'rgba(255,255,255,0.9)',
            maxWidth: 820,
            textAlign: 'center',
          }}
        >
          Tu entrenador de admisión con IA
        </div>
      </div>
    ),
    { ...size }
  );
}
