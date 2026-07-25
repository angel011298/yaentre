import { ImageResponse } from 'next/og';

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
          background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)',
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
          🦉
        </div>
      </div>
    ),
    { width: 512, height: 512 }
  );
}
