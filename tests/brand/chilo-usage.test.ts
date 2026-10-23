import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Marca v1.0 (G102) — dónde puede y dónde no puede aparecer Chilo.
 *
 * Reglas del manual (docs/marca/README.md) verificadas sobre el CÓDIGO FUENTE:
 *   1. Nunca en pagos, facturas, documentos legales ni en el panel de madres y
 *      padres: ahí va el logo sin personaje.
 *   2. Dentro del simulador nada se anima: todo `<Chilo>` de la ruta del
 *      simulador lleva `animacion="ninguna"` (y en la sesión en curso ni
 *      aparece: tests/simulator/no-tino-in-runner.test.ts).
 *   3. Nadie importa ya el `Tino` obsoleto.
 */
const ROOT = process.cwd();

function files(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...files(full));
    else if (/\.tsx?$/.test(name)) out.push(full);
  }
  return out;
}

const rel = (f: string) => relative(ROOT, f).split(sep).join('/');
const SOURCES = [...files(join(ROOT, 'app')), ...files(join(ROOT, 'src'))];

/** Código sin comentarios (una mención en un comentario no pinta nada). */
function code(path: string): string {
  return readFileSync(path, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !l.trim().startsWith('//'))
    .join('\n');
}

const NO_MASCOT = [
  'src/components/checkout/CheckoutViews.tsx',
  'app/(app)/checkout/resultado/page.tsx',
  'src/components/paywall/PaywallScreen.tsx',
  'src/components/paywall/PlanCard.tsx',
  'app/(public)/legal/privacidad/page.tsx',
  'app/(public)/legal/terminos/page.tsx',
  'src/lib/email/templates.ts',
];

describe('dónde NO va Chilo', () => {
  it('el barrido encuentra los archivos (control)', () => {
    expect(SOURCES.length).toBeGreaterThan(150);
    for (const f of NO_MASCOT) expect(SOURCES.map(rel)).toContain(f);
  });

  it.each(NO_MASCOT)('%s: pagos y legales, sin mascota', (f) => {
    const src = code(join(ROOT, f));
    expect(src).not.toMatch(/<(Chilo|Tino)\b/);
  });

  it('el panel de madres y padres (app/tutor, components/tutor) no la usa', () => {
    const tutor = SOURCES.filter((f) => /^(app\/tutor|src\/components\/tutor)\//.test(rel(f)));
    expect(tutor.length).toBeGreaterThan(3);
    for (const f of tutor) expect(code(f), rel(f)).not.toMatch(/<(Chilo|Tino)\b/);
  });

  it('nadie importa el Tino obsoleto', () => {
    const offenders = SOURCES.filter(
      (f) => rel(f) !== 'src/components/mascot/Tino.tsx' && /components\/mascot\/Tino['"]/.test(code(f))
    ).map(rel);
    expect(offenders).toEqual([]);
  });
});

describe('en el simulador Chilo no se mueve', () => {
  const SIM = SOURCES.filter((f) => /^(app\/simulador|src\/components\/simulator)\//.test(rel(f)));

  it('hay Chilos en la ruta del simulador (control: el barrido mira algo)', () => {
    expect(SIM.some((f) => /<Chilo\b/.test(code(f)))).toBe(true);
  });

  it.each(SIM.map(rel))('%s: todo <Chilo> lleva animacion="ninguna"', (f) => {
    const src = code(join(ROOT, f));
    const tags = src.match(/<Chilo\b[\s\S]*?\/>/g) ?? [];
    for (const tag of tags) expect(tag).toContain('animacion="ninguna"');
  });

  it('control: la regla SÍ detecta un Chilo animado', () => {
    const tag = '<Chilo pose="reloj" size={40} />';
    expect(tag.includes('animacion="ninguna"')).toBe(false);
  });
});
