import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * BARRIDO: ningún archivo fuente lleva un carácter de control invisible.
 *
 * G99 encontró una regex de seguridad muerta desde G65 porque contenía un
 * BACKSPACE REAL (U+0008) donde se quiso escribir `\b`: invisible en el editor,
 * en `git diff` y en `grep`. Bloque 3 encontró otro, más sutil, en la descarga
 * del CSV fiscal: una marca de orden de bytes (U+FEFF) escrita como carácter en
 * vez de como escape — basta que un formateador la quite para que Excel lea mal
 * todos los acentos sin que nada lo delate.
 *
 * Cuando hace falta uno, se escribe como ESCAPE (`'\uFEFF'`), que sí se ve.
 *
 * Este archivo NO contiene ninguno literal: el patrón se arma con escapes.
 */

const ROOT = process.cwd();

/** Carpetas y archivos sueltos que se recorren. `node_modules`, `.next` y los respaldos no. */
const SCAN = ['src', 'app', 'scripts', 'prisma', 'tests', 'public', 'proxy.ts'];
const EXTENSIONS = /\.(ts|tsx|js|mjs|cjs|sql|css|prisma)$/;

/**
 * Lo que NO debe aparecer: controles C0 (menos tabulador, salto de línea y retorno),
 * DEL, guion blando, marca de árabe, espacios de ancho cero y marcas de dirección
 * (incluido el «Trojan Source»: U+202A-202E y U+2066-2069), y el BOM.
 */
export const INVISIBLE = new RegExp(
  '[' +
    '\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F' + // controles C0
    '\\u007F' + // DEL
    '\\u00AD' + // guion blando
    '\\u061C' + // marca de letra árabe
    '\\u200B-\\u200F' + // ancho cero y marcas de dirección
    '\\u202A-\\u202E' + // incrustaciones/anulaciones bidireccionales
    '\\u2060-\\u2064' + // unión de palabra y operadores invisibles
    '\\u2066-\\u2069' + // aislamientos bidireccionales
    '\\uFEFF' + // BOM
    ']'
);

export function findInvisible(source: string): Array<{ line: number; code: string }> {
  const found: Array<{ line: number; code: string }> = [];
  source.split('\n').forEach((text, idx) => {
    const match = INVISIBLE.exec(text);
    if (match) found.push({ line: idx + 1, code: 'U+' + match[0].charCodeAt(0).toString(16).toUpperCase().padStart(4, '0') });
  });
  return found;
}

function walk(path: string, out: string[] = []): string[] {
  if (!existsSync(path)) return out;
  if (statSync(path).isFile()) {
    if (EXTENSIONS.test(path)) out.push(path);
    return out;
  }
  for (const entry of readdirSync(path)) {
    if (entry === 'node_modules' || entry === '.next') continue;
    walk(join(path, entry), out);
  }
  return out;
}

describe('el detector (control positivo y negativo)', () => {
  it('encuentra un backspace real, el defecto de G99', () => {
    expect(findInvisible('const r = /\u0008userProfileId/;')).toEqual([{ line: 1, code: 'U+0008' }]);
  });

  it('encuentra un BOM literal, el defecto del CSV fiscal', () => {
    expect(findInvisible('return new Response(`\uFEFF${csv}`);')).toEqual([{ line: 1, code: 'U+FEFF' }]);
  });

  it('encuentra un espacio de ancho cero y una marca de dirección (Trojan Source)', () => {
    expect(findInvisible('a\u200Bb')).toEqual([{ line: 1, code: 'U+200B' }]);
    expect(findInvisible('x\n\u202Ey')).toEqual([{ line: 2, code: 'U+202E' }]);
  });

  it('dice EN QUÉ línea está, contando desde 1', () => {
    expect(findInvisible('uno\ndos\ntr\u0000es')).toEqual([{ line: 3, code: 'U+0000' }]);
  });

  it('NO marca el texto normal: acentos, ñ, emoji, tabulador ni retorno de carro', () => {
    expect(findInvisible('Contraseña válida — ✓ 🦉\tcon tab\r\ny más')).toEqual([]);
  });

  it('NO marca el ESCAPE escrito con seis caracteres visibles', () => {
    expect(findInvisible("const UTF8_BOM = '\\uFEFF';")).toEqual([]);
  });
});

describe('el código fuente del proyecto', () => {
  const files = SCAN.flatMap((p) => walk(join(ROOT, p)));

  it('el barrido recorre archivos de verdad (un patrón de rutas roto no pasa por «0 ofensores»)', () => {
    expect(files.length).toBeGreaterThan(200);
    // Y alcanza las cuatro zonas que importan, no solo una.
    for (const marker of ['src/lib/', 'app/', 'scripts/', 'tests/']) {
      expect(files.some((f) => f.includes(marker))).toBe(true);
    }
  });

  it('ningún archivo lleva un carácter de control invisible', () => {
    const offenders = files.flatMap((file) =>
      findInvisible(readFileSync(file, 'utf8')).map((hit) => `${file.slice(ROOT.length + 1)}:${hit.line} ${hit.code}`)
    );
    expect(offenders).toEqual([]);
  });
});
