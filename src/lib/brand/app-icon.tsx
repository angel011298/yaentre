import { ImageResponse } from 'next/og';
import { BRAND_GRADIENT } from './colors';
import {
  APP_ICON_LOGO_SCALE,
  APP_ICON_MASKABLE_LOGO_SCALE,
  LOGO_ON_GRADIENT_DATA_URI,
} from './logo-mark';

/**
 * Marca v1.0 — ícono de app: degradado de 135° (violeta-600 → violeta-700)
 * con el logo blanco al 70 % del lienzo (`any`) o al 60 % (`maskable`: el
 * launcher recorta a su forma y la zona segura es el 80 % central). Sin
 * esquinas redondeadas: el sistema aplica su máscara; el 22.5 % del manual es
 * solo para vistas previas. Siempre la versión COMPLETA del logo: el ícono más
 * chico que se genera es de 180 px, muy por encima del mínimo de 32 px.
 *
 * Una sola fuente para `app/icon-192`, `icon-512`, `icon-512-maskable` y
 * `apple-icon`, que antes repetían el mismo JSX con el búho.
 */
export function appIconResponse(size: number, purpose: 'any' | 'maskable' = 'any') {
  const logo = Math.round(
    size * (purpose === 'maskable' ? APP_ICON_MASKABLE_LOGO_SCALE : APP_ICON_LOGO_SCALE)
  );
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
        {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
        <img src={LOGO_ON_GRADIENT_DATA_URI} width={logo} height={logo} />
      </div>
    ),
    { width: size, height: size }
  );
}
