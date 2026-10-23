/**
 * Marca v1.0 — geometría de Chilo, la mascota de YaEntre (docs/marca).
 *
 * Port literal de `OUTFIT()` (docs/marca/referencia/atuendo-svg.js): mismas
 * piezas, mismo orden de dibujo y la MISMA aritmética en el mismo orden, para
 * que los números salgan idénticos al carácter. `tests/brand/chilo.test.ts`
 * compara esta salida contra la función de referencia en TODAS las
 * combinaciones de pose × cara × materia × tema, y contra los 22 SVG finales
 * de docs/marca/svg. Si cambias algo aquí, esa prueba es la que dice si sigue
 * siendo la mascota del manual.
 *
 * Chilo SIEMPRE va vestido: hoodie, jeans y tenis. No existe versión sin ropa
 * (el logo, que es solo la cabeza, es la única excepción y vive en
 * `logo-mark.ts`).
 *
 * Funciones puras que devuelven un árbol de nodos; el componente React
 * (`src/components/mascot/Chilo.tsx`) y el serializador a texto
 * (`chiloSvgString`) lo pintan. La hoodie entra como paleta para que el
 * componente pueda pasar `var(--chilo-hood)` y seguir al `data-theme`.
 */

export const CHILO_POSES = [
  'libro',
  'bolsa',
  'lapiz',
  'error',
  'dormido',
  'pensando',
  'calc',
  'reloj',
  'celebrar',
  'probeta',
] as const;
export type ChiloPose = (typeof CHILO_POSES)[number];

export const CHILO_CARAS = ['n', 'happy', 'think', 'flat', 'sleep'] as const;
export type ChiloCara = (typeof CHILO_CARAS)[number];

export interface ChiloTone {
  base: string;
  shade: string;
  hi: string;
}

/** Piel lila por defecto (y la de Matemáticas). */
export const CHILO_LILA: ChiloTone = { base: '#C4B5FD', shade: '#AF9BF7', hi: '#EEE8FF' };

/**
 * Variante por materia: misma luminosidad (OKLCH L 0.81, C 0.095), cambia el
 * matiz. Valores que calcula `LIB().SUBJ` de docs/marca/referencia/
 * generador-svg.js (la prueba los recalcula). Las materias del catálogo que
 * no están aquí (Inglés, Filosofía, Civismo, Artes…) usan la piel lila:
 * el manual deja la tabla como «propuesta: validar con el catálogo».
 */
export const CHILO_MATERIAS = {
  matematicas: CHILO_LILA,
  espanol: { base: '#F0A8CA', shade: '#CA81A4', hi: '#FEDEEC' },
  fisica: { base: '#92C6FC', shade: '#6AA0D7', hi: '#D7EAFF' },
  quimica: { base: '#70D5CE', shade: '#3FAFA9', hi: '#CBF1EE' },
  biologia: { base: '#9AD29B', shade: '#73AC74', hi: '#D8EFD8' },
  historia: { base: '#E1BA79', shade: '#BC944F', hi: '#F6E6CB' },
  geografia: { base: '#79CEEF', shade: '#4CA8CA', hi: '#CDEEFC' },
  habilidades: { base: '#F8A9A2', shade: '#D2827C', hi: '#FFDFDC' },
} as const satisfies Record<string, ChiloTone>;
export type ChiloMateria = keyof typeof CHILO_MATERIAS;

/** Colores de la hoodie (lo único que cambia entre día y noche). */
export interface ChiloHoodie {
  hood: string;
  hoodD: string;
  sleeve: string;
}

/** Día (tema claro): hoodie negra. Noche (tema oscuro): crema. */
export const CHILO_HOODIE = {
  day: { hood: '#1E1D24', hoodD: '#121116', sleeve: '#2B2A33' },
  night: { hood: '#F1E8D0', hoodD: '#DDD0AC', sleeve: '#F9F4E6' },
} as const satisfies Record<string, ChiloHoodie>;

/** Fondo del avatar circular, por tema. */
export const CHILO_AVATAR_BG = { day: '#EDE9FE', night: '#2A2833' } as const;

export const CHILO_VIEWBOX = '-14 -16 148 192';
/** Avatar de perfil: la pose `bolsa` recortada a busto. */
export const CHILO_AVATAR_VIEWBOX = '4 -2 112 112';
export const CHILO_RATIO = 148 / 192;

export type ChiloAttrs = Record<string, string | number>;
export interface ChiloNode {
  tag: 'path' | 'circle' | 'ellipse' | 'rect' | 'polygon' | 'g';
  attrs: ChiloAttrs;
  children?: ChiloNode[];
}

const AC = '#FC9712';
const INK = '#2E1065';
const VIO = '#6D28D9';
const JN = '#9DB9E4';
const JD = '#7F9ED2';
const SH = '#DDD9EA';
const SS = '#BEB9D0';

const E = (tag: ChiloNode['tag'], attrs: ChiloAttrs): ChiloNode => ({ tag, attrs });
const P_ = (d: string, fill: string, x?: ChiloAttrs) => E('path', { d, fill, ...x });
const ln = (d: string, c: string, w: number) =>
  E('path', {
    d,
    stroke: c,
    'stroke-width': w,
    fill: 'none',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
  });
const ci = (cx: number, cy: number, r: number, fill: string, x?: ChiloAttrs) =>
  E('circle', { cx, cy, r, fill, ...x });
const el = (cx: number, cy: number, rx: number, ry: number, fill: string, x?: ChiloAttrs) =>
  E('ellipse', { cx, cy, rx, ry, fill, ...x });
const rc = (x: number, y: number, w: number, h: number, r: number, fill: string, o?: ChiloAttrs) =>
  E('rect', { x, y, width: w, height: h, rx: r, fill, ...o });
/** Agrupa los ojos en `<g class>` (para el parpadeo) solo si hay clase. */
const g = (inner: ChiloNode[], cls: string): ChiloNode[] =>
  cls ? [{ tag: 'g', attrs: { class: cls }, children: inner }] : inner;

function headF(cx: number, cy: number, r: number, t: ChiloTone, face: ChiloCara, cls: string) {
  const ex = 0.34 * r;
  const ey = cy + 0.12 * r;
  const my = cy + 0.56 * r;
  let f: ChiloNode[];
  if (face === 'happy')
    f = [
      ...g(
        [
          ln('M' + (cx - ex - 5) + ' ' + (ey + 1) + ' q5 -7 10 0', INK, 3.4),
          ln('M' + (cx + ex - 5) + ' ' + (ey + 1) + ' q5 -7 10 0', INK, 3.4),
        ],
        cls
      ),
      ln('M' + (cx - 7) + ' ' + (my - 1) + ' q7 8 14 0', INK, 2.8),
    ];
  else if (face === 'sleep')
    f = [
      ...g(
        [
          ln('M' + (cx - ex - 5) + ' ' + ey + ' q5 5 10 0', INK, 3.4),
          ln('M' + (cx + ex - 5) + ' ' + ey + ' q5 5 10 0', INK, 3.4),
        ],
        cls
      ),
      el(cx, my + 1, 3, 2.4, INK, { opacity: 0.8 }),
    ];
  else if (face === 'think')
    f = [
      ...g([el(cx - ex, ey - 3, 3.8, 4.6, INK), el(cx + ex, ey - 3, 3.8, 4.6, INK)], cls),
      ln('M' + (cx - 5) + ' ' + my + ' h10', INK, 2.8),
    ];
  else if (face === 'flat')
    f = [
      ...g([el(cx - ex, ey + 1, 3.8, 3, INK), el(cx + ex, ey + 1, 3.8, 3, INK)], cls),
      ln('M' + (cx - 5) + ' ' + (my + 2) + ' q5 -4 10 0', INK, 2.8),
    ];
  else
    f = [
      ...g([el(cx - ex, ey, 3.8, 4.6, INK), el(cx + ex, ey, 3.8, 4.6, INK)], cls),
      ln('M' + (cx - 5) + ' ' + my + ' q6 4.5 11 -1', INK, 2.8),
    ];
  return [
    ci(cx, cy, r, t.base),
    E('ellipse', {
      cx: cx - 0.44 * r,
      cy: cy - 0.53 * r,
      rx: 0.31 * r,
      ry: 0.19 * r,
      transform: 'rotate(-28 ' + (cx - 0.44 * r) + ' ' + (cy - 0.53 * r) + ')',
      fill: t.hi,
      opacity: 0.9,
    }),
    ...f,
  ];
}

const shoe = (x: number) => [rc(x, 150, 36, 11, 5.5, SH), rc(x + 1, 157, 34, 4, 2, SS)];
const jeans = () => [
  P_('M37 112 H60 V152 H29 Q26 152 27 148 Z', JN),
  P_('M60 112 H83 L93 148 Q94 152 91 152 H60 Z', JN),
  ln('M60 114 V151', JD, 1.4),
];
const hoodBody = (P: ChiloHoodie) => [
  P_('M31 84 Q31 68 60 68 Q89 68 89 84 L93 112 Q93 121 85 121 H35 Q27 121 27 112 Z', P.hood),
  rc(28, 112, 64, 9, 4.5, P.hoodD),
];
const collar = (P: ChiloHoodie) => [
  el(60, 76, 22, 8, P.hoodD),
  P_('M31 72 Q36 62 60 62 Q84 62 89 72 Q92 84 76 88 Q60 92 44 88 Q28 84 31 72 Z', P.hood),
];
const sleeve = (P: ChiloHoodie, d: string) => ln(d, P.sleeve, 16);

/** Bolsillo canguro. Se dibuja DESPUÉS de las mangas: tapa sus remates. */
export const CHILO_POCKET_PATH = 'M36 96 H84 L88 112 H32 Z';
const pocket = (P: ChiloHoodie) => P_(CHILO_POCKET_PATH, P.hoodD);

/** Manos en la bolsa: las mangas entran por los costados del bolsillo. */
export const CHILO_POCKET_SLEEVES = ['M35 80 Q21 96 45 103', 'M85 80 Q99 96 75 103'] as const;
const pocketArms = (P: ChiloHoodie) => CHILO_POCKET_SLEEVES.map((d) => sleeve(P, d));

/** Manos con objeto: la manga termina en puño y la mano lila queda 4.5 hacia el centro. */
function holdArms(
  P: ChiloHoodie,
  t: ChiloTone,
  L: readonly [number, number],
  R: readonly [number, number],
  prop: ChiloNode[]
) {
  return [
    sleeve(P, 'M35 80 Q' + (L[0] - 17) + ' ' + ((80 + L[1]) / 2 + 6) + ' ' + L[0] + ' ' + L[1]),
    sleeve(P, 'M85 80 Q' + (R[0] + 17) + ' ' + ((80 + R[1]) / 2 + 6) + ' ' + R[0] + ' ' + R[1]),
    ...prop,
    ci(L[0] + 4.5, L[1] - 2, 6.5, t.base),
    ci(R[0] - 4.5, R[1] - 2, 6.5, t.base),
  ];
}

function star(cx: number, cy: number, R: number, r: number) {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r : R;
    pts.push((cx + rr * Math.cos(a)).toFixed(1) + ',' + (cy + rr * Math.sin(a)).toFixed(1));
  }
  return E('polygon', { points: pts.join(' '), fill: AC });
}

const fillY = (i: number) => (i ? 119 : 113);

type HoldPose = 'libro' | 'dormido' | 'calc' | 'reloj' | 'probeta';
const PROPS: Record<
  HoldPose,
  { L: readonly [number, number]; R: readonly [number, number]; f: ChiloCara; svg: () => ChiloNode[] }
> = {
  libro: {
    L: [36, 114],
    R: [84, 114],
    f: 'n',
    svg: () => [rc(38, 101, 44, 25, 3, VIO), rc(42, 105, 36, 17, 2, '#FFFFFF'), rc(58.6, 105, 2.8, 17, 0, VIO)],
  },
  dormido: {
    L: [45, 112],
    R: [75, 112],
    f: 'sleep',
    svg: () => [rc(52, 100, 16, 19, 3, VIO), rc(52, 100, 16, 4, 2, '#A78BFA'), ln('M68 104 a6 6 0 0 1 0 11', VIO, 3.4)],
  },
  calc: {
    L: [43, 114],
    R: [77, 114],
    f: 'n',
    svg: () => [
      rc(46, 98, 28, 25, 4, VIO),
      rc(49, 101, 22, 8, 2, '#E9E3FF'),
      ...[52, 60, 68].flatMap((x) => [
        ci(x, fillY(0), 2, x === 68 ? AC : '#FFFFFF'),
        ci(x, fillY(1), 2, x === 68 ? AC : '#FFFFFF'),
      ]),
    ],
  },
  reloj: {
    L: [43, 116],
    R: [77, 116],
    f: 'n',
    svg: () => [
      rc(56.5, 94, 7, 4, 2, VIO),
      ci(60, 110, 13, '#FFFFFF', { stroke: VIO, 'stroke-width': 4 }),
      ln('M60 110 V102 M60 110 L66 114', AC, 3),
    ],
  },
  probeta: {
    L: [44, 116],
    R: [76, 116],
    f: 'n',
    svg: () => [
      P_('M56 98 H64 V108 L74 124 Q75 127 72 127 H48 Q45 127 46 124 L56 108 Z', '#FFFFFF', {
        stroke: VIO,
        'stroke-width': 3,
        'stroke-linejoin': 'round',
      }),
      P_('M50 119 H70 L73 124 Q74 126.5 71.5 126.5 H48.5 Q46 126.5 47 124 Z', AC),
    ],
  },
};

export interface ChiloOptions {
  /** Cara; si falta, la de la pose (libro→n, dormido→sleep, lapiz→happy…). */
  face?: ChiloCara;
  tone?: ChiloTone;
  /** Clase del grupo de los ojos (parpadeo / mirada). */
  eyeCls?: string;
}

/** La cara que cada pose trae por defecto. */
export function defaultCara(pose: ChiloPose): ChiloCara {
  if (pose in PROPS) return PROPS[pose as HoldPose].f;
  if (pose === 'lapiz' || pose === 'celebrar') return 'happy';
  if (pose === 'pensando') return 'think';
  if (pose === 'error') return 'flat';
  return 'n';
}

/** Todas las piezas de Chilo, en orden de dibujo. */
export function chiloNodes(pose: ChiloPose, P: ChiloHoodie, o: ChiloOptions = {}): ChiloNode[] {
  const t = o.tone ?? CHILO_LILA;
  const cls = o.eyeCls ?? '';
  const base: ChiloNode[] = [
    el(60, 162, 36, 4.5, '#000000', { opacity: 0.1 }),
    ...shoe(20),
    ...shoe(64),
    ...jeans(),
    ...hoodBody(P),
    ...collar(P),
  ];
  const s = [...base];
  if (pose in PROPS) {
    const p = PROPS[pose as HoldPose];
    s.push(pocket(P), ...holdArms(P, t, p.L, p.R, p.svg()));
  } else if (pose === 'lapiz' || pose === 'pensando') {
    const prop: ChiloNode[] =
      pose === 'lapiz'
        ? [
            {
              tag: 'g',
              attrs: { transform: 'rotate(12 99 58)' },
              children: [
                rc(95.5, 22, 7, 34, 1.5, VIO),
                rc(95.5, 44, 7, 4, 0, AC),
                P_('M95.5 22 L102.5 22 L99 13 Z', INK),
              ],
            },
          ]
        : [
            ci(106, 36, 10, '#FFFFFF', { 'fill-opacity': 0.55, stroke: VIO, 'stroke-width': 4 }),
            ln('M101 44 L99 54', VIO, 4.5),
          ];
    s.push(
      sleeve(P, 'M35 80 Q21 96 45 103'),
      sleeve(P, 'M85 80 Q103 80 99 62'),
      pocket(P),
      ...prop,
      ci(99, 58, 7, t.base)
    );
  } else if (pose === 'celebrar') {
    s.push(
      sleeve(P, 'M34 82 Q10 74 17 46'),
      sleeve(P, 'M86 82 Q110 74 103 46'),
      pocket(P),
      ci(17, 41, 7, t.base),
      ci(103, 41, 7, t.base),
      star(60, -4, 11, 4.8),
      ci(18, 10, 2.6, AC),
      ci(104, 8, 2.6, VIO),
      ci(34, -6, 2, VIO),
      ci(88, -8, 2, AC)
    );
  } else {
    s.push(...pocketArms(P), pocket(P));
  }
  return [...s, ...headF(60, 40, 32, t, o.face ?? defaultCara(pose), cls)];
}

function nodeString(n: ChiloNode): string {
  if (n.tag === 'g' && n.attrs.class !== undefined && Object.keys(n.attrs).length === 1) {
    return '<g class="' + n.attrs.class + '">' + (n.children ?? []).map(nodeString).join('') + '</g>';
  }
  const attrs = Object.entries(n.attrs)
    .map(([k, v]) => k + '="' + v + '"')
    .join(' ');
  if (n.tag === 'g') return '<g ' + attrs + '>' + (n.children ?? []).map(nodeString).join('') + '</g>';
  return '<' + n.tag + ' ' + attrs + '></' + n.tag + '>';
}

/** Serializa piezas al mismo texto que produce la referencia. */
export function chiloNodesString(nodes: ChiloNode[]): string {
  return nodes.map(nodeString).join('');
}

/** SVG completo de una pose (formato de los archivos `personaje-*.svg`). */
export function chiloSvgString(
  pose: ChiloPose,
  tema: 'day' | 'night',
  o: ChiloOptions = {}
): string {
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' +
    CHILO_VIEWBOX +
    '">' +
    chiloNodesString(chiloNodes(pose, CHILO_HOODIE[tema], o)) +
    '</svg>'
  );
}

/** Avatar de perfil: fondo por tema + pose `bolsa`, encuadre de busto. */
export function chiloAvatarSvgString(tema: 'day' | 'night', o: ChiloOptions = {}): string {
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' +
    CHILO_AVATAR_VIEWBOX +
    '">' +
    chiloNodesString([
      rc(4, -2, 112, 112, 0, CHILO_AVATAR_BG[tema]),
      ...chiloNodes('bolsa', CHILO_HOODIE[tema], o),
    ]) +
    '</svg>'
  );
}

function fold(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/**
 * Materia del catálogo → variante de Chilo, por el nombre de la materia
 * (`Subject.name`). `null` = sin variante (piel lila).
 */
export function chiloMateriaForSubject(subjectName: string): ChiloMateria | null {
  const n = fold(subjectName);
  if (n.startsWith('matemat')) return 'matematicas';
  if (n.startsWith('espanol') || n.startsWith('literatura') || n.includes('lectura')) return 'espanol';
  if (n.startsWith('fisica')) return 'fisica';
  if (n.startsWith('quimica')) return 'quimica';
  if (n.startsWith('biologia')) return 'biologia';
  if (n.startsWith('historia')) return 'historia';
  if (n.startsWith('geografia')) return 'geografia';
  if (n.startsWith('habilidad')) return 'habilidades';
  return null;
}
