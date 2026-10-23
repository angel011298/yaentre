import { appIconResponse } from '@/lib/brand/app-icon';

export const runtime = 'edge';

/**
 * Ícono PWA 512×512 `purpose: "maskable"` (F17 tarea 1). Los launchers de
 * Android recortan este ícono a su propia forma (círculo, "squircle", etc.):
 * la zona segura es el 80 % central, así que el logo va al 60 %.
 */
export async function GET() {
  return appIconResponse(512, 'maskable');
}
