import { describe, expect, it } from 'vitest';
import {
  CSF_MAX_BYTES,
  buildCsfPath,
  csfPathBelongsTo,
  validateCsfFile,
} from '@/lib/teachers/csf';

const PDF_HEAD = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]); // %PDF-1.7
const HTML_HEAD = new TextEncoder().encode('<html><body>');
const UID = '11111111-1111-4111-8111-111111111111';
const OTHER_UID = '99999999-9999-4999-8999-999999999999';
const FILE_UUID = '22222222-2222-4222-8222-222222222222';

describe('validateCsfFile — por CONTENIDO, no por lo que declara el navegador', () => {
  const ok = { sizeBytes: 40_000, declaredType: 'application/pdf', head: PDF_HEAD };

  it('acepta un PDF real de tamaño razonable', () => {
    expect(validateCsfFile(ok)).toEqual({ ok: true });
  });

  it('el borde de 5 MB es inclusivo', () => {
    expect(validateCsfFile({ ...ok, sizeBytes: CSF_MAX_BYTES })).toEqual({ ok: true });
    expect(validateCsfFile({ ...ok, sizeBytes: CSF_MAX_BYTES + 1 })).toEqual({ ok: false, reason: 'TOO_LARGE' });
  });

  it('rechaza archivos vacíos o con tamaño inválido', () => {
    expect(validateCsfFile({ ...ok, sizeBytes: 0 })).toEqual({ ok: false, reason: 'EMPTY' });
    expect(validateCsfFile({ ...ok, sizeBytes: -5 })).toEqual({ ok: false, reason: 'EMPTY' });
    expect(validateCsfFile({ ...ok, sizeBytes: Number.NaN })).toEqual({ ok: false, reason: 'EMPTY' });
  });

  it('un HTML renombrado a .pdf y declarado como PDF se rechaza por su firma', () => {
    expect(validateCsfFile({ ...ok, head: HTML_HEAD })).toEqual({ ok: false, reason: 'NOT_PDF' });
  });

  it('un tipo declarado distinto se rechaza aunque el contenido sea un PDF', () => {
    expect(validateCsfFile({ ...ok, declaredType: 'text/html' })).toEqual({ ok: false, reason: 'NOT_PDF' });
    expect(validateCsfFile({ ...ok, declaredType: 'image/png' })).toEqual({ ok: false, reason: 'NOT_PDF' });
  });

  it('una cabecera más corta que la firma se rechaza sin lanzar', () => {
    expect(validateCsfFile({ ...ok, head: new Uint8Array([0x25, 0x50]) })).toEqual({ ok: false, reason: 'NOT_PDF' });
    expect(validateCsfFile({ ...ok, head: new Uint8Array() })).toEqual({ ok: false, reason: 'NOT_PDF' });
  });
});

describe('ruta del objeto', () => {
  it('se arma como <uid>/<uuid>.pdf, sin nada del nombre del cliente', () => {
    expect(buildCsfPath(UID, FILE_UUID)).toBe(`${UID}/${FILE_UUID}.pdf`);
  });

  it('una ruta pertenece a su dueño y a nadie más', () => {
    const mine = buildCsfPath(UID, FILE_UUID);
    expect(csfPathBelongsTo(mine, UID)).toBe(true);
    expect(csfPathBelongsTo(mine, OTHER_UID)).toBe(false);
  });

  it('rechaza rutas con forma inválida aunque empiecen con el UID (traversal, extensiones, esquemas)', () => {
    for (const bad of [
      `${UID}/../${OTHER_UID}/${FILE_UUID}.pdf`,
      `${UID}/${FILE_UUID}.html`,
      `${UID}/${FILE_UUID}.pdf.exe`,
      `${UID}/nombre-del-cliente.pdf`,
      `${UID}`,
      `https://evil.test/${UID}/${FILE_UUID}.pdf`,
    ]) {
      expect(csfPathBelongsTo(bad, UID)).toBe(false);
    }
  });

  it('un UID que es PREFIJO de otro no se confunde con él', () => {
    // «11111111-…» no debe reclamar la carpeta de un UID que solo empiece igual.
    const longer = `${UID.slice(0, 35)}9/${FILE_UUID}.pdf`;
    expect(csfPathBelongsTo(longer, UID)).toBe(false);
  });
});
