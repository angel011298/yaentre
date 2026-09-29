import { MEXICO_UTC_OFFSET_HOURS } from '@/lib/paywall/mexico-time';
import { toMexicoLocal } from '@/lib/teachers/schedule';

/**
 * TABLERO FISCAL — Bloque 3. Módulo PURO: recibe filas ya leídas y devuelve el
 * estado fiscal por mes; no toca la base ni la red. Todo importe viaja en
 * CENTAVOS ENTEROS y se convierte a texto solo al pintarlo.
 *
 * ── Qué es esto y qué NO es ─────────────────────────────────────────────────
 *
 * Es un tablero de CONTROL para el dueño y el contador, calculado con lo que el
 * sistema SABE. No es una declaración ni sustituye la contabilidad: el IVA
 * acreditable (el IVA de las comisiones de Stripe, del hosting, etc.) vive en las
 * facturas RECIBIDAS y el sistema no las tiene, así que «IVA por enterar» aquí es
 * el IVA TRASLADADO, antes de acreditar. Y las retenciones dependen de dos
 * decisiones que siguen abiertas (handoff §6.6 y §6.7); por eso se muestran como
 * ESCENARIOS y nunca como una cifra a pagar.
 *
 * ── Reglas que ya están decididas (handoff §3.1) ────────────────────────────
 *
 *  · Todos los planes causan IVA del 16 %, INCLUIDO en el precio exhibido.
 *  · Base de EFECTIVO: cuenta lo cobrado en el mes (`paidAt`), en hora de
 *    México. Las devoluciones restan en el mes en que se HACEN, que puede no ser
 *    el del cobro (`payment_refunds.occurredAt`).
 *  · El IVA se calcula sobre el TOTAL del mes, no cobro por cobro: es lo que dirá
 *    el CFDI global mensual (regla 2.7.1.21 RMF), y sumar redondeos individuales
 *    puede diferir de él por algunos centavos.
 *
 * ── Ingreso propio por fuente ───────────────────────────────────────────────
 *
 *  · Suscripciones: el 100 % de lo cobrado.
 *  · Clases, Carril A (comisión mercantil): SOLO la comisión de YaEntre. El resto
 *    es del profesor.
 *  · Clases, Carril B (asimilados): el valor completo de la clase (YaEntre lo
 *    recibe todo y absorbe el IVA).
 *
 * Es la MISMA regla del monitor RESICO (`resico-monitor.ts`); las dos pantallas
 * tienen que cuadrar.
 */

// ─────────────────────────────── IVA ───────────────────────────────

const IVA_DEN = 116; // 100 de base + 16 de IVA

/**
 * De un importe con IVA incluido a su base y su IVA. `iva + base === bruto`,
 * siempre. Acepta un importe NEGATIVO (un mes en que lo devuelto supera lo
 * cobrado) y lo trata simétrico: el redondeo es el mismo con el signo cambiado,
 * de modo que un cobro y su devolución del mismo monto se cancelan al centavo.
 */
export function splitIva(grossCents: number): { baseCents: number; ivaCents: number } {
  if (!Number.isInteger(grossCents)) {
    throw new Error('El importe debe ser un entero de centavos.');
  }
  const sign = grossCents < 0 ? -1 : 1;
  const abs = Math.abs(grossCents);
  const baseCents = Math.round((abs * 100) / IVA_DEN);
  return { baseCents: sign * baseCents, ivaCents: sign * (abs - baseCents) };
}

// ─────────────────────────────── Meses en hora de México ───────────────────────────────

export interface MonthRef {
  year: number;
  /** 1 = enero … 12 = diciembre. */
  month: number;
}

export function monthKey(ref: MonthRef): string {
  return `${ref.year}-${String(ref.month).padStart(2, '0')}`;
}

export function parseMonthKey(key: string): MonthRef | null {
  const m = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(key);
  return m ? { year: Number(m[1]), month: Number(m[2]) } : null;
}

/** El mes (año y número) de un instante, medido en hora de México. */
export function mexicoMonthOf(date: Date): MonthRef {
  const l = toMexicoLocal(date);
  return { year: l.year, month: l.month + 1 };
}

/** Rango [inicio, fin) de un mes en hora de México, como instantes UTC. */
export function monthRangeUtc(ref: MonthRef): { startUtc: Date; endUtc: Date } {
  return {
    startUtc: new Date(Date.UTC(ref.year, ref.month - 1, 1, MEXICO_UTC_OFFSET_HOURS)),
    endUtc: new Date(Date.UTC(ref.year, ref.month, 1, MEXICO_UTC_OFFSET_HOURS)),
  };
}

/**
 * Fecha límite para enterar el IVA y las retenciones de un mes: el día 17 del mes
 * SIGUIENTE. Si cae en sábado o domingo se recorre al lunes (art. 12 CFF). NO
 * considera días festivos: el calendario oficial no está en el sistema, y el
 * contador confirma la fecha real.
 */
export function dueDate17(ref: MonthRef): Date {
  const nextYear = ref.month === 12 ? ref.year + 1 : ref.year;
  const nextMonth = ref.month === 12 ? 1 : ref.month + 1;
  // Fin del día 17 en México (23:59:59.999 UTC−6).
  const end = Date.UTC(nextYear, nextMonth - 1, 17, 23 + MEXICO_UTC_OFFSET_HOURS, 59, 59, 999);
  const weekday = new Date(Date.UTC(nextYear, nextMonth - 1, 17)).getUTCDay(); // día de la semana del calendario
  const shiftDays = weekday === 6 ? 2 : weekday === 0 ? 1 : 0;
  return new Date(end + shiftDays * 86_400_000);
}

// ─────────────────────────────── Ledger mensual ───────────────────────────────

export interface SubscriptionPaymentRow {
  amountCents: number;
  paidAt: Date;
}

export interface RefundRow {
  amountCents: number;
  occurredAt: Date;
}

export interface ClassIncomeRow {
  /** Lo cobrado menos lo que se debe devolver (≥ 0). */
  retainedCents: number;
  /** Comisión de YaEntre sellada en la fila. */
  commissionCents: number;
  rail: 'COMISION_MERCANTIL' | 'ASIMILADOS';
  paidAt: Date;
}

export interface MonthlyFiscal {
  month: MonthRef;
  key: string;
  /** Cobrado por suscripciones (IVA incluido). */
  subscriptionsGrossCents: number;
  /** Comisión de YaEntre en clases del Carril A (IVA incluido). */
  classCarrilACommissionCents: number;
  /** Valor completo de las clases del Carril B (IVA incluido). */
  classCarrilBGrossCents: number;
  /** Devuelto en el mes en suscripciones (se resta en el mes en que se hace). */
  subscriptionRefundsCents: number;
  /**
   * Ingreso propio neto del mes, IVA incluido. Puede ser NEGATIVO: si en un mes se
   * devuelve más de lo que se cobró, el IVA de ese mes sale a favor. Se muestra
   * tal cual en vez de recortarlo a cero, que escondería el saldo a favor.
   */
  ownIncomeGrossCents: number;
  /** Base gravable (sin IVA) y IVA trasladado sobre ese ingreso (mismo signo). */
  baseCents: number;
  ivaCents: number;
  /** Cuándo vence el entero de este mes. */
  dueDate: Date;
  /** Cuántas partidas entraron (para saber si el mes tiene movimiento). */
  movements: number;
}

const inMonth = (d: Date, ref: MonthRef) => {
  const m = mexicoMonthOf(d);
  return m.year === ref.year && m.month === ref.month;
};

function assertCents(name: string, value: number) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${name} debe ser un entero de centavos no negativo.`);
  }
}

/** Reduce las filas de UN mes a su estado fiscal. */
export function buildMonthlyFiscal(
  ref: MonthRef,
  input: {
    payments: readonly SubscriptionPaymentRow[];
    refunds: readonly RefundRow[];
    classes: readonly ClassIncomeRow[];
  }
): MonthlyFiscal {
  let subscriptionsGross = 0;
  let refunds = 0;
  let carrilA = 0;
  let carrilB = 0;
  let movements = 0;

  for (const p of input.payments) {
    assertCents('El cobro', p.amountCents);
    if (!inMonth(p.paidAt, ref)) continue;
    subscriptionsGross += p.amountCents;
    movements += 1;
  }
  for (const r of input.refunds) {
    assertCents('La devolución', r.amountCents);
    if (!inMonth(r.occurredAt, ref)) continue;
    refunds += r.amountCents;
    movements += 1;
  }
  for (const c of input.classes) {
    assertCents('El valor de la clase', c.retainedCents);
    assertCents('La comisión', c.commissionCents);
    if (!inMonth(c.paidAt, ref) || c.retainedCents === 0) continue;
    movements += 1;
    if (c.rail === 'COMISION_MERCANTIL') carrilA += Math.min(c.commissionCents, c.retainedCents);
    else carrilB += c.retainedCents;
  }

  const ownIncome = subscriptionsGross + carrilA + carrilB - refunds;
  const { baseCents, ivaCents } = splitIva(ownIncome);

  return {
    month: ref,
    key: monthKey(ref),
    subscriptionsGrossCents: subscriptionsGross,
    classCarrilACommissionCents: carrilA,
    classCarrilBGrossCents: carrilB,
    subscriptionRefundsCents: refunds,
    ownIncomeGrossCents: ownIncome,
    baseCents,
    ivaCents,
    dueDate: dueDate17(ref),
    movements,
  };
}

/** Los 12 meses de un año fiscal (o hasta `throughMonth`, si se da). */
export function buildFiscalYear(
  year: number,
  input: {
    payments: readonly SubscriptionPaymentRow[];
    refunds: readonly RefundRow[];
    classes: readonly ClassIncomeRow[];
  },
  throughMonth = 12
): MonthlyFiscal[] {
  const out: MonthlyFiscal[] = [];
  for (let month = 1; month <= Math.min(12, throughMonth); month += 1) {
    out.push(buildMonthlyFiscal({ year, month }, input));
  }
  return out;
}

/** Suma de un año: los totales de la fila «Año». */
export function totalsOf(months: readonly MonthlyFiscal[]) {
  return months.reduce(
    (acc, m) => ({
      subscriptionsGrossCents: acc.subscriptionsGrossCents + m.subscriptionsGrossCents,
      classCarrilACommissionCents: acc.classCarrilACommissionCents + m.classCarrilACommissionCents,
      classCarrilBGrossCents: acc.classCarrilBGrossCents + m.classCarrilBGrossCents,
      subscriptionRefundsCents: acc.subscriptionRefundsCents + m.subscriptionRefundsCents,
      ownIncomeGrossCents: acc.ownIncomeGrossCents + m.ownIncomeGrossCents,
      baseCents: acc.baseCents + m.baseCents,
      ivaCents: acc.ivaCents + m.ivaCents,
    }),
    {
      subscriptionsGrossCents: 0,
      classCarrilACommissionCents: 0,
      classCarrilBGrossCents: 0,
      subscriptionRefundsCents: 0,
      ownIncomeGrossCents: 0,
      baseCents: 0,
      ivaCents: 0,
    }
  );
}

// ─────────────────────────────── Vencimientos ───────────────────────────────

export type DueStatus = 'OVERDUE' | 'DUE_SOON' | 'UPCOMING' | 'NO_ACTIVITY';

/**
 * Estado del vencimiento de un mes respecto de HOY. Un mes sin movimiento no
 * vence en nada (`NO_ACTIVITY`); uno que aún no termina no se puede enterar
 * todavía (`UPCOMING`, aunque su fecha sea futura).
 */
export function dueStatus(m: MonthlyFiscal, now: Date, soonDays = 5): DueStatus {
  if (m.movements === 0) return 'NO_ACTIVITY';
  const { endUtc } = monthRangeUtc(m.month);
  if (now.getTime() < endUtc.getTime()) return 'UPCOMING';
  const msLeft = m.dueDate.getTime() - now.getTime();
  if (msLeft < 0) return 'OVERDUE';
  return msLeft <= soonDays * 86_400_000 ? 'DUE_SOON' : 'UPCOMING';
}

// ─────────────────────────────── Retenciones (ESCENARIOS) ───────────────────────────────

/**
 * Tasas de ISR de plataforma que están EN DISCUSIÓN (handoff §6.6: «1 % vs
 * 2.5 %», consulta al contador). Se muestran las dos como ESCENARIOS: elegir una
 * sería adivinar una decisión abierta. Cuando el contador conteste, esta lista
 * se reduce a la tasa confirmada.
 */
export const ISR_SCENARIO_RATES_BPS = [100, 250] as const;

export interface RetentionScenario {
  ratePercent: number;
  /** Base sin IVA sobre la que se aplicaría. */
  baseCents: number;
  isrCents: number;
}

/**
 * ISR que se retendría a los profesores del Carril A si se pagara `carrilAPayCents`
 * (lo que YaEntre les debe por clases impartidas en el mes, IVA incluido).
 *
 * ⚠️ NO es una retención efectuada: hoy no se paga a nadie (el motor de
 * liquidación está bloqueado hasta que el contador valide el proceso), así que
 * nada se ha retenido. Sirve para dimensionar la obligación futura. El IVA
 * retenido no se calcula: su tasa sigue abierta (handoff §6.7) y este módulo no
 * inventa una.
 */
export function retentionScenarios(carrilAPayCents: number): RetentionScenario[] {
  const { baseCents } = splitIva(carrilAPayCents);
  return ISR_SCENARIO_RATES_BPS.map((bps) => ({
    ratePercent: bps / 100,
    baseCents,
    isrCents: Math.round((baseCents * bps) / 10_000),
  }));
}

// ─────────────────────────────── Reserva de desempeño ───────────────────────────────

/** Días naturales que se retiene la reserva de desempeño (handoff §4.4). */
export const RESERVE_HOLD_DAYS = 30;

export interface ReserveRow {
  retentionCents: number;
  status: 'HELD' | 'RELEASED' | 'FORFEITED';
  /** Cuándo se transfirió la liquidación de la que salió la reserva (desde ahí corren los 30 días). */
  transferredAt: Date | null;
}

export interface ReserveSummary {
  heldCents: number;
  releasedCents: number;
  forfeitedCents: number;
  heldCount: number;
  /** La liberación más próxima de lo retenido, o `null` si no hay nada retenido con fecha. */
  nextReleaseAt: Date | null;
  /** Reservas HELD cuyos 30 días ya pasaron: debieron liberarse. Distinto de cero = el job de liberación no corre. */
  overdueCount: number;
}

export function summarizeReserves(rows: readonly ReserveRow[], now: Date): ReserveSummary {
  let held = 0;
  let released = 0;
  let forfeited = 0;
  let heldCount = 0;
  let overdue = 0;
  let next: number | null = null;

  for (const r of rows) {
    assertCents('La reserva', r.retentionCents);
    if (r.status === 'RELEASED') released += r.retentionCents;
    else if (r.status === 'FORFEITED') forfeited += r.retentionCents;
    else {
      held += r.retentionCents;
      heldCount += 1;
      if (r.transferredAt) {
        const releaseAt = r.transferredAt.getTime() + RESERVE_HOLD_DAYS * 86_400_000;
        if (releaseAt <= now.getTime()) overdue += 1;
        else if (next === null || releaseAt < next) next = releaseAt;
      }
    }
  }

  return {
    heldCents: held,
    releasedCents: released,
    forfeitedCents: forfeited,
    heldCount,
    nextReleaseAt: next === null ? null : new Date(next),
    overdueCount: overdue,
  };
}
