/**
 * Sanea un destino de redirección que vino del cliente (`?next=`, campo oculto
 * del formulario, parámetro del enlace de correo). G60: sin esto, un
 * `next=https://evil.com` o `next=//evil.com` o `next=/\evil.com` convertía
 * nuestras pantallas de login/registro/confirmación en un redirector abierto
 * usable para phishing.
 *
 * Regla: solo se acepta una ruta ABSOLUTA dentro del sitio — empieza con un
 * único `/`, no con `//` ni `/\` (que el navegador interpreta como host), y
 * sin `\` ni saltos de línea. Cualquier otra cosa cae al `fallback`.
 */
export function safeInternalPath(next: unknown, fallback: string): string {
  if (typeof next !== 'string' || next.length === 0) return fallback;
  if (next.length > 512) return fallback;
  if (!next.startsWith('/')) return fallback;
  if (next.startsWith('//') || next.startsWith('/\\')) return fallback;
  if (/[\x00-\x1f\\]/.test(next)) return fallback;
  return next;
}
