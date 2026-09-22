import { describe, expect, it } from 'vitest';
import {
  formatBytes,
  MAX_VAULT_BYTES,
  previewKindFor,
  sanitizeFilename,
  validateVaultUpload,
  VAULT_TYPES,
  vaultResponseHeaders,
  parseCsv,
} from '@/lib/admin/vault';

/**
 * G99 — reglas puras de la bóveda, enumeradas.
 *
 * La pieza que más importa: **la extensión sale del TIPO, no del nombre**.
 * Confiar en el nombre deja subir `informe.pdf.html` y que el navegador lo
 * ejecute al «verlo» — dentro de la sesión más privilegiada del producto.
 */

describe('lista blanca de tipos', () => {
  it('acepta exactamente los 10 tipos acordados', () => {
    expect(Object.keys(VAULT_TYPES).sort()).toEqual(
      [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/png',
        'image/webp',
        'text/csv',
        'text/markdown',
        'text/plain',
      ].sort()
    );
  });

  for (const [mime, ext] of Object.entries(VAULT_TYPES)) {
    it(`${mime} → .${ext}`, () => {
      const v = validateVaultUpload({ mimeType: mime, sizeBytes: 1024 });
      expect(v).toEqual({ ok: true, ext });
    });
  }

  for (const mime of ['text/html', 'application/x-msdownload', 'image/svg+xml', '', 'application/zip']) {
    it(`rechaza ${mime || '(vacío)'}`, () => {
      const v = validateVaultUpload({ mimeType: mime, sizeBytes: 1024 });
      expect(v.ok).toBe(false);
    });
  }
});

describe('tope de tamaño y archivo vacío', () => {
  it('rechaza 0 bytes', () => {
    const v = validateVaultUpload({ mimeType: 'application/pdf', sizeBytes: 0 });
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.message).toMatch(/vac/i);
  });

  it('acepta justo en el tope (40 MB)', () => {
    expect(validateVaultUpload({ mimeType: 'application/pdf', sizeBytes: MAX_VAULT_BYTES }).ok).toBe(
      true
    );
  });

  it('rechaza un byte por encima del tope', () => {
    const v = validateVaultUpload({ mimeType: 'application/pdf', sizeBytes: MAX_VAULT_BYTES + 1 });
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.message).toMatch(/40 MB/);
  });

  it('el tope es el del plan gratuito de Supabase con margen (40 < 50 MB)', () => {
    expect(MAX_VAULT_BYTES).toBe(40 * 1024 * 1024);
    expect(MAX_VAULT_BYTES).toBeLessThan(50 * 1024 * 1024);
  });
});

describe('la extensión se deriva del TIPO, nunca del nombre enviado', () => {
  it('un .html disfrazado de pdf en el nombre se guarda como .pdf', () => {
    // El cliente manda `informe.pdf.html` declarando `application/pdf`.
    // Lo que decide la extensión es el tipo declarado, y el servidor sirve
    // ESE Content-Type con `nosniff`.
    const v = validateVaultUpload({ mimeType: 'application/pdf', sizeBytes: 10 });
    expect(v.ok && v.ext).toBe('pdf');
  });

  it('un nombre .pdf con tipo text/html se RECHAZA, no se guarda como pdf', () => {
    expect(validateVaultUpload({ mimeType: 'text/html', sizeBytes: 10 }).ok).toBe(false);
  });
});

describe('sanitizeFilename — Content-Disposition no se puede inyectar', () => {
  it('quita comillas', () => {
    expect(sanitizeFilename('a"b.pdf')).toBe('ab.pdf');
  });
  it('quita saltos de línea (inyección de cabeceras)', () => {
    expect(sanitizeFilename('a.pdf\r\nX-Evil: 1')).toBe('a.pdfX-Evil: 1');
  });
  it('quita caracteres de control', () => {
    // Los caracteres de control se construyen, no se escriben literales:
    // un NUL crudo dentro de un archivo fuente sobrevive mal a copias,
    // formateadores y diffs.
    const conControles = 'a' + String.fromCharCode(0) + String.fromCharCode(31) + 'b.pdf';
    expect(sanitizeFilename(conControles)).toBe('ab.pdf');
  });
  it('nunca devuelve vacío', () => {
    expect(sanitizeFilename('   ')).toBe('archivo');
  });
});

describe('cabeceras de la respuesta', () => {
  const base = { mimeType: 'application/pdf', originalName: 'plan.pdf' };

  it('inline por defecto, con no-store completo', () => {
    const h = vaultResponseHeaders({ ...base, download: false });
    expect(h['Content-Disposition']).toBe('inline; filename="plan.pdf"');
    expect(h['Cache-Control']).toBe('no-store, no-cache, must-revalidate, private');
    expect(h.Pragma).toBe('no-cache');
    expect(h['Referrer-Policy']).toBe('no-referrer');
    expect(h['X-Content-Type-Options']).toBe('nosniff');
  });

  it('attachment con ?download=1', () => {
    const h = vaultResponseHeaders({ ...base, download: true });
    expect(h['Content-Disposition']).toBe('attachment; filename="plan.pdf"');
    // Las cabeceras de caché NO cambian entre ver y descargar.
    expect(h['Cache-Control']).toBe('no-store, no-cache, must-revalidate, private');
  });
});

describe('qué se puede ver dentro del navegador', () => {
  it('pdf, imágenes, csv y texto sí', () => {
    expect(previewKindFor('application/pdf')).toBe('pdf');
    expect(previewKindFor('image/png')).toBe('image');
    expect(previewKindFor('image/jpeg')).toBe('image');
    expect(previewKindFor('image/webp')).toBe('image');
    expect(previewKindFor('text/csv')).toBe('csv');
    expect(previewKindFor('text/plain')).toBe('text');
    expect(previewKindFor('text/markdown')).toBe('text');
  });

  it('docx y pptx quedan solo como descarga en este corte', () => {
    expect(
      previewKindFor(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      )
    ).toBe('none');
    expect(
      previewKindFor(
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      )
    ).toBe('none');
  });
});

describe('parseCsv', () => {
  it('separa filas y columnas', () => {
    expect(parseCsv('a,b\n1,2', 10, 10)).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('respeta comas dentro de comillas', () => {
    expect(parseCsv('a,"b,c"\n1,2', 10, 10)).toEqual([
      ['a', 'b,c'],
      ['1', '2'],
    ]);
  });

  it('entiende la comilla escapada ("")', () => {
    expect(parseCsv('a,"di ""hola"""', 10, 10)).toEqual([['a', 'di "hola"']]);
  });

  it('acepta CRLF', () => {
    expect(parseCsv('a,b\r\n1,2', 10, 10)).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('corta en el tope de filas', () => {
    const csv = Array.from({ length: 50 }, (_, i) => `${i},x`).join('\n');
    expect(parseCsv(csv, 5, 10)).toHaveLength(5);
  });

  it('corta en el tope de columnas', () => {
    expect(parseCsv('a,b,c,d,e', 10, 3)).toEqual([['a', 'b', 'c']]);
  });
});

describe('formatBytes', () => {
  it('escala correctamente', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2.0 KB');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB');
    expect(formatBytes(1024 * 1024 * 1024)).toBe('1.00 GB');
  });
});
