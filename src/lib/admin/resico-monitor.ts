import { MEXICO_UTC_OFFSET_HOURS } from '@/lib/paywall/mexico-time';
import { toMexicoLocal } from '@/lib/teachers/schedule';

/**
 * MONITOR RESICO — Bloque 2 (spec §10, prioridad alta). Semáforo del ingreso
 * propio anual contra el techo de $3.5M del régimen RESICO. Módulo PURO: recibe
 * los totales ya sumados y devuelve el estado; no toca la base.
 *
 * Criterios, todos CONSERVADORES (prefieren avisar de más que de menos):
 *
 *  · Base de EFECTIVO: cuenta lo COBRADO en el año fiscal, no lo devengado.
 *  · PEOR CASO en clases: se suma el 100% de lo retenido de cada clase, como si
 *    TODO fuera Carril B (spec §10). En el Carril A el ingreso propio es solo la
 *    comisión; el ingreso «mixto» se calcula aparte, para saber cuánto se ahorra
 *    migrando profesores de carril, pero NO gobierna el semáforo.
 *  · Los montos que se cobran incluyen IVA y aquí no se separa: el techo de
 *    RESICO se mide sin IVA, así que el porcentaje sale ~16% más alto que el real.
 *    Es un margen de seguridad deliberado, y una pregunta abierta para el
 *    contador (ver RETORNO_BLOQUE2.md).
 *  · El semáforo se decide por lo ACUMULADO, como pide la spec. La proyección se
 *    expone aparte (`projectedPercentUsed`): en enero una proyección lineal se
 *    dispara por una sola venta, así que no manda sobre el color, pero sí se ve.
 */

export const RESICO_CEILING_CENTS = 350_000_000; // $3,500,000 MXN

/** Umbrales en décimas de punto porcentual (enteros: sin redondeos de coma flotante en la frontera). */
const YELLOW_FROM_TENTHS = 600; // 60.0 %
const RED_FROM_TENTHS = 800; //    80.0 %

export type ResicoSignal = 'GREEN' | 'YELLOW' | 'RED';

export interface ResicoClassRevenue {
  /** Lo RETENIDO de todas las clases cobradas (cobro − reembolsos), en centavos. */
  totalCents: number;
  /** Comisión de YaEntre sobre esas clases. */
  commissionCents: number;
  /** Cuántas clases hubo por carril. */
  carrils: { A: number; B: number };
  /** Parte del total que corresponde al Carril A (para el ingreso «mixto»). Sin dato = 0. */
  carrilA?: { totalCents: number; commissionCents: number };
}

export interface ResicoStatus {
  yearToDateIncomeCents: number;
  subscriptionIncomeCents: number;
  /** Peor caso: todo como Carril B. */
  classIncomeCents: number;
  /** Ingreso de clases si el Carril A cuenta solo su comisión (lo que realmente pasaría). */
  classIncomeMixedCents: number;
  projectedAnnualCents: number;
  percentUsed: number;
  projectedPercentUsed: number;
  signal: ResicoSignal;
  recommendation: string;
  ceilingCents: number;
  carrils: { A: number; B: number };
}

const RECOMMENDATIONS: Record<ResicoSignal, string> = {
  GREEN: 'Holgado. Sin acción necesaria.',
  YELLOW: 'Considerar migrar profesores de Carril B a Carril A para reducir ingreso computable.',
  RED: 'URGENTE: migrar a Carril A y/o considerar constitución de persona moral antes de rebasar $3.5M.',
};

/** Décimas de punto porcentual, redondeadas hacia ABAJO (nunca aparenta más holgura de la que hay). */
function tenthsOfCeiling(cents: number): number {
  return Math.floor((cents * 1000) / RESICO_CEILING_CENTS);
}

export function signalFor(percentTenths: number): ResicoSignal {
  if (percentTenths < YELLOW_FROM_TENTHS) return 'GREEN';
  if (percentTenths < RED_FROM_TENTHS) return 'YELLOW';
  return 'RED';
}

export function calculateResicoStatus(
  subscriptionRevenueCents: number,
  classRevenue: ResicoClassRevenue,
  dayOfYear: number,
  daysInYear = 365
): ResicoStatus {
  for (const [name, value] of [
    ['suscripciones', subscriptionRevenueCents],
    ['clases', classRevenue.totalCents],
    ['comisión', classRevenue.commissionCents],
  ] as const) {
    if (!Number.isInteger(value) || value < 0) {
      throw new Error(`El ingreso de ${name} debe ser un entero de centavos no negativo.`);
    }
  }
  if (!Number.isInteger(dayOfYear) || dayOfYear < 1 || dayOfYear > daysInYear) {
    throw new Error('El día del año debe estar entre 1 y los días del año.');
  }

  const classIncomeCents = classRevenue.totalCents; // peor caso: todo Carril B
  const ytd = subscriptionRevenueCents + classIncomeCents;
  const projected = Math.round((ytd * daysInYear) / dayOfYear);

  const a = classRevenue.carrilA ?? { totalCents: 0, commissionCents: 0 };
  const classIncomeMixedCents = classRevenue.totalCents - a.totalCents + a.commissionCents;

  const pctTenths = tenthsOfCeiling(ytd);
  const signal = signalFor(pctTenths);

  return {
    yearToDateIncomeCents: ytd,
    subscriptionIncomeCents: subscriptionRevenueCents,
    classIncomeCents,
    classIncomeMixedCents,
    projectedAnnualCents: projected,
    percentUsed: pctTenths / 10,
    projectedPercentUsed: tenthsOfCeiling(projected) / 10,
    signal,
    recommendation: RECOMMENDATIONS[signal],
    ceilingCents: RESICO_CEILING_CENTS,
    carrils: classRevenue.carrils,
  };
}

// ─────────────────────────── Año fiscal (hora de México) ───────────────────────────

export interface FiscalYear {
  year: number;
  /** Medianoche del 1 de enero en México, como instante UTC. */
  startUtc: Date;
  /** Medianoche del 1 de enero siguiente (exclusivo). */
  endUtc: Date;
  dayOfYear: number;
  daysInYear: number;
}

const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

/** El año fiscal (= calendario) en curso, medido en hora de México: el 31 de dic a las 23:00 aún es ese año. */
export function fiscalYearOf(now: Date): FiscalYear {
  const local = toMexicoLocal(now);
  const startUtc = new Date(Date.UTC(local.year, 0, 1, MEXICO_UTC_OFFSET_HOURS));
  const endUtc = new Date(Date.UTC(local.year + 1, 0, 1, MEXICO_UTC_OFFSET_HOURS));
  const dayOfYear = Math.floor((now.getTime() - startUtc.getTime()) / 86_400_000) + 1;
  return { year: local.year, startUtc, endUtc, dayOfYear, daysInYear: isLeap(local.year) ? 366 : 365 };
}
