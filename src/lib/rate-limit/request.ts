import 'server-only';
import { headers } from 'next/headers';
import { resolveClientIp, UNKNOWN_IP } from './client-ip';

/**
 * IP del cliente dentro de una Server Action o Route Handler (G65).
 *
 * `headers()` funciona en ambos contextos del App Router. Si por lo que sea no
 * hay cabeceras (render estático), se devuelve el marcador desconocido: todas
 * esas peticiones comparten un único cubo, que es el comportamiento seguro —
 * más restrictivo, nunca menos.
 */
export async function currentClientIp(): Promise<string> {
  try {
    const h = await headers();
    return resolveClientIp((name) => h.get(name));
  } catch {
    return UNKNOWN_IP;
  }
}

/** Correo normalizado como sujeto del límite (minúsculas, sin espacios). */
export function emailSubject(email: string): string {
  return email.trim().toLowerCase().slice(0, 254);
}
