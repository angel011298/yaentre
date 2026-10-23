import { appIconResponse } from '@/lib/brand/app-icon';

export const runtime = 'edge';
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

/**
 * Ícono de pantalla de inicio para iOS (F17 tarea 1). Convención de archivo
 * de Next.js: se detecta solo y agrega `<link rel="apple-touch-icon">` al
 * `<head>` — sin esto, "Agregar a inicio" en Safari usa una captura de la
 * página. iOS redondea las esquinas por su cuenta.
 */
export default function AppleIcon() {
  return appIconResponse(size.width);
}
