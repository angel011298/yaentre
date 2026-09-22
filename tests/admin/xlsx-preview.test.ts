/**
 * @vitest-environment node
 *
 * El entorno por defecto de este repo es jsdom. `exceljs` descomprime un zip y
 * en jsdom acaba en un camino pensado para el navegador que falla al cargar un
 * libro VÁLIDO — mientras que los archivos corruptos «pasaban», porque
 * fallaban igual. Un verde/rojo que no distingue el caso bueno del malo no
 * mide nada. En producción esto corre en Node (Vercel), así que el entorno de
 * la prueba tiene que ser el mismo.
 */
import { describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import { readXlsxPreview } from '@/lib/admin/xlsx-preview';
import { cellToText, previewKindFor, XLSX_MAX_ROWS, XLSX_MAX_SHEETS } from '@/lib/admin/vault';

/**
 * G99 parte B — previsualización de .xlsx.
 *
 * Los archivos de ejemplo se GENERAN en la propia prueba: nada de binarios
 * versionados que nadie sabe qué contienen ni cómo regenerar.
 *
 * Lo que de verdad se comprueba:
 *   · un libro normal se lee;
 *   · uno con FÓRMULAS muestra el resultado cacheado y NUNCA evalúa nada;
 *   · uno CORRUPTO devuelve un veredicto legible en vez de tumbar la página;
 *   · los topes de filas/columnas/hojas se respetan.
 */

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

async function makeWorkbook(
  build: (wb: ExcelJS.Workbook) => void
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  build(wb);
  return Buffer.from(await wb.xlsx.writeBuffer());
}

describe('el botón Ver deja de estar deshabilitado para xlsx', () => {
  it('xlsx es previsualizable', () => {
    expect(previewKindFor(XLSX_MIME)).toBe('spreadsheet');
  });

  it('docx y pptx siguen siendo solo descarga', () => {
    expect(
      previewKindFor('application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    ).toBe('none');
    expect(
      previewKindFor('application/vnd.openxmlformats-officedocument.presentationml.presentation')
    ).toBe('none');
  });
});

describe('libro normal', () => {
  it('lee encabezados y datos de la primera hoja', async () => {
    const bytes = await makeWorkbook((wb) => {
      const ws = wb.addWorksheet('Ventas');
      ws.addRow(['Producto', 'Cantidad', 'Precio']);
      ws.addRow(['Pase', 2, 499]);
      ws.addRow(['Premium', 1, 899]);
    });

    const preview = await readXlsxPreview(bytes);

    expect(preview.ok).toBe(true);
    expect(preview.totalSheets).toBe(1);
    expect(preview.sheets[0].name).toBe('Ventas');
    expect(preview.sheets[0].rows[0]).toEqual(['Producto', 'Cantidad', 'Precio']);
    expect(preview.sheets[0].rows[1]).toEqual(['Pase', '2', '499']);
  });

  it('respeta el tope de hojas', async () => {
    const bytes = await makeWorkbook((wb) => {
      for (let i = 1; i <= XLSX_MAX_SHEETS + 2; i += 1) {
        wb.addWorksheet(`Hoja${i}`).addRow(['x']);
      }
    });

    const preview = await readXlsxPreview(bytes);

    expect(preview.totalSheets).toBe(XLSX_MAX_SHEETS + 2);
    expect(preview.sheets).toHaveLength(XLSX_MAX_SHEETS);
  });

  it('respeta el tope de filas y lo señala', async () => {
    const bytes = await makeWorkbook((wb) => {
      const ws = wb.addWorksheet('Larga');
      for (let i = 0; i < XLSX_MAX_ROWS + 50; i += 1) ws.addRow([i]);
    });

    const preview = await readXlsxPreview(bytes);

    expect(preview.sheets[0].rows).toHaveLength(XLSX_MAX_ROWS);
    expect(preview.sheets[0].truncatedRows).toBe(true);
  });
});

describe('fórmulas: se muestra el resultado, NUNCA se evalúa', () => {
  it('una fórmula con resultado cacheado muestra el resultado', async () => {
    const bytes = await makeWorkbook((wb) => {
      const ws = wb.addWorksheet('Calc');
      ws.addRow([2, 3]);
      ws.getCell('C1').value = { formula: 'A1+B1', result: 5 } as ExcelJS.CellFormulaValue;
    });

    const preview = await readXlsxPreview(bytes);

    expect(preview.ok).toBe(true);
    expect(preview.sheets[0].rows[0]).toEqual(['2', '3', '5']);
  });

  it('una fórmula SIN resultado se muestra como texto, no se calcula', async () => {
    const bytes = await makeWorkbook((wb) => {
      const ws = wb.addWorksheet('Calc');
      ws.addRow([2, 3]);
      ws.getCell('C1').value = { formula: 'A1+B1' } as ExcelJS.CellFormulaValue;
    });

    const preview = await readXlsxPreview(bytes);
    const c1 = preview.sheets[0].rows[0][2];

    // Se muestra la fórmula literal. Si aquí apareciera '5', significaría que
    // algo la EVALUÓ — ejecutar entrada no confiable en el servidor.
    expect(c1).toBe('=A1+B1');
    expect(c1).not.toBe('5');
  });

  it('cellToText nunca ejecuta: una fórmula peligrosa sale como texto', () => {
    expect(cellToText({ formula: 'HYPERLINK("http://malo","clic")' })).toBe(
      '=HYPERLINK("http://malo","clic")'
    );
  });

  it('una celda con error de Excel se muestra tal cual', () => {
    expect(cellToText({ error: '#DIV/0!' })).toBe('#DIV/0!');
  });

  it('el texto enriquecido se aplana a texto plano', () => {
    expect(cellToText({ richText: [{ text: 'ho' }, { text: 'la' }] })).toBe('hola');
  });
});

describe('archivo corrupto: veredicto legible, nunca una excepción', () => {
  it('bytes que no son un zip', async () => {
    const preview = await readXlsxPreview(Buffer.from('esto no es un xlsx en absoluto'));

    expect(preview.ok).toBe(false);
    expect(preview.sheets).toEqual([]);
    expect(preview.error).toBeTruthy();
  });

  it('un xlsx válido al que se le truncan los bytes', async () => {
    const bytes = await makeWorkbook((wb) => {
      wb.addWorksheet('Hoja').addRow(['dato']);
    });
    const truncado = bytes.subarray(0, Math.floor(bytes.length / 2));

    const preview = await readXlsxPreview(truncado);

    expect(preview.ok).toBe(false);
    expect(preview.error).toBeTruthy();
  });

  it('un archivo vacío', async () => {
    const preview = await readXlsxPreview(Buffer.alloc(0));
    expect(preview.ok).toBe(false);
  });
});
