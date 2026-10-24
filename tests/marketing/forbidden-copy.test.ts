import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { complementSentence } from '@/components/marketing/Differentiators';

/**
 * G103 (spec de temporalidad §4 y §7.4) — mensajería «Practicar > ver videos».
 *
 * 1. Ningún texto que llegue al usuario niega los videos como concepto («no es
 *    otro curso con videos», «no es otra página con videos»…): YaEntre ahora
 *    tiene clases grabadas y cursos, y decir «no somos videos» mientras se
 *    venden videos erosiona la credibilidad.
 * 2. Lenguaje obligatorio del marketplace (CONTEXTO §3.2, spec del
 *    marketplace §13): nunca «nuestros profesores», «equipo docente» ni «paga
 *    por cada clase».
 * 3. En el código nuevo de G103 (marketplace, cursos, temporalidad), nunca
 *    «garantía» ni «próximamente». ⚠️ El resto del producto TODAVÍA usa
 *    «Premium Garantía» (bloque 1 del CONTEXTO, fuera de esta fase); este
 *    chequeo no lo cubre a propósito y queda reportado en
 *    docs/RETORNO_HORARIOS_CURSOS.md.
 *
 * Ignora comentarios (ahí la frase no se pinta), igual que `no-emoji.test.ts`.
 * Los documentos legales los redacta el CLO y no se tocan: quedan fuera.
 */

const NEGATES_VIDEOS =
  /no\s+es\s+otr[oa]\s+(curso|p[áa]gina|plataforma)[^.\n]*video|no\s+somos\s+otra\s+plataforma|aqu[íi]\s+no\s+ver[áa]s\s+videos|no\s+se\s+gana\s+viendo\s+videos/i;
const FORBIDDEN_MARKETPLACE = /nuestros\s+profesores|equipo\s+docente|paga\s+por\s+cada\s+clase/i;
const FORBIDDEN_IN_G103 = /garant[íi]a|garantizad|pr[óo]ximamente/i;

function files(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...files(full));
    else if (/\.(tsx?|mjs)$/.test(name)) out.push(full);
  }
  return out;
}

export function offendingLines(source: string, pattern: RegExp): number[] {
  const hits: number[] = [];
  let inBlock = false;
  source.split('\n').forEach((line, i) => {
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
    if (pattern.test(line)) hits.push(i + 1);
  });
  return hits;
}

const ROOT = process.cwd();
const rel = (f: string) => relative(ROOT, f).split(sep).join('/');
const USER_FACING = [...files(join(ROOT, 'app')), ...files(join(ROOT, 'src'))].filter(
  (f) => !rel(f).startsWith('app/(public)/legal/')
);

/** Carpetas y archivos que nacieron en G103. */
const G103_PREFIXES = [
  'src/lib/subscriptions/',
  'src/lib/marketplace/',
  'src/lib/teachers/',
  'src/lib/courses/',
  'src/lib/classes/',
  'src/components/subscription/',
  'src/components/teachers/',
  'src/components/classes/',
  'src/components/courses/',
  'app/profesor/',
  'app/clases/',
  'app/cursos/',
  'app/(public)/cursos/',
  'app/(public)/regularizacion/',
  'app/(app)/app/extender/',
];

function scan(list: string[], pattern: RegExp): string[] {
  return list.flatMap((file) =>
    offendingLines(readFileSync(file, 'utf8'), pattern).map((line) => `${rel(file)}:${line}`)
  );
}

describe('mensajería: los videos no se niegan', () => {
  it('el barrido encuentra los archivos (control: no está vacío)', () => {
    expect(USER_FACING.length).toBeGreaterThan(150);
  });

  it('ningún texto de app/ ni src/ niega los videos como concepto', () => {
    expect(scan(USER_FACING, NEGATES_VIDEOS)).toEqual([]);
  });

  it('nunca «nuestros profesores», «equipo docente» ni «paga por cada clase»', () => {
    expect(scan(USER_FACING, FORBIDDEN_MARKETPLACE)).toEqual([]);
  });

  it('el código nuevo de G103 no dice «garantía» ni «próximamente»', () => {
    const g103 = USER_FACING.filter((f) => G103_PREFIXES.some((p) => rel(f).startsWith(p)));
    expect(g103.length).toBeGreaterThan(0);
    expect(scan(g103, FORBIDDEN_IN_G103)).toEqual([]);
  });
});

describe('control positivo: los detectores SÍ ven las frases prohibidas', () => {
  it.each([
    'No es otro curso con videos.',
    'YaEntre no es otra página con videos',
    'No somos otra plataforma de cursos',
    'Aquí no verás videos',
    'Tu lugar no se gana viendo videos.',
  ])('«%s»', (phrase) => {
    expect(offendingLines(`<h1>${phrase}</h1>`, NEGATES_VIDEOS)).toEqual([1]);
  });

  it('las frases aprobadas por la spec NO se marcan', () => {
    for (const ok of [
      'Practicar > ver videos',
      'Los videos explican. YaEntre te entrena.',
      'No es solo ver videos. Es practicar hasta quedar.',
      'El examen no es de ver: es de resolver.',
    ]) {
      expect(offendingLines(ok, NEGATES_VIDEOS), ok).toEqual([]);
    }
  });

  it('un comentario no cuenta; el mismo texto en el JSX sí', () => {
    expect(offendingLines('// No es otro curso con videos', NEGATES_VIDEOS)).toEqual([]);
    expect(offendingLines("'Conoce a nuestros profesores'", FORBIDDEN_MARKETPLACE)).toEqual([1]);
  });
});

describe('el complemento (clases y cursos) solo se anuncia si existe', () => {
  it('con todo apagado no se menciona nada que no exista', () => {
    expect(complementSentence({ liveClasses: false, courses: false })).toBeNull();
  });

  it('con clases: el lenguaje obligatorio, nunca «nuestros profesores»', () => {
    const s = complementSentence({ liveClasses: true, courses: false })!;
    expect(s).toContain('profesores independientes verificados en YaEntre');
    expect(s).not.toMatch(/curso/);
  });

  it('con cursos solamente, no promete clases', () => {
    const s = complementSentence({ liveClasses: false, courses: true })!;
    expect(s).toContain('cursos a tu ritmo');
    expect(s).not.toMatch(/clases/);
  });
});
