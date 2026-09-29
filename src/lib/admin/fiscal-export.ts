import { toMexicoLocal } from '@/lib/teachers/schedule';
import {
  mexicoMonthOf,
  splitIva,
  type ClassIncomeRow,
  type MonthRef,
  type RefundRow,
} from './fiscal';

/**
 * EXPORTACIÓN MENSUAL PARA EL CONTADOR (CSV) — Bloque 3. Módulo PURO.
 *
 * Es la lista de partidas que el contador necesita para armar el CFDI global
 * mensual (público en general, regla 2.7.1.21 RMF): una fila por cobro,
 * devolución o clase del mes, con su base, su IVA y su importe con IVA.
 *
 * 🔒 NO lleva ningún dato personal: ni nombre, ni correo, ni identificador de
 * cuenta. Una factura global al público en general no los necesita, y un archivo
 * que sale del sistema hacia una persona externa (el contador) no tiene por qué
 * cargar los datos de alumnos que son a veces menores (LFPDPPP: minimización).
 *
 * El IVA de cada FILA se calcula individualmente y es informativo: la suma de las
 * filas puede diferir por centavos del IVA del mes, que se calcula sobre el total
 * (`buildMonthlyFiscal`). La última fila del archivo es ese total, aparte.
 */

export type ExportKind = 'COBRO' | 'DEVOLUCION' | 'CLASE_CARRIL_A_COMISION' | 'CLASE_CARRIL_B';

export interface ExportRow {
  /** Fecha en hora de México, `YYYY-MM-DD`. */
  date: string;
  kind: ExportKind;
  /** Concepto legible: el plan, o «Clase». */
  concept: string;
  method: string;
  /** Importe con IVA en centavos. Una devolución va en NEGATIVO. */
  grossCents: number;
  baseCents: number;
  ivaCents: number;
}

export interface ExportPayment {
  amountCents: number;
  paidAt: Date;
  planLabel: string;
  method: string;
}

const two = (n: number) => String(n).padStart(2, '0');

function mexicoDate(d: Date): string {
  const l = toMexicoLocal(d);
  return `${l.year}-${two(l.month + 1)}-${two(l.day)}`;
}

const sameMonth = (d: Date, ref: MonthRef) => {
  const m = mexicoMonthOf(d);
  return m.year === ref.year && m.month === ref.month;
};

function row(date: Date, kind: ExportKind, concept: string, method: string, grossCents: number): ExportRow {
  const { baseCents, ivaCents } = splitIva(grossCents);
  return { date: mexicoDate(date), kind, concept, method, grossCents, baseCents, ivaCents };
}

export function buildExportRows(
  ref: MonthRef,
  input: {
    payments: readonly ExportPayment[];
    refunds: readonly (RefundRow & { planLabel: string; method: string })[];
    classes: readonly ClassIncomeRow[];
  }
): ExportRow[] {
  const rows: ExportRow[] = [];

  for (const p of input.payments) {
    if (sameMonth(p.paidAt, ref)) rows.push(row(p.paidAt, 'COBRO', p.planLabel, p.method, p.amountCents));
  }
  for (const r of input.refunds) {
    if (sameMonth(r.occurredAt, ref)) rows.push(row(r.occurredAt, 'DEVOLUCION', r.planLabel, r.method, -r.amountCents));
  }
  for (const c of input.classes) {
    if (!sameMonth(c.paidAt, ref) || c.retainedCents === 0) continue;
    if (c.rail === 'COMISION_MERCANTIL') {
      rows.push(row(c.paidAt, 'CLASE_CARRIL_A_COMISION', 'Clase (comisión de YaEntre)', 'TARJETA', Math.min(c.commissionCents, c.retainedCents)));
    } else {
      rows.push(row(c.paidAt, 'CLASE_CARRIL_B', 'Clase (valor completo)', 'TARJETA', c.retainedCents));
    }
  }

  // Orden estable y legible: por fecha y, dentro del día, por tipo.
  return rows.sort((a, b) => a.date.localeCompare(b.date) || a.kind.localeCompare(b.kind));
}

// ─────────────────────────────── CSV ───────────────────────────────

/** Pesos con dos decimales, sin símbolo ni separador de miles: lo que una hoja de cálculo lee como número. */
export function centsToDecimal(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  return `${sign}${Math.floor(abs / 100)}.${two(abs % 100)}`;
}

/**
 * Una celda de TEXTO. Se entrecomilla si trae coma, comillas o saltos de línea, y
 * si empieza por `=`, `+`, `-`, `@`, tab o retorno se le antepone un apóstrofo:
 * una hoja de cálculo evaluaría ese texto como FÓRMULA (inyección de fórmulas en
 * CSV). Los importes no pasan por aquí — son números que salen de `centsToDecimal`.
 */
export function csvText(value: string): string {
  const guarded = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(guarded) ? `"${guarded.replace(/"/g, '""')}"` : guarded;
}

export const CSV_HEADER = ['fecha', 'tipo', 'concepto', 'metodo', 'importe_con_iva', 'base_sin_iva', 'iva'] as const;

export function toCsv(rows: readonly ExportRow[], total: { grossCents: number; baseCents: number; ivaCents: number }): string {
  const lines: string[] = [CSV_HEADER.join(',')];
  for (const r of rows) {
    lines.push(
      [
        csvText(r.date),
        csvText(r.kind),
        csvText(r.concept),
        csvText(r.method),
        centsToDecimal(r.grossCents),
        centsToDecimal(r.baseCents),
        centsToDecimal(r.ivaCents),
      ].join(',')
    );
  }
  lines.push(
    [
      csvText('TOTAL DEL MES'),
      '',
      csvText('IVA calculado sobre el total, no fila por fila'),
      '',
      centsToDecimal(total.grossCents),
      centsToDecimal(total.baseCents),
      centsToDecimal(total.ivaCents),
    ].join(',')
  );
  // CRLF: lo que espera un CSV según RFC 4180 y lo que Excel abre sin sorpresas.
  return `${lines.join('\r\n')}\r\n`;
}
