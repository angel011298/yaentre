import { MEXICO_TIME_ZONE } from '@/lib/paywall/mexico-time';

/**
 * G103 — formato de dinero y fechas para la interfaz. Siempre con zona
 * `America/Mexico_City` explícita: el servidor de Vercel está en UTC y un
 * `toLocaleDateString` sin `timeZone` pinta distinto en servidor y navegador
 * (error de hidratación #418, G100). Siempre `Intl` en MXN: nunca se arma un
 * `$${n}` a mano.
 */

const MXN = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
const MXN_ROUND = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

/** Centavos → «$1,234.50». */
export function formatMxn(cents: number): string {
  return MXN.format(cents / 100);
}

/** Centavos → «$1,235» (sin centavos), para precios de catálogo enteros. */
export function formatMxnShort(cents: number): string {
  return cents % 100 === 0 ? MXN_ROUND.format(cents / 100) : MXN.format(cents / 100);
}

export function formatMexicoDate(date: Date, opts: { weekday?: boolean } = {}): string {
  return date.toLocaleDateString('es-MX', {
    ...(opts.weekday ? { weekday: 'long' as const } : {}),
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: MEXICO_TIME_ZONE,
  });
}

export function formatMexicoTime(date: Date): string {
  return date.toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: MEXICO_TIME_ZONE,
  });
}

export function formatMexicoDateTime(date: Date): string {
  return `${date.toLocaleDateString('es-MX', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: MEXICO_TIME_ZONE,
  })} · ${formatMexicoTime(date)}`;
}

/** Muestra solo los últimos 4 dígitos (CLABE, RFC…): `****1234`. */
export function maskTail(value: string | null | undefined, visible = 4): string {
  if (!value) return '—';
  const clean = value.replace(/\s+/g, '');
  return `****${clean.slice(-visible)}`;
}
