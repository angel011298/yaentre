import { appIconResponse } from '@/lib/brand/app-icon';

export const runtime = 'edge';

/**
 * Ícono PWA 192×192 `purpose: "any"` (F17 tarea 1), generado al vuelo con
 * `next/og`. Marca v1.0: logo al 70 % sobre el degradado — ver
 * `src/lib/brand/app-icon.tsx`.
 */
export async function GET() {
  return appIconResponse(192);
}
