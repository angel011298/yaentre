import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

/**
 * G101 — `text-base` NO es un tamaño de letra en este proyecto.
 *
 * `tailwind.config.ts` define el color `base` (`var(--bg-base)`, el fondo de
 * la app), y Tailwind resuelve `text-base` como ESE color, no como 16 px:
 * el CSS compilado era `.text-base{color:var(--bg-base)}`, sin `font-size`.
 * Diez componentes lo usaban pensando en el tamaño. Casi siempre otro color
 * le ganaba por orden y solo se perdía el tamaño; pero el texto del banner
 * Early Bird quedaba del color del fondo (casi negro) sobre el morado, y en
 * el selector de carreras `sm:text-base` dejaba los nombres invisibles en
 * pantallas de 640 px o más. Para 16 px: `text-[1rem]`.
 */
const TOKEN = /(?<![\w\-[])(?:[a-z]+:)*text-base(?![\w-])/;

function files(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...files(full));
    else if (/\.tsx?$/.test(name)) out.push(full);
  }
  return out;
}

describe('sin la clase ambigua text-base', () => {
  it('ningún componente la usa', () => {
    const root = process.cwd();
    const offenders = [...files(join(root, 'app')), ...files(join(root, 'src'))].flatMap((f) =>
      readFileSync(f, 'utf8')
        .split('\n')
        .map((line, i) => (TOKEN.test(line) ? `${relative(root, f).split(sep).join('/')}:${i + 1}` : null))
        .filter((x): x is string => x !== null)
    );
    expect(offenders).toEqual([]);
  });

  it.each([
    ['className="py-3 text-base"', true],
    ['className="text-sm sm:text-base"', true],
    ['className="bg-base text-text-primary"', false],
    ['className="text-base-content"', false],
    ['className="text-[1rem]"', false],
  ])('control: %s ⇒ %s', (line, expected) => {
    expect(TOKEN.test(line)).toBe(expected);
  });
});
