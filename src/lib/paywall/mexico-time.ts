/**
 * Frontera de "día" para el límite diario de práctica libre (F9): medianoche
 * en huso horario de México. Módulo PURO — sin `Intl`/zonas de sistema, para
 * ser determinista en cualquier entorno (Vercel corre en UTC).
 *
 * Se usa UTC-6 FIJO, sin horario de verano: la reforma de 2022 eliminó el
 * cambio de hora en la "Zona Centro" (donde vive la mayoría del mercado
 * objetivo). Es la MISMA convención que ya usa el streak diario (F-08 del
 * PRD: "huso horario UTC-6") — se centraliza aquí para reutilizarla.
 */
export const MEXICO_UTC_OFFSET_HOURS = 6;

/**
 * Instante UTC que corresponde a la medianoche de HOY en México, para un
 * `now` dado. Ej.: si son las 23:30 del 21 de julio en México (05:30 UTC del
 * 22), devuelve el instante UTC de "21 de julio 00:00 México".
 */
export function startOfMexicoDay(now: Date): Date {
  const shifted = new Date(now.getTime() - MEXICO_UTC_OFFSET_HOURS * 3600 * 1000);
  const localMidnightAsUtc = Date.UTC(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth(),
    shifted.getUTCDate()
  );
  return new Date(localMidnightAsUtc + MEXICO_UTC_OFFSET_HOURS * 3600 * 1000);
}
