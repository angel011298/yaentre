/**
 * G99 — reglas PURAS de la bóveda de archivos. Sin E/S, para que la lista
 * blanca y el tope de tamaño se puedan enumerar en pruebas sin tocar Storage.
 */

/**
 * Nombre del bucket. Vive AQUÍ y no en `app/actions/admin-vault.ts` porque un
 * archivo `'use server'` solo puede exportar funciones asíncronas: exportar
 * una constante desde ahí rompe el build de Turbopack.
 */
export const VAULT_BUCKET = 'admin-vault';

/**
 * Lista blanca por TIPO DECLARADO, con la extensión que le corresponde.
 *
 * 🔒 La extensión del archivo guardado se deriva SIEMPRE de esta tabla, nunca
 * del nombre que mandó el cliente. Confiar en el nombre permite subir
 * `informe.pdf.html` o `nota.txt` con contenido HTML y que el navegador lo
 * ejecute al verlo. Mismo criterio que `uploadAvatarAction` (G65).
 */
export const VAULT_TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'text/csv': 'csv',
  'text/plain': 'txt',
  'text/markdown': 'md',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
};

/**
 * Tope por archivo: 40 MB.
 *
 * El motivo, escrito para que nadie lo suba «porque sí»: el plan GRATUITO de
 * Supabase corta en **50 MB por archivo** y **1 GB en total**. 40 MB deja
 * margen bajo el corte duro del proveedor —un archivo rechazado por Supabase
 * a mitad de subida da un error mucho peor de diagnosticar que uno rechazado
 * por nosotros con un mensaje claro— y evita que dos archivos grandes se
 * coman el 8 % de la cuota total de un golpe.
 */
export const MAX_VAULT_BYTES = 40 * 1024 * 1024;

/** Cuota total del plan gratuito, para pintar «X de 1 GB» en el panel. */
export const VAULT_QUOTA_BYTES = 1024 * 1024 * 1024;

/** Tipos que el panel sabe MOSTRAR dentro del navegador (los demás: descarga). */
export type VaultPreview = 'pdf' | 'image' | 'csv' | 'text' | 'spreadsheet' | 'none';

export function previewKindFor(mimeType: string): VaultPreview {
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType === 'image/png' || mimeType === 'image/jpeg' || mimeType === 'image/webp') {
    return 'image';
  }
  if (mimeType === 'text/csv') return 'csv';
  if (mimeType === 'text/plain' || mimeType === 'text/markdown') return 'text';
  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ) {
    return 'spreadsheet';
  }
  return 'none';
}

export type VaultValidation =
  | { ok: true; ext: string }
  | { ok: false; message: string };

/**
 * Valida tipo y tamaño. Pura y total: el mismo veredicto en la Server Action y
 * en las pruebas.
 */
export function validateVaultUpload(input: {
  mimeType: string;
  sizeBytes: number;
}): VaultValidation {
  const ext = VAULT_TYPES[input.mimeType];
  if (!ext) {
    return {
      ok: false,
      message:
        'Tipo de archivo no permitido. Se aceptan PDF, PNG, JPG, WebP, CSV, TXT, Markdown, XLSX, DOCX y PPTX.',
    };
  }
  if (input.sizeBytes <= 0) {
    return { ok: false, message: 'El archivo está vacío.' };
  }
  if (input.sizeBytes > MAX_VAULT_BYTES) {
    return { ok: false, message: 'El archivo supera el máximo de 40 MB.' };
  }
  return { ok: true, ext };
}

/** Bytes → texto legible, para el panel. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/**
 * Cabeceras de la respuesta que sirve un archivo.
 *
 * `no-store` + `no-cache` + `must-revalidate` + `private`: el contenido de la
 * bóveda no puede quedar en la caché del navegador, ni en una caché
 * intermedia, ni en el disco de un CDN. `Pragma` es el equivalente HTTP/1.0
 * para proxies viejos. `X-Content-Type-Options: nosniff` impide que el
 * navegador adivine un tipo distinto del declarado —que es lo que convertiría
 * un `.txt` con HTML dentro en una página ejecutable— y `Referrer-Policy`
 * evita filtrar la URL del archivo al navegar fuera.
 */
export function vaultResponseHeaders(input: {
  mimeType: string;
  originalName: string;
  download: boolean;
}): Record<string, string> {
  return {
    'Content-Type': input.mimeType,
    'Content-Disposition': `${input.download ? 'attachment' : 'inline'}; filename="${sanitizeFilename(
      input.originalName
    )}"`,
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    Pragma: 'no-cache',
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
  };
}

/**
 * El nombre original viaja en `Content-Disposition`, así que hay que sacarle
 * las comillas, los saltos de línea y los caracteres de control: sin esto, un
 * nombre con `"` o `\r\n` permite inyectar cabeceras en la respuesta.
 */
export function sanitizeFilename(name: string): string {
  const cleaned = name
    .replace(/[\u0000-\u001f\u007f"\\]/g, '')
    .replace(/[\r\n]/g, '')
    .trim();
  return cleaned.slice(0, 180) || 'archivo';
}

/**
 * Parser de CSV mínimo pero correcto con comillas dobles y comas dentro de
 * campo. Sin dependencia nueva: no hace falta una librería para mostrar una
 * tabla de solo lectura. Puro, para poder enumerarlo en pruebas.
 */
const LF = String.fromCharCode(10);
const CR = String.fromCharCode(13);

export function parseCsv(text: string, maxRows: number, maxCols: number): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else inQuotes = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') inQuotes = true;
    else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === LF || ch === CR) {
      if (ch === CR && text[i + 1] === LF) i += 1;
      row.push(field);
      field = '';
      rows.push(row.slice(0, maxCols));
      row = [];
      if (rows.length >= maxRows) return rows;
    } else field += ch;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row.slice(0, maxCols));
  }
  return rows;
}

// ═══════════════════════════════════════════════════════════════════════════
// G99 parte B — PREVISUALIZACIÓN DE HOJAS DE CÁLCULO
// ═══════════════════════════════════════════════════════════════════════════

/** Topes de la previsualización, para no reventar la respuesta con un libro
 *  de cien mil filas. */
export const XLSX_MAX_SHEETS = 3;
export const XLSX_MAX_ROWS = 200;
export const XLSX_MAX_COLS = 30;

export interface SheetPreview {
  name: string;
  rows: string[][];
  truncatedRows: boolean;
  truncatedCols: boolean;
}

export interface XlsxPreview {
  ok: boolean;
  sheets: SheetPreview[];
  /** Mensaje para el administrador cuando el archivo no se pudo leer. */
  error?: string;
  totalSheets: number;
}

/**
 * Convierte el valor de una celda de ExcelJS a TEXTO.
 *
 * 🔒 REGLA: las fórmulas NO se evalúan. Si la celda es una fórmula, se muestra
 * su RESULTADO ya calculado y guardado en el archivo (`result`), y si no lo
 * tiene, la fórmula como texto plano, nunca ejecutada. Evaluar fórmulas de un
 * archivo subido dentro del servidor sería ejecutar código de entrada no
 * confiable; y el resultado, sea cual sea, se pinta como texto de React, que
 * escapa por construcción.
 */
export function cellToText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value instanceof Date) return value.toISOString().slice(0, 19).replace('T', ' ');

  const v = value as Record<string, unknown>;

  // Celda de fórmula: se prefiere el resultado CACHEADO del archivo.
  if ('formula' in v || 'sharedFormula' in v) {
    if (v.result !== undefined && v.result !== null) return cellToText(v.result);
    const f = (v.formula ?? v.sharedFormula) as string;
    return `=${f}`;
  }
  // Error de Excel (#DIV/0!, #REF!, …)
  if ('error' in v) return String(v.error);
  // Texto enriquecido
  if ('richText' in v && Array.isArray(v.richText)) {
    return (v.richText as Array<{ text?: string }>).map((r) => r.text ?? '').join('');
  }
  // Hipervínculo
  if ('text' in v) return String(v.text ?? '');
  if ('hyperlink' in v) return String(v.hyperlink ?? '');

  return '';
}
