import { MEXICO_UTC_OFFSET_HOURS } from '@/lib/paywall/mexico-time';
import { toMexicoLocal } from '@/lib/teachers/schedule';

/**
 * MONITOR RESICO (spec del marketplace §10, prioridad alta). Semáforo del
 * ingreso PROPIO anual contra el techo de $3.5M del régimen RESICO. Módulo PURO:
 * recibe los totales ya sumados y devuelve el estado; no toca la base.
 *
 * ── Qué cuenta como ingreso propio (por carril) ─────────────────────────────
 *
 *  · Suscripciones: el 100% de lo cobrado (todos los planes causan IVA y llevan
 *    el IVA incluido en el precio).
 *  · Clases, Carril A (comisión mercantil, el profesor factura): SOLO la
 *    comisión de YaEntre. El resto del cobro es del profesor.
 *  · Clases, Carril B (asimilados a salarios): el VALOR COMPLETO de la clase. Es
 *    el peor caso —YaEntre recibe el 100% y paga al profesor como nómina, y RESICO
 *    no admite deducciones— y por eso migrar profesores del B al A es la palanca.
 *
 * La spec trae una contradicción interna: su código suma el total de TODAS las
 * clases (como si todo fuera Carril B) pero el comentario del tipo y su
 * pantalla de ejemplo desglosan «Carril A (comisión) + Carril B (total)». El
 * Bloque 2 siguió el código (más conservador); el Bloque 3 sigue el desglose por
 * carril que pidió el dueño. El «techo teórico» del código original se conserva
 * como referencia (`classIncomeAllCarrilBCents`), pero ya no manda sobre el color.
 *
 * ── Criterios conservadores (prefieren avisar de más que de menos) ──────────
 *
 *  · Base de EFECTIVO: cuenta lo COBRADO en el año fiscal, no lo devengado, y ya
 *    neto de lo devuelto.
 *  · Los importes incluyen IVA y aquí NO se separa para el semáforo: el techo de
 *    RESICO se mide sin IVA, así que el porcentaje sale ~16% más alto que el real.
 *    Es un margen de seguridad deliberado, y una pregunta abierta para el
 *    contador. La cifra sin IVA se muestra aparte como referencia.
 *  · El semáforo se decide por lo ACUMULADO, como pide la spec. La proyección se
 *    expone aparte: en enero una proyección lineal se dispara por una sola venta,
 *    así que no manda sobre el color, pero sí se ve.
 */

export const RESICO_CEILING_CENTS = 350_000_000; // $3,500,000 MXN

/** Umbrales en décimas de punto porcentual (enteros: sin redondeos de coma flotante en la frontera). */
const YELLOW_FROM_TENTHS = 600; // 60.0 %
const RED_FROM_TENTHS = 800; //    80.0 %

/** IVA general incluido en el precio: sin IVA = con IVA / 1.16. */
const IVA_DIVISOR_NUM = 100;
const IVA_DIVISOR_DEN = 116;

export type ResicoSignal = 'GREEN' | 'YELLOW' | 'RED';

/** Una clase cobrada, ya reducida a lo que el monitor necesita. */
export interface ClassRevenueRow {
  /** Cobrado menos lo que se debe devolver, en centavos (≥ 0). Una clase totalmente reembolsada aporta 0. */
  retainedCents: number;
  /** Comisión de YaEntre sellada en la fila (25% de lo retenido). */
  commissionCents: number;
  /** COMISION_MERCANTIL = Carril A · ASIMILADOS = Carril B. */
  rail: 'COMISION_MERCANTIL' | 'ASIMILADOS';
}

export interface RailRevenue {
  /** Clases con ingreso (retenido > 0). */
  classes: number;
  /** Valor retenido total de esas clases. */
  totalCents: number;
  /** Comisión de YaEntre sobre ellas. */
  commissionCents: number;
}

export interface ResicoClassRevenue {
  carrilA: RailRevenue;
  carrilB: RailRevenue;
}

export interface ResicoRailIncome extends RailRevenue {
  /** Lo que cuenta como ingreso PROPIO: Carril A = la comisión; Carril B = todo el valor. */
  incomeCents: number;
}

export interface ResicoStatus {
  yearToDateIncomeCents: number;
  subscriptionIncomeCents: number;
  /** Ingreso propio por clases: comisión del Carril A + valor completo del Carril B. Gobierna el semáforo. */
  classIncomeCents: number;
  carrilA: ResicoRailIncome;
  carrilB: ResicoRailIncome;
  /** Techo teórico: si TODAS las clases fueran Carril B (lo que sumaba el código de la spec). Solo referencia. */
  classIncomeAllCarrilBCents: number;
  /** Cuánto bajaría el ingreso computable si todas las clases del Carril B pasaran al A: el ahorro de migrar. */
  migrationSavingsCents: number;
  projectedAnnualCents: number;
  percentUsed: number;
  projectedPercentUsed: number;
  signal: ResicoSignal;
  recommendation: string;
  ceilingCents: number;
  /** Referencia legal: el acumulado sin IVA (el techo de RESICO se mide sin IVA). No gobierna el semáforo. */
  yearToDateExcludingIvaCents: number;
  percentUsedExcludingIva: number;
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

const isCents = (n: number) => Number.isInteger(n) && n >= 0;

/**
 * Reduce las clases cobradas a los totales por carril. Vive aquí, y no en la
 * capa de datos, para que la regla «qué cuenta en cada carril» se pueda probar
 * sin base de datos.
 *
 * Una clase totalmente reembolsada (retenido 0) no cuenta ni como clase. La
 * comisión se acota a lo retenido: la fila la sella como el 25% de lo retenido,
 * así que solo podría excederlo si un dato estuviera mal, y en ese caso es
 * mejor no inflar el ingreso que reventar el monitor.
 */
export function aggregateClassRevenue(rows: readonly ClassRevenueRow[]): ResicoClassRevenue {
  const empty = (): RailRevenue => ({ classes: 0, totalCents: 0, commissionCents: 0 });
  const out: ResicoClassRevenue = { carrilA: empty(), carrilB: empty() };

  for (const row of rows) {
    if (!isCents(row.retainedCents) || !isCents(row.commissionCents)) {
      throw new Error('Cada clase debe traer centavos enteros no negativos.');
    }
    if (row.retainedCents === 0) continue;
    const target = row.rail === 'COMISION_MERCANTIL' ? out.carrilA : out.carrilB;
    target.classes += 1;
    target.totalCents += row.retainedCents;
    target.commissionCents += Math.min(row.commissionCents, row.retainedCents);
  }
  return out;
}

export function calculateResicoStatus(
  subscriptionRevenueCents: number,
  classRevenue: ResicoClassRevenue,
  dayOfYear: number,
  daysInYear = 365
): ResicoStatus {
  const a = classRevenue.carrilA;
  const b = classRevenue.carrilB;

  for (const [name, value] of [
    ['suscripciones', subscriptionRevenueCents],
    ['clases del Carril A', a.totalCents],
    ['comisión del Carril A', a.commissionCents],
    ['clases del Carril B', b.totalCents],
    ['comisión del Carril B', b.commissionCents],
  ] as const) {
    if (!isCents(value)) {
      throw new Error(`El ingreso de ${name} debe ser un entero de centavos no negativo.`);
    }
  }
  if (a.commissionCents > a.totalCents || b.commissionCents > b.totalCents) {
    throw new Error('La comisión de un carril no puede exceder el valor de sus clases.');
  }
  if (!Number.isInteger(dayOfYear) || dayOfYear < 1 || dayOfYear > daysInYear) {
    throw new Error('El día del año debe estar entre 1 y los días del año.');
  }

  const carrilA: ResicoRailIncome = { ...a, incomeCents: a.commissionCents }; // A: solo la comisión
  const carrilB: ResicoRailIncome = { ...b, incomeCents: b.totalCents }; //       B: el valor completo

  const classIncomeCents = carrilA.incomeCents + carrilB.incomeCents;
  const ytd = subscriptionRevenueCents + classIncomeCents;
  const projected = Math.round((ytd * daysInYear) / dayOfYear);

  const pctTenths = tenthsOfCeiling(ytd);
  const signal = signalFor(pctTenths);
  const ytdExIva = Math.floor((ytd * IVA_DIVISOR_NUM) / IVA_DIVISOR_DEN);

  return {
    yearToDateIncomeCents: ytd,
    subscriptionIncomeCents: subscriptionRevenueCents,
    classIncomeCents,
    carrilA,
    carrilB,
    classIncomeAllCarrilBCents: a.totalCents + b.totalCents,
    migrationSavingsCents: b.totalCents - b.commissionCents,
    projectedAnnualCents: projected,
    percentUsed: pctTenths / 10,
    projectedPercentUsed: tenthsOfCeiling(projected) / 10,
    signal,
    recommendation: RECOMMENDATIONS[signal],
    ceilingCents: RESICO_CEILING_CENTS,
    yearToDateExcludingIvaCents: ytdExIva,
    percentUsedExcludingIva: tenthsOfCeiling(ytdExIva) / 10,
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
