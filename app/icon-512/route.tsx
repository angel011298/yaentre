import { appIconResponse } from '@/lib/brand/app-icon';

export const runtime = 'edge';

/** Ícono PWA 512×512 `purpose: "any"` (F17 tarea 1). Ver `icon-192/route.tsx`. */
export async function GET() {
  return appIconResponse(512);
}
