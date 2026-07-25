/**
 * Bloque de esqueleto de carga (F18): reemplaza pantallas en blanco durante
 * la navegación a rutas que resuelven datos reales en el servidor
 * (`app/**\/loading.tsx`, convención de archivo de Next.js — Suspense
 * automático). `animate-pulse` es una animación CSS estándar de Tailwind, ya
 * cubierta por la regla global `prefers-reduced-motion` en globals.css.
 */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-elevated ${className}`} aria-hidden />;
}
