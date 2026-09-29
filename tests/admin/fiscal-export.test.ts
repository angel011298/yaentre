import { describe, expect, it } from 'vitest';
import {
  CSV_HEADER,
  buildExportRows,
  centsToDecimal,
  csvText,
  toCsv,
  type ExportPayment,
} from '@/lib/admin/fiscal-export';
import { buildMonthlyFiscal } from '@/lib/admin/fiscal';

const OCT = { year: 2026, month: 10 };

const payment = (amountCents: number, iso: string, planLabel = 'Básico', method = 'CARD'): ExportPayment => ({
  amountCents,
  paidAt: new Date(iso),
  planLabel,
  method,
});

describe('centsToDecimal — lo que una hoja de cálculo lee como número', () => {
  it('siempre dos decimales, sin símbolo ni separador de miles', () => {
    expect(centsToDecimal(99_900)).toBe('999.00');
    expect(centsToDecimal(5)).toBe('0.05');
    expect(centsToDecimal(123_456_789)).toBe('1234567.89');
    expect(centsToDecimal(0)).toBe('0.00');
  });

  it('un importe negativo lleva el signo delante: -999.00, no (999.00)', () => {
    expect(centsToDecimal(-99_900)).toBe('-999.00');
    expect(centsToDecimal(-5)).toBe('-0.05');
  });
});

describe('csvText — celdas de texto', () => {
  it('un texto normal pasa tal cual', () => {
    expect(csvText('Básico')).toBe('Básico');
  });

  it('entrecomilla si trae coma, comillas o saltos de línea, duplicando las comillas', () => {
    expect(csvText('a,b')).toBe('"a,b"');
    expect(csvText('dice "hola"')).toBe('"dice ""hola"""');
    expect(csvText('a\nb')).toBe('"a\nb"');
  });

  it('INYECCIÓN DE FÓRMULAS: un texto que empieza por = + - @ se neutraliza con apóstrofo', () => {
    for (const evil of ['=HYPERLINK("http://x")', '+cmd|calc', '-2+3', '@SUM(A1)', '\t=1+1']) {
      const out = csvText(evil);
      expect(out.replace(/^"/, '').startsWith("'")).toBe(true);
    }
    expect(csvText('=1+1')).toBe("'=1+1");
  });

  it('un texto que solo CONTIENE un signo en medio no se toca', () => {
    expect(csvText('Premium - Early Bird')).toBe('Premium - Early Bird');
  });
});

describe('filas del mes', () => {
  const input = {
    payments: [
      payment(99_900, '2026-10-05T18:00:00Z'),
      payment(179_900, '2026-10-20T18:00:00Z', 'Premium'),
      payment(99_900, '2026-11-01T06:00:00Z'), // 1 de nov en México: NO es de octubre
      payment(99_900, '2026-11-01T05:59:59Z'), // 31 de oct en México: SÍ
    ],
    refunds: [
      { amountCents: 99_900, occurredAt: new Date('2026-10-06T18:00:00Z'), planLabel: 'Básico', method: 'CARD' },
      { amountCents: 99_900, occurredAt: new Date('2026-09-30T18:00:00Z'), planLabel: 'Básico', method: 'CARD' },
    ],
    classes: [
      { retainedCents: 30_000, commissionCents: 7_500, rail: 'COMISION_MERCANTIL' as const, paidAt: new Date('2026-10-07T18:00:00Z') },
      { retainedCents: 30_000, commissionCents: 7_500, rail: 'ASIMILADOS' as const, paidAt: new Date('2026-10-08T18:00:00Z') },
      { retainedCents: 0, commissionCents: 0, rail: 'ASIMILADOS' as const, paidAt: new Date('2026-10-09T18:00:00Z') },
    ],
  };

  it('solo entran las partidas del mes, en hora de México', () => {
    const rows = buildExportRows(OCT, input);
    // 3 cobros + 1 devolución + 2 clases (la de valor 0 no cuenta).
    expect(rows).toHaveLength(6);
    expect(rows.filter((r) => r.kind === 'COBRO')).toHaveLength(3);
    expect(rows.find((r) => r.date === '2026-10-31')?.grossCents).toBe(99_900);
  });

  it('la devolución va en NEGATIVO y con su IVA en negativo', () => {
    const dev = buildExportRows(OCT, input).find((r) => r.kind === 'DEVOLUCION')!;
    expect(dev.grossCents).toBe(-99_900);
    expect(dev.ivaCents).toBe(-13_779);
    expect(dev.baseCents + dev.ivaCents).toBe(dev.grossCents);
  });

  it('el Carril A exporta SOLO la comisión y el Carril B el valor completo', () => {
    const rows = buildExportRows(OCT, input);
    expect(rows.find((r) => r.kind === 'CLASE_CARRIL_A_COMISION')?.grossCents).toBe(7_500);
    expect(rows.find((r) => r.kind === 'CLASE_CARRIL_B')?.grossCents).toBe(30_000);
  });

  it('cada fila cuadra: base + IVA = importe con IVA', () => {
    for (const r of buildExportRows(OCT, input)) expect(r.baseCents + r.ivaCents).toBe(r.grossCents);
  });

  it('el total de las filas es el ingreso propio del mes (lo que dice el tablero)', () => {
    const rows = buildExportRows(OCT, input);
    const sum = rows.reduce((acc, r) => acc + r.grossCents, 0);
    const month = buildMonthlyFiscal(OCT, {
      payments: input.payments.map((p) => ({ amountCents: p.amountCents, paidAt: p.paidAt })),
      refunds: input.refunds.map((r) => ({ amountCents: r.amountCents, occurredAt: r.occurredAt })),
      classes: input.classes,
    });
    expect(sum).toBe(month.ownIncomeGrossCents);
  });

  it('ordena por fecha', () => {
    const dates = buildExportRows(OCT, input).map((r) => r.date);
    expect([...dates].sort()).toEqual(dates);
  });
});

describe('el CSV', () => {
  const rows = buildExportRows(OCT, {
    payments: [payment(99_900, '2026-10-05T18:00:00Z')],
    refunds: [],
    classes: [],
  });
  const total = { grossCents: 99_900, baseCents: 86_121, ivaCents: 13_779 };
  const csv = toCsv(rows, total);

  it('encabezado, una fila y el TOTAL del mes, con CRLF', () => {
    const lines = csv.split('\r\n');
    expect(lines[0]).toBe(CSV_HEADER.join(','));
    expect(lines[1]).toBe('2026-10-05,COBRO,Básico,CARD,999.00,861.21,137.79');
    expect(lines[2]).toContain('TOTAL DEL MES');
    expect(lines[2]).toContain('999.00,861.21,137.79');
    expect(csv.endsWith('\r\n')).toBe(true);
  });

  it('🔒 NO lleva ningún dato personal: ni nombre, ni correo, ni identificador de cuenta', () => {
    expect([...CSV_HEADER]).toEqual(['fecha', 'tipo', 'concepto', 'metodo', 'importe_con_iva', 'base_sin_iva', 'iva']);
    for (const banned of ['nombre', 'correo', 'email', 'usuario', 'cuenta', 'userProfileId', 'curp', 'rfc']) {
      expect(CSV_HEADER.join(',').toLowerCase()).not.toContain(banned.toLowerCase());
    }
    expect(csv).not.toMatch(/@/);
  });

  it('un mes vacío exporta solo el encabezado y el total en cero', () => {
    const empty = toCsv([], { grossCents: 0, baseCents: 0, ivaCents: 0 });
    expect(empty.split('\r\n').filter(Boolean)).toHaveLength(2);
    expect(empty).toContain('0.00,0.00,0.00');
  });
});
