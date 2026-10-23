import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { BRAND_GRADIENT } from '@/lib/brand/colors';
import { LOGO_ON_GRADIENT_DATA_URI } from '@/lib/brand/logo-mark';

export const alt = 'YaEntre — Tu entrenador de admisión con IA';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** Alto del símbolo en el logo horizontal. */
const MARK = 200;

/**
 * Imagen de vista previa (F10 Task 3) generada al vuelo. Cascada por defecto a
 * `/precios` y cualquier otra ruta pública que no defina la suya propia.
 *
 * Marca v1.0: el logo HORIZONTAL blanco sobre el degradado violeta — símbolo +
 * «YaEntre» en Outfit 700 a 0.7× su alto, separados 0.2× (docs/marca). El
 * texto es texto real, así que Satori necesita la fuente: se lee el TTF del
 * repo (Satori no acepta woff2 y `next/font` no le sirve). La frase de abajo
 * es la que ya tenía la imagen anterior.
 */
export default async function OpengraphImage() {
  const outfitBold = await readFile(join(process.cwd(), 'src/lib/brand/fonts/Outfit-Bold.ttf'));

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
          fontFamily: 'Outfit',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: Math.round(MARK * 0.2) }}>
          {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
          <img src={LOGO_ON_GRADIENT_DATA_URI} width={MARK} height={MARK} />
          <div
            style={{
              display: 'flex',
              fontSize: Math.round(MARK * 0.7),
              fontWeight: 700,
              letterSpacing: '-0.02em',
              lineHeight: 1,
              color: '#FFFFFF',
            }}
          >
            YaEntre
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            marginTop: 36,
            fontSize: 34,
            fontWeight: 700,
            color: 'rgba(255,255,255,0.92)',
            maxWidth: 860,
            textAlign: 'center',
          }}
        >
          Tu entrenador de admisión con IA
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: 'Outfit', data: outfitBold, weight: 700, style: 'normal' }],
    }
  );
}
