import { describe, expect, it } from 'vitest';
import {
  clabeCheckDigit,
  containsContactInfo,
  curpCheckDigit,
  maskClabe,
  normalizeMxPhone,
  validateClabe,
  validateCurp,
  validateRfc,
} from '@/lib/teachers/identity';

const NOW = new Date('2026-10-10T12:00:00Z');

/** Arma una CURP válida a partir de sus primeros 17 caracteres. */
const mkCurp = (first17: string) => `${first17}${curpCheckDigit(first17)}`;

describe('CURP — dígito verificador anclado en la referencia OFICIAL', () => {
  it('la CURP de ejemplo de RENAPO (HEGG560427MVZRRL04) valida: ancla del algoritmo', () => {
    // Esta es la referencia EXTERNA. Si el algoritmo estuviera mal, no daría 4.
    expect(curpCheckDigit('HEGG560427MVZRRL0')).toBe(4);
    const r = validateCurp('HEGG560427MVZRRL04', NOW);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.birthDate.toISOString().slice(0, 10)).toBe('1956-04-27');
  });

  it('acepta minúsculas y espacios, como la escribe la gente', () => {
    expect(validateCurp(' hegg560427 mvzrrl04 ', NOW).ok).toBe(true);
  });

  it('un solo carácter cambiado rompe el dígito verificador', () => {
    expect(validateCurp('HEGG560428MVZRRL04', NOW)).toEqual({ ok: false, reason: 'CHECK_DIGIT' });
    expect(validateCurp('HEGG560427MVZRRL05', NOW)).toEqual({ ok: false, reason: 'CHECK_DIGIT' });
  });

  it('rechaza formato inválido, longitud incorrecta y estado inexistente', () => {
    expect(validateCurp('', NOW)).toEqual({ ok: false, reason: 'FORMAT' });
    expect(validateCurp('HEGG560427MVZRRL0', NOW)).toEqual({ ok: false, reason: 'FORMAT' });
    expect(validateCurp(mkCurp('HEGG560427MXXRRL0'), NOW)).toEqual({ ok: false, reason: 'FORMAT' });
  });

  it('rechaza una fecha de nacimiento que no existe (31 de febrero)', () => {
    expect(validateCurp(mkCurp('HEGG560231MVZRRL0'), NOW)).toEqual({ ok: false, reason: 'DATE' });
  });

  it('el siglo sale del penúltimo carácter: letra ⇒ 2000s, dígito ⇒ 1900s', () => {
    const adulta2000s = validateCurp(mkCurp('HEGG050615MVZRRLA'), NOW); // 2005 → 21 años
    expect(adulta2000s.ok).toBe(true);
    if (adulta2000s.ok) expect(adulta2000s.birthDate.getUTCFullYear()).toBe(2005);
    const del1900s = validateCurp(mkCurp('HEGG050615MVZRRL0'), NOW); // 1905 → 121 años, pero forma válida
    expect(del1900s.ok).toBe(true);
    if (del1900s.ok) expect(del1900s.birthDate.getUTCFullYear()).toBe(1905);
  });

  it('un MENOR de 18 se rechaza aunque la CURP sea válida (la CURP es la fuente de la edad)', () => {
    expect(validateCurp(mkCurp('HEGG120427MVZRRLA'), NOW)).toEqual({ ok: false, reason: 'UNDERAGE' }); // 2012
    // Justo 18 años hoy: sí; un día antes de cumplirlos: no.
    expect(validateCurp(mkCurp('HEGG081010MVZRRLA'), NOW).ok).toBe(true);
    expect(validateCurp(mkCurp('HEGG081011MVZRRLA'), NOW)).toEqual({ ok: false, reason: 'UNDERAGE' });
  });
});

describe('CLABE', () => {
  it('la CLABE de referencia 002010077777777771 valida y expone el banco (002)', () => {
    expect(clabeCheckDigit('00201007777777777')).toBe(1);
    expect(validateCLABE('002010077777777771')).toEqual({ ok: true, clabe: '002010077777777771', bankCode: '002' });
  });

  it('acepta espacios y guiones al capturar', () => {
    expect(validateClabe('002 010 07777777777 1').ok).toBe(true);
    expect(validateClabe('002-010-07777777777-1').ok).toBe(true);
  });

  it('rechaza longitud incorrecta, letras y dígito verificador equivocado', () => {
    expect(validateClabe('00201007777777777')).toEqual({ ok: false, reason: 'FORMAT' });
    expect(validateClabe('0020100777777777712')).toEqual({ ok: false, reason: 'FORMAT' });
    expect(validateClabe('00201007777777777A')).toEqual({ ok: false, reason: 'FORMAT' });
    expect(validateClabe('002010077777777772')).toEqual({ ok: false, reason: 'CHECK_DIGIT' });
  });

  it('el dígito verificador detecta CUALQUIER error de un solo dígito en las 17 posiciones', () => {
    const good = '002010077777777771';
    for (let i = 0; i < 17; i++) {
      for (const d of '0123456789') {
        if (d === good[i]) continue;
        const mutated = good.slice(0, i) + d + good.slice(i + 1);
        expect(validateClabe(mutated).ok).toBe(false);
      }
    }
  });

  it('maskClabe muestra solo los últimos 4', () => {
    expect(maskClabe('002010077777777771')).toBe('****7771');
    expect(maskClabe('123')).toBe('****');
  });
});

// Alias para legibilidad del caso de arriba.
const validateCLABE = validateClabe;

describe('RFC de persona física', () => {
  it('acepta 13 caracteres con fecha válida, con o sin minúsculas y espacios', () => {
    expect(validateRfc('HEGG560427AB1')).toEqual({ ok: true, rfc: 'HEGG560427AB1' });
    expect(validateRfc(' hegg560427ab1 ')).toEqual({ ok: true, rfc: 'HEGG560427AB1' });
    expect(validateRfc('ÑAGG560427AB1').ok).toBe(true);
  });

  it('rechaza persona moral (12), fecha imposible y longitud incorrecta', () => {
    expect(validateRfc('HEG560427AB1')).toEqual({ ok: false, reason: 'FORMAT' });
    expect(validateRfc('HEGG561327AB1')).toEqual({ ok: false, reason: 'FORMAT' });
    expect(validateRfc('HEGG560427AB')).toEqual({ ok: false, reason: 'FORMAT' });
    expect(validateRfc('')).toEqual({ ok: false, reason: 'FORMAT' });
  });

  it('rechaza los RFC genéricos del SAT', () => {
    expect(validateRfc('XAXX010101000')).toEqual({ ok: false, reason: 'GENERIC' });
    expect(validateRfc('xexx010101000')).toEqual({ ok: false, reason: 'GENERIC' });
  });
});

describe('teléfono mexicano', () => {
  it('normaliza a 10 dígitos con o sin +52, espacios y guiones', () => {
    expect(normalizeMxPhone('55 1234 5678')).toBe('5512345678');
    expect(normalizeMxPhone('+52 (55) 1234-5678')).toBe('5512345678');
    expect(normalizeMxPhone('525512345678')).toBe('5512345678');
  });
  it('rechaza lo que no es un número mexicano plausible', () => {
    expect(normalizeMxPhone('12345')).toBeNull();
    expect(normalizeMxPhone('0512345678')).toBeNull();
    expect(normalizeMxPhone('1512345678')).toBeNull();
    expect(normalizeMxPhone('abc')).toBeNull();
  });
});

describe('datos de contacto en texto público (evita saltarse la plataforma)', () => {
  it.each([
    ['un correo', 'escríbeme a juan@correo.com'],
    ['un teléfono seguido', 'llámame al 5512345678'],
    ['un teléfono con separadores', 'mi cel 55-1234-5678'],
    ['WhatsApp', 'mándame whatsapp'],
    ['un enlace', 'mira https://miweb.com'],
    ['un @usuario', 'sígueme en @juanprofe'],
    ['Telegram', 'estoy en Telegram'],
  ])('detecta %s', (_n, text) => {
    expect(containsContactInfo(text)).toBe(true);
  });

  it.each([
    'Ingeniero con 8 años de experiencia dando clases de matemáticas.',
    'Me apasiona explicar álgebra paso a paso.',
    'Egresado de la UNAM, promedio 9.5, asesor desde 2018.',
  ])('deja pasar una presentación normal: %s', (text) => {
    expect(containsContactInfo(text)).toBe(false);
  });
});
