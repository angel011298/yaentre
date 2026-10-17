import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

/**
 * G101 — la interfaz no usa emojis.
 *
 * Instrucción del dueño (2026-10-17). Había 165 en 59 archivos: menú, racha,
 * Entrómetro, paywall, correos, textos de Tino, panel de administración y
 * hasta los íconos de la app. Un emoji depende de la fuente del sistema
 * (distinto en cada teléfono), no hereda el color del tema y no escala con el
 * texto; ahora se usa `src/components/ui/Icon.tsx`.
 *
 * Revisa el código que llega al usuario (`app/`, `src/`) e ignora comentarios:
 * ahí un emoji no se pinta. Los símbolos tipográficos (flechas, «·», «—»)
 * no son emojis y quedan fuera.
 */
const EMOJI =
  /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}\u{2B06}\u{2705}\u{274C}\u{23F0}-\u{23FA}\u{2605}\u{2606}\u{25B6}\u{25C0}]/u;

function files(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...files(full));
    else if (/\.(tsx?|mjs)$/.test(name)) out.push(full);
  }
  return out;
}

/** Líneas con emoji fuera de comentarios. */
export function emojiOffenders(source: string): number[] {
  const lines = source.split('\n');
  const hits: number[] = [];
  let inBlock = false;
  lines.forEach((line, i) => {
    const t = line.trim();
    if (inBlock) {
      if (t.includes('*/')) inBlock = false;
      return;
    }
    if (t.startsWith('/*') || t.startsWith('{/*')) {
      if (!t.includes('*/')) inBlock = true;
      return;
    }
    if (t.startsWith('//') || t.startsWith('*')) return;
    if (EMOJI.test(line)) hits.push(i + 1);
  });
  return hits;
}

const ROOT = process.cwd();
const SOURCES = [...files(join(ROOT, 'app')), ...files(join(ROOT, 'src'))];

describe('sin emojis en la interfaz', () => {
  it('el barrido encuentra los archivos (control: no está vacío)', () => {
    expect(SOURCES.length).toBeGreaterThan(150);
  });

  it('ningún archivo de app/ ni src/ pinta un emoji', () => {
    const offenders = SOURCES.flatMap((file) =>
      emojiOffenders(readFileSync(file, 'utf8')).map(
        (line) => `${relative(ROOT, file).split(sep).join('/')}:${line}`
      )
    );
    expect(offenders).toEqual([]);
  });
});

describe('control positivo: el detector SÍ ve un emoji', () => {
  it.each([
    ['<span>🔥 {days}</span>', [1]],
    ["label: '⭐ Más elegido',", [1]],
    ["free: '✅',", [1]],
    ['¡Hola! 👋', [1]],
    ['▶ Hacer un simulacro completo', [1]],
  ])('%s', (src, expected) => {
    expect(emojiOffenders(src)).toEqual(expected);
  });

  it('pero ignora comentarios y símbolos tipográficos', () => {
    expect(emojiOffenders('// antes era 🔥\n/* 🦉 */\n<p>Siguiente → · —</p>')).toEqual([]);
  });
});
