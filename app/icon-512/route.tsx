import { ImageResponse } from 'next/og';

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
          background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)',
          fontSize: 320,
        }}
      >
        🦉
      </div>
    ),
    { width: 512, height: 512 }
  );
}
