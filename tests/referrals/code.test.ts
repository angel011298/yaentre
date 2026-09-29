import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  REFERRAL_CODE_ALPHABET,
  REFERRAL_CODE_LENGTH,
  REFERRAL_COOKIE_MAX_AGE_SECS,
  REFERRAL_COOKIE_NAME,
  containsBlockedWord,
  generateReferralCode,
  hasReferralAttribution,
  normalizeReferralCode,
  parseReferralCookie,
  referralUrl,
} from '@/lib/referrals/code';

describe('alfabeto de los códigos (spec §3.2: sin 0/O ni 1/l/I)', () => {
  it('no trae ningún símbolo confundible', () => {
    for (const confusing of ['0', 'O', '1', 'I', 'L', 'l', 'i', 'o']) {
      expect(REFERRAL_CODE_ALPHABET.includes(confusing)).toBe(false);
    }
  });

  it('son 31 símbolos distintos, solo mayúsculas y dígitos', () => {
    expect(REFERRAL_CODE_ALPHABET).toHaveLength(31);
    expect(new Set(REFERRAL_CODE_ALPHABET).size).toBe(31);
    expect(REFERRAL_CODE_ALPHABET).toMatch(/^[A-Z2-9]+$/);
  });

  it('el código mide 8 (spec: 6-8 caracteres)', () => {
    expect(REFERRAL_CODE_LENGTH).toBe(8);
  });
});

describe('generateReferralCode', () => {
  it('usa el sorteo inyectado: índice 0 en cada posición da 8 veces la primera letra', () => {
    expect(generateReferralCode(() => 0)).toBe('AAAAAAAA');
  });

  it('pide un índice DENTRO del alfabeto (nunca uno que se salga)', () => {
    const maxima: number[] = [];
    generateReferralCode((max) => {
      maxima.push(max);
      return 0;
    });
    expect(maxima).toHaveLength(REFERRAL_CODE_LENGTH);
    expect(new Set(maxima)).toEqual(new Set([31]));
  });

  it('cada símbolo del alfabeto es alcanzable (el último índice existe)', () => {
    expect(generateReferralCode(() => 30)).toBe('99999999');
  });

  it('con el generador real: 8 símbolos del alfabeto, y 2 000 códigos sin una colisión', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 2000; i++) {
      const code = generateReferralCode();
      expect(code).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ2-9]{8}$/);
      seen.add(code);
    }
    // 31^8 ≈ 8.5e11: 2 000 sorteos colisionan con probabilidad ≈ 2e-6.
    expect(seen.size).toBe(2000);
  });

  it('vuelve a sortear si sale una grosería, y NO devuelve la del primer intento', () => {
    // Primer intento: P U T A A A A A  (índices 15,20,19,0,0,0,0,0 → 'PUTAAAAA'); segundo: 'AAAAAAAA'.
    const idx = (ch: string) => REFERRAL_CODE_ALPHABET.indexOf(ch);
    const script = [...'PUTAAAAA'].map(idx).concat(Array(8).fill(0));
    let i = 0;
    const code = generateReferralCode(() => script[i++]);
    expect(code).toBe('AAAAAAAA');
    expect(i).toBe(16);
  });

  it('falla fuerte, y no devuelve un código cualquiera, si el sorteo está roto y siempre produce una grosería', () => {
    const idx = (ch: string) => REFERRAL_CODE_ALPHABET.indexOf(ch);
    const script = [...'PUTAAAAA'].map(idx);
    let i = 0;
    expect(() => generateReferralCode(() => script[i++ % 8])).toThrow(/bloqueadas/);
  });

  it('containsBlockedWord encuentra la cadena en cualquier posición', () => {
    expect(containsBlockedWord('XXPUTAXX')).toBe(true);
    expect(containsBlockedWord('PUTAXXXX')).toBe(true);
    expect(containsBlockedWord('XXXXPUTA')).toBe(true);
    expect(containsBlockedWord('ABCDEFGH')).toBe(false);
  });
});

describe('normalizeReferralCode (lo que llega de una URL o una cookie)', () => {
  it('pasa a mayúsculas y quita espacios', () => {
    expect(normalizeReferralCode('  ab2cd3ef ')).toBe('AB2CD3EF');
  });

  it('acepta el formato ancho del Embajador futuro («PEDRO2026», con 0)', () => {
    expect(normalizeReferralCode('pedro2026')).toBe('PEDRO2026');
  });

  it.each([
    ['vacío', ''],
    ['corto (3)', 'ABC'],
    ['largo (21)', 'A'.repeat(21)],
    ['con guion', 'AB-CD-EF'],
    ['con espacio adentro', 'AB CD EFG'],
    ['con barra (path traversal)', '../etc/pw'],
    ['con salto de línea (inyección de cabecera)', 'ABCD\r\nSet-Cookie: x=1'],
    ['con acentos', 'ÁBCDEFGH'],
  ])('rechaza un valor %s', (_nombre, valor) => {
    expect(normalizeReferralCode(valor)).toBeNull();
  });

  it('rechaza lo que no es cadena', () => {
    expect(normalizeReferralCode(undefined)).toBeNull();
    expect(normalizeReferralCode(null)).toBeNull();
    expect(normalizeReferralCode(12345678)).toBeNull();
    expect(normalizeReferralCode(['ABCDEFGH'])).toBeNull();
  });
});

describe('cookie de atribución y first-touch wins (spec §3.2 y §8)', () => {
  it('la cookie es ye_ref y dura 30 días', () => {
    expect(REFERRAL_COOKIE_NAME).toBe('ye_ref');
    expect(REFERRAL_COOKIE_MAX_AGE_SECS).toBe(30 * 24 * 60 * 60);
  });

  it('una cookie con un código bien formado YA es una atribución: ningún enlace posterior la pisa', () => {
    expect(hasReferralAttribution('AB2CD3EF')).toBe(true);
  });

  it('sin cookie no hay atribución', () => {
    expect(hasReferralAttribution(undefined)).toBe(false);
    expect(hasReferralAttribution('')).toBe(false);
  });

  it('una cookie CORRUPTA no cuenta como atribución (si contara, quien la manipule se queda sin atribución para siempre)', () => {
    expect(hasReferralAttribution('%%%basura%%%')).toBe(false);
    expect(parseReferralCookie('%%%basura%%%')).toBeNull();
  });

  it('parseReferralCookie normaliza a mayúsculas', () => {
    expect(parseReferralCookie('ab2cd3ef')).toBe('AB2CD3EF');
  });
});

describe('referralUrl', () => {
  it('arma https://yaentre.com/r/{code}', () => {
    expect(referralUrl('AB2CD3EF', 'https://yaentre.com')).toBe('https://yaentre.com/r/AB2CD3EF');
  });

  it('no duplica la barra final del sitio', () => {
    expect(referralUrl('AB2CD3EF', 'https://yaentre.com/')).toBe('https://yaentre.com/r/AB2CD3EF');
    expect(referralUrl('AB2CD3EF', 'https://yaentre.com///')).toBe('https://yaentre.com/r/AB2CD3EF');
  });
});

/**
 * BARRIDO — nada de lo que autoriza o reparte crédito usa `Math.random`.
 * CLAUDE.md (G65 §5): xorshift128+ se reconstruye. Con control positivo: el
 * predicado tiene que ver un `Math.random` real, o un regex roto pasaría siempre.
 */
describe('barrido: el programa de referidos no usa Math.random', () => {
  const ROOT = process.cwd();
  const TREES = ['src/lib/referrals', 'src/lib/db/referrals.ts', 'app/r', 'app/api/referrals', 'app/(app)/app/invitar'];

  function walk(path: string, out: string[] = []): string[] {
    if (!existsSync(path)) return out;
    if (statSync(path).isFile()) {
      if (/\.(ts|tsx)$/.test(path)) out.push(path);
      return out;
    }
    for (const entry of readdirSync(path)) walk(join(path, entry), out);
    return out;
  }

  const usesMathRandom = (source: string) =>
    /\bMath\s*\.\s*random\b/.test(source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1'));

  it('el predicado ve un Math.random real y no se deja engañar por un comentario', () => {
    expect(usesMathRandom('const x = Math.random();')).toBe(true);
    expect(usesMathRandom('const x = Math . random();')).toBe(true);
    expect(usesMathRandom('// no usar Math.random()\nconst x = 1;')).toBe(false);
    expect(usesMathRandom('/* Math.random */ const x = 1;')).toBe(false);
  });

  it('ningún archivo del programa lo usa', () => {
    const files = TREES.flatMap((t) => walk(join(ROOT, t)));
    expect(files.length).toBeGreaterThan(3);
    const offenders = files.filter((f) => usesMathRandom(readFileSync(f, 'utf8')));
    expect(offenders.map((f) => f.slice(ROOT.length + 1))).toEqual([]);
  });
});
