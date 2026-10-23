import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Chilo } from '@/components/mascot/Chilo';
import { TINO_TO_CHILO_POSE, Tino, type TinoState } from '@/components/mascot/Tino';
import {
  CHILO_CARAS,
  CHILO_HOODIE,
  CHILO_LILA,
  CHILO_MATERIAS,
  CHILO_POCKET_PATH,
  CHILO_POCKET_SLEEVES,
  CHILO_POSES,
  chiloAvatarSvgString,
  chiloMateriaForSubject,
  chiloNodes,
  chiloSvgString,
  defaultCara,
  type ChiloMateria,
  type ChiloPose,
} from '@/lib/brand/chilo-geometry';

/**
 * Marca v1.0 (G102) — Chilo.
 *
 * El oráculo es el generador del propio handoff (docs/marca/referencia/
 * atuendo-svg.js, `OUTFIT()`), que reproduce al carácter los 22 SVG finales de
 * docs/marca/svg. Si el port deja de coincidir en UNA combinación, la mascota
 * de la app ya no es la del manual.
 */
const ROOT = process.cwd();
const require = createRequire(import.meta.url);
const { OUTFIT } = require(join(ROOT, 'docs/marca/referencia/atuendo-svg.js'));
const { LIB } = require(join(ROOT, 'docs/marca/referencia/generador-svg.js'));
const REF = OUTFIT();

const svgFile = (name: string) => readFileSync(join(ROOT, 'docs/marca/svg', name), 'utf8').trim();
const refFigure = (pose: string, m: 'day' | 'night', o: object = {}) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-14 -16 148 192">${REF.inner(pose, m, o)}</svg>`;

describe('geometría: idéntica a la referencia del manual', () => {
  it.each(CHILO_POSES.flatMap((p) => [[p, 'day', 'dia'] as const, [p, 'night', 'noche'] as const]))(
    'personaje-%s-%s.svg',
    (pose, tema, archivo) => {
      expect(chiloSvgString(pose, tema)).toBe(svgFile(`personaje-${pose}-${archivo}.svg`));
    }
  );

  it.each([['day', 'dia'] as const, ['night', 'noche'] as const])('avatar-%s.svg', (tema, archivo) => {
    expect(chiloAvatarSvgString(tema)).toBe(svgFile(`avatar-${archivo}.svg`));
  });

  it('todas las combinaciones de pose × cara × materia × tema × ojos', () => {
    const tones = [undefined, ...Object.values(CHILO_MATERIAS)];
    let checked = 0;
    for (const pose of CHILO_POSES)
      for (const tema of ['day', 'night'] as const)
        for (const face of [undefined, ...CHILO_CARAS])
          for (const tone of tones)
            for (const eyeCls of ['', 'chilo-ojos chilo-parpadeo']) {
              const o = { face, tone, eyeCls };
              expect(chiloSvgString(pose, tema, o)).toBe(refFigure(pose, tema, o));
              checked++;
            }
    // Control: el barrido no está vacío (10 poses × 2 × 6 × 9 × 2).
    expect(checked).toBe(2160);
  });

  it('los tonos por materia son los que calcula el manual (OKLCH L 0.81, C 0.095)', () => {
    const ref = LIB().SUBJ as { n: string; t: { base: string; shade: string; hi: string } }[];
    const byName: Record<string, ChiloMateria> = {
      Matemáticas: 'matematicas',
      Español: 'espanol',
      Física: 'fisica',
      Química: 'quimica',
      Biología: 'biologia',
      Historia: 'historia',
      Geografía: 'geografia',
      Habilidades: 'habilidades',
    };
    expect(ref).toHaveLength(Object.keys(CHILO_MATERIAS).length);
    for (const s of ref) expect(CHILO_MATERIAS[byName[s.n]]).toEqual(s.t);
    expect(CHILO_MATERIAS.matematicas).toEqual(CHILO_LILA);
  });
});

/* ── Manos en la bolsa: ningún remate de manga asoma fuera del bolsillo ── */

type Pt = [number, number];

function parseQuad(d: string): [Pt, Pt, Pt] {
  const n = d.match(/-?\d+(\.\d+)?/g)!.map(Number);
  return [
    [n[0], n[1]],
    [n[2], n[3]],
    [n[4], n[5]],
  ];
}

function insidePolygon([x, y]: Pt, poly: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// `M36 96 H84 L88 112 H32 Z`
const POCKET: Pt[] = [
  [36, 96],
  [84, 96],
  [88, 112],
  [32, 112],
];
const SLEEVE_HALF_WIDTH = 8; // trazo de 16

/**
 * Puntos del remate redondo de la manga: el semicírculo MÁS ALLÁ del final del
 * trazo, en la dirección en que llega la curva. Se toman los ángulos de ±70°
 * respecto a esa dirección; los bordes a ±90° son el costado de la manga, que
 * sí se ve entrando al bolsillo.
 */
function capPoints(d: string): Pt[] {
  const [, c, e] = parseQuad(d);
  const len = Math.hypot(e[0] - c[0], e[1] - c[1]);
  const t: Pt = [(e[0] - c[0]) / len, (e[1] - c[1]) / len];
  const pts: Pt[] = [];
  for (let deg = -70; deg <= 70; deg += 5) {
    const a = (deg * Math.PI) / 180;
    const dir: Pt = [t[0] * Math.cos(a) - t[1] * Math.sin(a), t[0] * Math.sin(a) + t[1] * Math.cos(a)];
    pts.push([e[0] + SLEEVE_HALF_WIDTH * dir[0], e[1] + SLEEVE_HALF_WIDTH * dir[1]]);
  }
  return pts;
}

describe('manos en la bolsa', () => {
  const sleevesIn = (pose: ChiloPose) => {
    const ds = chiloNodes(pose, CHILO_HOODIE.night).map((n) => String(n.attrs.d ?? ''));
    return { ds, sleeves: CHILO_POCKET_SLEEVES.filter((d) => ds.includes(d)) };
  };
  const pocketPoses = CHILO_POSES.filter((p) => sleevesIn(p).sleeves.length > 0);

  it('manos en la bolsa: las dos en bolsa y error, una en lapiz y pensando', () => {
    expect([...pocketPoses].sort()).toEqual(['bolsa', 'error', 'lapiz', 'pensando']);
    expect(sleevesIn('bolsa').sleeves).toHaveLength(2);
    expect(sleevesIn('lapiz').sleeves).toHaveLength(1);
  });

  it.each(pocketPoses)('%s: el bolsillo se dibuja ENCIMA de cada manga que entra en él', (pose) => {
    const { ds, sleeves } = sleevesIn(pose);
    const pocketAt = ds.indexOf(CHILO_POCKET_PATH);
    for (const sleeve of sleeves) expect(pocketAt).toBeGreaterThan(ds.indexOf(sleeve));
  });

  it.each(CHILO_POCKET_SLEEVES)('el remate de %s queda dentro del bolsillo', (sleeve) => {
    for (const p of capPoints(sleeve)) expect(insidePolygon(p, POCKET)).toBe(true);
  });

  it('control: una manga que termina sobre el bolsillo SÍ se detecta', () => {
    const fuera = capPoints('M35 80 Q21 90 45 92');
    expect(fuera.some((p) => !insidePolygon(p, POCKET))).toBe(true);
  });
});

/* ── Componente React ── */

const html = (el: ReturnType<typeof createElement>) => renderToStaticMarkup(el);

describe('<Chilo />', () => {
  it.each(CHILO_POSES)('pose %s: decorativo, vestido y con la hoodie del tema', (pose) => {
    const out = html(createElement(Chilo, { pose }));
    expect(out).toContain('aria-hidden="true"');
    expect(out).toContain(`data-pose="${pose}"`);
    // Siempre vestido: hoodie (por variable de tema), jeans y tenis.
    expect(out).toContain('fill="var(--chilo-hood)"');
    expect(out).toContain('fill="var(--chilo-hood-shade)"');
    expect(out).toContain('fill="#9DB9E4"');
    expect(out).toContain('fill="#DDD9EA"');
    // La hoodie NUNCA va en un color fijo: la decide el data-theme.
    for (const hex of [...Object.values(CHILO_HOODIE.day), ...Object.values(CHILO_HOODIE.night)])
      expect(out).not.toContain(`"${hex}"`);
  });

  // La boca (o los ojos) que distingue a cada cara.
  const FIRMA: Record<(typeof CHILO_CARAS)[number], string> = {
    n: 'q6 4.5 11 -1',
    happy: 'q5 -7 10 0',
    think: ' h10',
    flat: 'q5 -4 10 0',
    sleep: 'q5 5 10 0',
  };

  it.each(CHILO_CARAS)('cara %s en cualquier pose', (cara) => {
    for (const pose of CHILO_POSES) {
      const out = html(createElement(Chilo, { pose, cara }));
      expect(out).toContain(FIRMA[cara]);
      for (const [otra, firma] of Object.entries(FIRMA)) if (otra !== cara) expect(out).not.toContain(firma);
    }
  });

  it.each(Object.keys(CHILO_MATERIAS) as ChiloMateria[])(
    'materia %s: cambia solo la piel y fuerza la cara happy',
    (materia) => {
      const tone = CHILO_MATERIAS[materia];
      const out = html(createElement(Chilo, { pose: 'libro', cara: 'flat', materia }));
      expect(out).toContain(`fill="${tone.base}"`);
      expect(out).toContain(`fill="${tone.hi}"`);
      // happy = arcos `q5 -7 10 0`; flat = elipses aplastadas. Gana happy.
      expect(out).toContain('q5 -7 10 0');
      expect(out).not.toContain('q5 -4 10 0');
      if (materia !== 'matematicas') expect(out).not.toContain(`fill="${CHILO_LILA.base}"`);
    }
  );

  it('avatar: busto de la pose bolsa, con fondo por tema y la cara de la pose pedida', () => {
    const out = html(createElement(Chilo, { variante: 'avatar', pose: 'error', size: 40 }));
    expect(out).toContain('viewBox="4 -2 112 112"');
    expect(out).toContain('fill="var(--chilo-avatar-bg)"');
    expect(out).toContain(CHILO_POCKET_SLEEVES[0]);
    expect(out).toContain('q5 -4 10 0'); // cara flat, la de `error`
    expect(out).toContain('width="40" height="40"');
    // Quieto por defecto (a 40 px un vaivén de 5 px es demasiado).
    expect(out).not.toContain('chilo-anim');
  });

  it('animaciones: clases del manual y quieto con `ninguna`', () => {
    expect(html(createElement(Chilo, {}))).toContain('chilo-anim chilo-reposo');
    expect(html(createElement(Chilo, {}))).toContain('chilo-ojos chilo-parpadeo');
    expect(html(createElement(Chilo, { animacion: 'cargando' }))).toContain('chilo-mirada');
    const quieto = html(createElement(Chilo, { animacion: 'ninguna' }));
    expect(quieto).not.toContain('chilo-anim');
    expect(quieto).not.toContain('chilo-parpadeo');
  });

  it('con `label` se anuncia como imagen', () => {
    const out = html(createElement(Chilo, { label: 'Chilo celebrando' }));
    expect(out).toContain('role="img"');
    expect(out).toContain('aria-label="Chilo celebrando"');
    expect(out).not.toContain('aria-hidden');
  });

  it('proporción: la figura mide 192/148 de su ancho', () => {
    expect(html(createElement(Chilo, { size: 148 }))).toContain('width="148" height="192"');
  });
});

describe('Tino (envoltorio obsoleto)', () => {
  it.each(Object.entries(TINO_TO_CHILO_POSE) as [TinoState, ChiloPose][])(
    '%s → %s',
    (state, pose) => {
      expect(html(createElement(Tino, { state }))).toContain(`data-pose="${pose}"`);
    }
  );

  it('conserva el alto que ocupaba el búho', () => {
    // Tino de 120 era una caja de 120×120; Chilo de 120 de alto mide 93 de ancho.
    expect(html(createElement(Tino, { size: 120 }))).toContain('width="93" height="121"');
  });
});

describe('materia del catálogo → variante', () => {
  it.each([
    ['Matemáticas', 'matematicas'],
    ['Matemáticas Aplicadas', 'matematicas'],
    ['Español', 'espanol'],
    ['Español/Lectura', 'espanol'],
    ['Literatura', 'espanol'],
    ['Física', 'fisica'],
    ['Química', 'quimica'],
    ['Biología', 'biologia'],
    ['Historia de México', 'historia'],
    ['Historia Universal', 'historia'],
    ['Geografía', 'geografia'],
    ['Habilidad Matemática', 'habilidades'],
    ['Inglés', null],
    ['Filosofía', null],
  ])('%s → %s', (name, expected) => {
    expect(chiloMateriaForSubject(name)).toBe(expected);
  });

  it('las caras por defecto de cada pose son las del manual', () => {
    expect(defaultCara('dormido')).toBe('sleep');
    expect(defaultCara('pensando')).toBe('think');
    expect(defaultCara('error')).toBe('flat');
    expect(defaultCara('lapiz')).toBe('happy');
    expect(defaultCara('celebrar')).toBe('happy');
    expect(defaultCara('libro')).toBe('n');
  });
});
