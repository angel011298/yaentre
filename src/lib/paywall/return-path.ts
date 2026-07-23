/**
 * Sanea el destino de "Ahora no" (F9 Task 2: "siempre debe devolver al
 * usuario exactamente a donde estaba, sin fricción"). Solo permite rutas
 * RELATIVAS del propio sitio — nunca una URL absoluta ni protocol-relative
 * (`//host/...`), que un atacante podría inyectar vía `?return=` para un
 * open redirect. Módulo puro, sin dependencias de Next.js.
 */
export function sanitizeReturnPath(raw: string | undefined | null, fallback = '/app'): string {
  if (!raw) return fallback;
  if (!raw.startsWith('/') || raw.startsWith('//')) return fallback;
  if (raw.includes('\\')) return fallback; // algunos navegadores tratan \ como /
  return raw;
}
