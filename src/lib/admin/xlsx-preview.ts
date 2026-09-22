import 'server-only';
import ExcelJS from 'exceljs';
import {
  cellToText,
  XLSX_MAX_COLS,
  XLSX_MAX_ROWS,
  XLSX_MAX_SHEETS,
  type SheetPreview,
  type XlsxPreview,
} from './vault';

/**
 * G99 parte B — lee un .xlsx y devuelve las primeras hojas como datos planos.
 *
 * Se renderiza EN EL SERVIDOR sobre la misma ruta `no-store`: el archivo nunca
 * llega al navegador para la previsualización, solo la tabla ya resuelta.
 *
 * ── Por qué `exceljs` y NO el paquete `xlsx` de npm ────────────────────────
 *
 * SheetJS dejó de publicar en npm: la versión que sigue ahí arrastra
 * CVE-2023-30533 (prototype pollution) marcada como «no fix available», así
 * que `pnpm security:deps` (--audit-level=high) se pondría rojo de forma
 * permanente y sin remedio posible. `exceljs` está mantenido y no tiene
 * avisos de severidad alta.
 *
 * 🔒 Nunca se evalúan fórmulas. Ver `cellToText`.
 */
export async function readXlsxPreview(bytes: Buffer): Promise<XlsxPreview> {
  const workbook = new ExcelJS.Workbook();

  try {
    // Se pasa el Buffer tal cual: es la entrada documentada de exceljs, y
    // rebanar `bytes.buffer` a mano invita a pasarle memoria ajena del pool.
    //
    // El `as never` es por un choque de TIPOS, no de valores: exceljs declara
    // su propio `interface Buffer extends ArrayBuffer {}` en su index.d.ts
    // (línea 1), que no es el `Buffer` de @types/node. En tiempo de ejecución
    // recibe exactamente lo que espera —comprobado por efecto en
    // tests/admin/xlsx-preview.test.ts, que genera libros reales con la misma
    // librería y los vuelve a leer.
    await workbook.xlsx.load(bytes as never);
  } catch (err) {
    // Un archivo corrupto o que no es un .xlsx NO puede tumbar la pantalla:
    // devuelve un veredicto legible y el administrador sigue pudiendo
    // descargarlo.
    return {
      ok: false,
      sheets: [],
      totalSheets: 0,
      error:
        err instanceof Error && /zip|corrupt|end of central directory/i.test(err.message)
          ? 'El archivo no se pudo abrir: parece dañado o no es un .xlsx válido.'
          : 'El archivo no se pudo leer como hoja de cálculo.',
    };
  }

  const all = workbook.worksheets;
  const sheets: SheetPreview[] = [];

  for (const ws of all.slice(0, XLSX_MAX_SHEETS)) {
    const rows: string[][] = [];
    let truncatedCols = false;

    // `rowCount` puede ser enorme; se corta en el tope y se avisa.
    const lastRow = Math.min(ws.rowCount, XLSX_MAX_ROWS);
    for (let r = 1; r <= lastRow; r += 1) {
      const row = ws.getRow(r);
      const cells: string[] = [];
      const lastCol = Math.min(ws.columnCount, XLSX_MAX_COLS);
      if (ws.columnCount > XLSX_MAX_COLS) truncatedCols = true;
      for (let c = 1; c <= lastCol; c += 1) {
        cells.push(cellToText(row.getCell(c).value));
      }
      rows.push(cells);
    }

    sheets.push({
      name: ws.name,
      rows,
      truncatedRows: ws.rowCount > XLSX_MAX_ROWS,
      truncatedCols,
    });
  }

  return { ok: true, sheets, totalSheets: all.length };
}
