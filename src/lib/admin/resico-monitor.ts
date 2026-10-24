/**
 * G103 — monitor RESICO (spec marketplace §10 + horarios/cursos §5.3). PURO.
 *
 * Semáforo del ingreso propio del año fiscal contra el techo de $3.5 M del
 * RESICO de persona física. Cálculo en PEOR CASO, como pide la spec: el 100 %
 * de cada clase y de cada curso cuenta como ingreso de YaEntre, como si todos
 * los profesores estuvieran en el Carril B (asimilados, donde el total pasa
 * por YaEntre). El desglose «realista» —Carril A solo aporta la comisión del
 * 25 %— se muestra al lado para decidir, pero NO mueve el semáforo: un techo
 * fiscal se vigila por arriba.
 *
 * Es una herramienta de vigilancia para el dueño y su contador, no una
 * determinación fiscal (TODO-CLO: validar con el contador la base exacta —
 * p. ej. si los reembolsos se restan en el mes del cobro o en el del
 * reembolso).
 */
export const RESICO_CEILING_CENTS = 350_000_000; // $3,500,000 MXN

export interface RailRevenue {
  count: number;
  totalCents: number;
  commissionCents: number;
}

export interface MarketplaceRevenue {
  totalCents: number;
  commissionCents: number;
  carrils: { A: RailRevenue; B: RailRevenue };
}

export type ResicoSignal = 'GREEN' | 'YELLOW' | 'RED';

export interface ResicoStatus {
  yearToDateIncomeCents: number; // peor caso — el que manda
  subscriptionIncomeCents: number;
  classIncomeCents: number;
  courseIncomeCents: number;
  /** Carril A solo comisión, Carril B total. Informativo. */
  realisticIncomeCents: number;
  projectedAnnualCents: number;
  projectedOverCeiling: boolean;
  percentUsed: number;
  signal: ResicoSignal;
  recommendation: string;
}

export function emptyMarketplaceRevenue(): MarketplaceRevenue {
  const zero = (): RailRevenue => ({ count: 0, totalCents: 0, commissionCents: 0 });
  return { totalCents: 0, commissionCents: 0, carrils: { A: zero(), B: zero() } };
}

function realistic(r: MarketplaceRevenue): number {
  return r.carrils.A.commissionCents + r.carrils.B.totalCents;
}

export function calculateResicoStatusV2(
  subscriptionRevenueCents: number,
  classRevenue: MarketplaceRevenue,
  courseRevenue: MarketplaceRevenue,
  dayOfYear: number,
  daysInYear = 365
): ResicoStatus {
  // Peor caso: el total de clases y cursos, sin importar el carril.
  const classIncomeCents = classRevenue.totalCents;
  const courseIncomeCents = courseRevenue.totalCents;
  const ytd = subscriptionRevenueCents + classIncomeCents + courseIncomeCents;
  const day = Math.min(Math.max(1, Math.trunc(dayOfYear)), daysInYear);
  const projected = Math.round((ytd * daysInYear) / day);
  const pct = (ytd / RESICO_CEILING_CENTS) * 100;

  let signal: ResicoSignal;
  let recommendation: string;
  if (pct < 60) {
    signal = 'GREEN';
    recommendation = 'Holgado. Sin acción necesaria.';
  } else if (pct < 80) {
    signal = 'YELLOW';
    recommendation = 'Considerar migrar profesores de Carril B a Carril A para reducir ingreso computable.';
  } else {
    signal = 'RED';
    recommendation = 'URGENTE: migrar a Carril A y/o considerar constitución de persona moral antes de rebasar $3.5M.';
  }

  return {
    yearToDateIncomeCents: ytd,
    subscriptionIncomeCents: subscriptionRevenueCents,
    classIncomeCents,
    courseIncomeCents,
    realisticIncomeCents: subscriptionRevenueCents + realistic(classRevenue) + realistic(courseRevenue),
    projectedAnnualCents: projected,
    projectedOverCeiling: projected > RESICO_CEILING_CENTS,
    percentUsed: Math.round(pct * 10) / 10,
    signal,
    recommendation,
  };
}

/** Día del año (1-366) y días del año de una clave `YYYY-MM-DD` de México. */
export function dayOfYearFromKey(key: string): { year: number; dayOfYear: number; daysInYear: number } {
  const [y, m, d] = key.split('-').map(Number);
  const start = Date.UTC(y, 0, 1);
  const dayOfYear = Math.round((Date.UTC(y, m - 1, d) - start) / 86_400_000) + 1;
  const daysInYear = Math.round((Date.UTC(y + 1, 0, 1) - start) / 86_400_000);
  return { year: y, dayOfYear, daysInYear };
}
