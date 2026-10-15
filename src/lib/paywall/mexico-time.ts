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
 * G100 — zona IANA para FORMATEAR fechas con `Intl` (`toLocaleDateString`).
 * Sin ella, una fecha formateada en el servidor sale en la hora de Vercel
 * (UTC): un simulacro terminado a las 20:00 en México aparecía con la fecha
 * del día siguiente, y un componente de cliente pintaba otra cosa que el HTML
 * del servidor (error de hidratación #418). Para CALCULAR fronteras de día se
 * sigue usando el desfase fijo de arriba, que no depende del sistema.
 */
export const MEXICO_TIME_ZONE = 'America/Mexico_City';

/**
 * G100 — `'YYYY-MM-DD'` (una clave de día YA calculada en hora de México) a un
 * `Date` en la hora LOCAL del entorno que lo pinta, a la hora indicada.
 *
 * Por qué existe: `new Date('2026-10-15')` es MEDIANOCHE UTC, y en México
 * (UTC−6) eso es el 14 a las 18:00. Una librería que trabaje con la fecha
 * local (`react-calendar-heatmap` lo hace) recorre así todo un día: el
 * calendario terminaba AYER, la actividad de hoy caía en la casilla de ayer, y
 * como el servidor de Vercel está en UTC (sin desfase) servidor y navegador
 * dibujaban calendarios distintos. Construido con año/mes/día locales, el
 * mismo día es el mismo día en cualquier zona. Una clave mal formada da
 * `Invalid Date` en vez de un día equivocado en silencio.
 */
export function localDateFromKey(key: string, hour = 0): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!m) return new Date(Number.NaN);
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), hour);
}

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
