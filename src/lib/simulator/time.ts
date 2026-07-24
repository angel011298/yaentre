import { TIMER_URGENT_SECS, TIMER_WARNING_SECS } from './config';

/**
 * Tiempo del simulador (F12). Módulo PURO. El servidor es la única autoridad
 * del tiempo transcurrido: `computeRemainingSecs` se calcula contra el
 * `startedAt` real de la sesión, nunca contra un "restante" que reporte el
 * cliente (que podría manipular su reloj). El cliente recibe este restante ya
 * calculado y solo lo hace tictaquear localmente para la vista.
 */

export type TimerTone = 'normal' | 'warning' | 'urgent';

/** Segundos que faltan según el reloj del SERVIDOR (nunca negativo). */
export function computeRemainingSecs(
  startedAt: Date,
  timeLimitSecs: number,
  now: Date = new Date()
): number {
  const elapsedSecs = Math.max(0, Math.floor((now.getTime() - startedAt.getTime()) / 1000));
  return Math.max(0, timeLimitSecs - elapsedSecs);
}

/** ¿La sesión ya agotó su tiempo según el servidor? */
export function isTimeUp(startedAt: Date, timeLimitSecs: number, now: Date = new Date()): boolean {
  return computeRemainingSecs(startedAt, timeLimitSecs, now) <= 0;
}

/** Tono de color del temporizador por tiempo restante (30 min / 15 min). */
export function timerTone(remainingSecs: number): TimerTone {
  if (remainingSecs <= TIMER_URGENT_SECS) return 'urgent';
  if (remainingSecs <= TIMER_WARNING_SECS) return 'warning';
  return 'normal';
}

/** Formato HH:MM:SS (el examen dura 3 h, así que se necesitan las horas). */
export function formatClock(totalSecs: number): string {
  const secs = Math.max(0, Math.floor(totalSecs));
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}
