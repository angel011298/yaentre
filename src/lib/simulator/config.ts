import type { InstitutionCode } from '@prisma/client';

/**
 * Configuración por institución del simulador (F12). Módulo PURO: cada examen
 * real tiene reglas distintas de barajado que replicamos fielmente. La regla
 * viene del PRD F-03 y de la tarea F12:
 *   - UNAM: baraja TANTO las preguntas COMO las opciones de cada reactivo.
 *   - IPN:  baraja SOLO las preguntas; las opciones conservan su orden.
 *
 * El barajado de preguntas se fija al crear la sesión (posición de cada
 * `SessionAnswer`); el de opciones se aplica de forma determinista al construir
 * el payload del cliente (ver src/lib/simulator/shuffle.ts) para que reabrir la
 * misma sesión muestre siempre el mismo orden.
 */

export interface InstitutionSimConfig {
  /** ¿Se baraja el orden de las opciones (A/B/C/D) dentro de cada reactivo? */
  shuffleOptions: boolean;
}

const DEFAULT_CONFIG: InstitutionSimConfig = { shuffleOptions: false };

const CONFIG_BY_INSTITUTION: Record<InstitutionCode, InstitutionSimConfig> = {
  UNAM: { shuffleOptions: true },
  IPN: { shuffleOptions: false },
  // Post-launch (feature-flag): defaults conservadores hasta confirmar su regla real.
  UAM: { shuffleOptions: false },
  CENEVAL: { shuffleOptions: false },
  CNBV: { shuffleOptions: false },
};

export function simulatorConfigFor(code: InstitutionCode): InstitutionSimConfig {
  return CONFIG_BY_INSTITUTION[code] ?? DEFAULT_CONFIG;
}

/**
 * Umbrales de color del temporizador (F12 tarea 4): normal → advertencia bajo
 * 30 min → urgente bajo 15 min. En segundos para comparar contra el restante.
 */
export const TIMER_WARNING_SECS = 30 * 60;
export const TIMER_URGENT_SECS = 15 * 60;

/**
 * Cada cuánto el cliente descarga (flush) su cola de respuestas al servidor
 * mientras hay conexión. La resiliencia real ante cierre/offline vive en el
 * sendBeacon de `beforeunload` y en el reintento al reconectar; este intervalo
 * solo acota cuánta respuesta puede quedar sin persistir en el caso normal.
 */
export const SYNC_FLUSH_INTERVAL_MS = 15 * 1000;

/**
 * Umbral de "ronda perfecta" (F13 tarea 2, UIUX §9 catálogo de animaciones:
 * "Perfect round | Score ≥ 90%"). Se compara contra los reactivos SERVIDOS
 * (no contra el total oficial del examen 120/140) — un alumno evaluado sobre
 * menos preguntas por cobertura de contenido incompleta no debe ser penalizado
 * por algo fuera de su control.
 */
export const PERFECT_ROUND_THRESHOLD = 0.9;

export function isPerfectRound(score: number, servedCount: number): boolean {
  if (servedCount <= 0) return false;
  return score / servedCount >= PERFECT_ROUND_THRESHOLD;
}
