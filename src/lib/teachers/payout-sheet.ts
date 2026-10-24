import { formatMxn, maskTail } from '@/lib/format/mx';
import { MEXICO_TIME_ZONE } from '@/lib/paywall/mexico-time';

/**
 * G103 — «hoja de pago» que el admin usa para hacer cada SPEI a mano (spec
 * marketplace §7.3 + horarios/cursos §5.2). PURO.
 *
 * La CLABE completa y el nombre legal solo salen para el admin MAESTRO, que es
 * quien transfiere; cualquier otro ADMIN ve la CLABE enmascarada. En la
 * interfaz y en los documentos el pago se llama «liquidación» (de comisión
 * mercantil en el Carril A); nunca «salario», «sueldo» ni «honorarios».
 */

export function payoutReference(payoutId: string): string {
  return `YAENTRE-PO-${payoutId.slice(-8).toUpperCase()}`;
}

const DAY = new Intl.DateTimeFormat('es-MX', { day: 'numeric', timeZone: MEXICO_TIME_ZONE });
const DAY_MONTH = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', timeZone: MEXICO_TIME_ZONE });
const DAY_MONTH_YEAR = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric', timeZone: MEXICO_TIME_ZONE });
const MONTH = new Intl.DateTimeFormat('es-MX', { month: 'numeric', timeZone: MEXICO_TIME_ZONE });

/** «19–25 oct 2026» (el fin del periodo es exclusivo: se pinta el domingo). */
export function payoutPeriodLabel(periodStart: Date, periodEnd: Date): string {
  const lastDay = new Date(periodEnd.getTime() - 1);
  const sameMonth = MONTH.format(periodStart) === MONTH.format(lastDay);
  const start = sameMonth ? DAY.format(periodStart) : DAY_MONTH.format(periodStart);
  return `${start}–${DAY_MONTH_YEAR.format(lastDay)}`.replace(/\./g, '');
}

export const PAYMENT_RAIL_LABELS = {
  ASIMILADOS: 'Carril B — asimilados (el CFDI lo emite el contador)',
  COMISION_MERCANTIL: 'Carril A — comisión mercantil (el profesor factura)',
} as const;

export interface PayoutForSheet {
  id: string;
  status: string;
  periodStart: Date;
  periodEnd: Date;
  classRevenueCents: number;
  courseRevenueCents: number;
  grossCents: number;
  retentionCents: number;
  adjustmentCents: number;
  releasedRetentionCents: number;
  netCents: number;
  classCount: number;
  enrollmentCount: number;
  speiReference: string | null;
  teacher: {
    fullName: string;
    displayName: string;
    clabe: string;
    bankName: string;
    paymentRail: keyof typeof PAYMENT_RAIL_LABELS;
  };
}

export interface PayoutSheetRow {
  payoutId: string;
  status: string;
  teacherName: string;
  clabe: string;
  clabeMasked: boolean;
  bankName: string;
  railLabel: string;
  periodLabel: string;
  reference: string;
  classCount: number;
  enrollmentCount: number;
  classRevenue: string;
  courseRevenue: string;
  gross: string;
  retention: string;
  released: string | null;
  adjustment: string | null;
  net: string;
  netCents: number;
  speiReference: string | null;
}

export function buildPayoutSheetRow(p: PayoutForSheet, opts: { revealBankData: boolean }): PayoutSheetRow {
  return {
    payoutId: p.id,
    status: p.status,
    teacherName: opts.revealBankData ? p.teacher.fullName : p.teacher.displayName,
    clabe: opts.revealBankData ? p.teacher.clabe : maskTail(p.teacher.clabe),
    clabeMasked: !opts.revealBankData,
    bankName: p.teacher.bankName,
    railLabel: PAYMENT_RAIL_LABELS[p.teacher.paymentRail],
    periodLabel: payoutPeriodLabel(p.periodStart, p.periodEnd),
    reference: payoutReference(p.id),
    classCount: p.classCount,
    enrollmentCount: p.enrollmentCount,
    classRevenue: formatMxn(p.classRevenueCents),
    courseRevenue: formatMxn(p.courseRevenueCents),
    gross: formatMxn(p.grossCents),
    retention: `−${formatMxn(p.retentionCents)}`,
    released: p.releasedRetentionCents > 0 ? `+${formatMxn(p.releasedRetentionCents)}` : null,
    adjustment:
      p.adjustmentCents === 0
        ? null
        : p.adjustmentCents < 0
          ? `−${formatMxn(-p.adjustmentCents)}`
          : `+${formatMxn(p.adjustmentCents)}`,
    net: formatMxn(p.netCents),
    netCents: p.netCents,
    speiReference: p.speiReference,
  };
}

/** Solo las liquidaciones APROBADAS van a la hoja del día (las que se transfieren). */
export function generatePayoutSheet(payouts: readonly PayoutForSheet[], opts: { revealBankData: boolean }): PayoutSheetRow[] {
  return payouts.filter((p) => p.status === 'APPROVED').map((p) => buildPayoutSheetRow(p, opts));
}

export const PAYOUT_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Por aprobar',
  APPROVED: 'Aprobada, por transferir',
  TRANSFERRED: 'Transferida',
  FAILED: 'Transferencia fallida',
  CANCELLED: 'Cancelada',
};
