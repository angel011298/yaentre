/**
 * scripts/lib/lot-validation.ts — Validación de LOTE (G3c)
 *
 * G3b (verificación ciega) opera reactivo por reactivo y por diseño no puede
 * detectar un defecto del CONJUNTO: los 35 reactivos de G3a tuvieron la
 * respuesta correcta en la posición "A" el 100% de las veces, y el simulador
 * no baraja opciones para todas las instituciones (`shuffleOptions:false`
 * para IPN/UAM/CENEVAL/CNBV en src/lib/simulator/config.ts) — un patrón
 * aprendible que anula el valor de práctica del lote sin que ningún reactivo
 * individual esté "mal".
 *
 * Este módulo es PURO (sin Prisma, sin red) para poder testearse con Vitest y
 * reusarse tanto desde el CLI standalone (scripts/validate-batch.ts) como
 * desde el paso obligatorio dentro de content-insert-drafts.ts.
 */

export interface LotOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface LotExplanation {
  layer: number;
  title: string;
  content: string;
}

export interface LotItem {
  options: LotOption[];
  format: string;
  difficulty: string;
  explanations: LotExplanation[];
}

export type LotViolationCode = 'MALFORMED_OPTIONS' | 'POSITION_SKEW' | 'LETTER_CITATION';

export interface LotViolation {
  code: LotViolationCode;
  detail: string;
}

export interface LetterCitationHit {
  itemIndex: number;
  layer: number;
  field: 'title' | 'content';
  excerpt: string;
}

export interface LotReport {
  total: number;
  /** Conteo de reactivos donde la opción correcta cae en cada letra. */
  positionDistribution: Record<string, number>;
  formatDistribution: Record<string, number>;
  difficultyDistribution: Record<string, number>;
  letterCitations: LetterCitationHit[];
  violations: LotViolation[];
  ok: boolean;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D'] as const;

// Umbral a partir del cual el sesgo de posición es estadísticamente
// significativo. Por debajo de esto (p. ej. un solo tema de 2-4 reactivos)
// no hay muestra suficiente para exigir 15-40% — el chequeo se omite para
// ese lote pequeño, pero el resto de las reglas (letra citada, opciones mal
// formadas) siguen siendo OBLIGATORIAS sin importar el tamaño.
export const POSITION_SKEW_MIN_LOT_SIZE = 20;
export const MAX_LETTER_SHARE = 0.4;
export const MIN_LETTER_SHARE = 0.15;

/**
 * Patrones de una explicación citando un distractor/la respuesta por su
 * LETRA (posición) en vez de por su contenido. Mismo criterio usado para
 * reparar el lote de G3a — ver docs/ESTADO.md sección G3b/G3c.
 */
// Los patrones "letra sola + )" deben EXCLUIR unidades científicas que
// coinciden por casualidad con A-D (°C = Celsius, A = Amperes, C = Coulombs):
// exigen que la letra NO esté pegada a un dígito o a "°" (p. ej. "25°C)",
// "5A)" no matchean; "(definida en B)" sí, porque hay un espacio antes).
const LETTER_CITATION_PATTERNS: RegExp[] = [
  /opci[oó]n\s+[ABCD]\b/i,
  /inciso\s+[ABCD]\b/i,
  /\bletra\s+[ABCD]\b/i,
  /(?<![°\d])\b[ABCD]\)/,
];

function citesByLetter(text: string): boolean {
  return LETTER_CITATION_PATTERNS.some((re) => re.test(text));
}

/** Título tipo "Por qué A" (letra sola, sin contenido) — visto en G3a. */
const BARE_LETTER_TITLE_PATTERN = /^por qu[eé]\s+[ABCD]\s*$/i;

function isBareLetterTitle(title: string): boolean {
  return BARE_LETTER_TITLE_PATTERN.test(title.trim());
}

function isWellFormedOptionSet(options: LotOption[]): boolean {
  if (options.length !== 4) return false;
  const ids = [...options.map((o) => o.id)].sort();
  if (JSON.stringify(ids) !== JSON.stringify([...OPTION_LETTERS])) return false;
  const correctCount = options.filter((o) => o.isCorrect).length;
  return correctCount === 1;
}

/**
 * Analiza un lote completo (todos los reactivos que un sustentante real vería
 * juntos — p. ej. toda una materia, no solo un tema) y reporta si es seguro
 * insertarlo. `ok:false` significa que el script llamador debe RECHAZAR el
 * lote completo, no insertar nada.
 */
export function analyzeLot(items: LotItem[]): LotReport {
  const positionDistribution: Record<string, number> = {};
  const formatDistribution: Record<string, number> = {};
  const difficultyDistribution: Record<string, number> = {};
  const letterCitations: LetterCitationHit[] = [];
  const violations: LotViolation[] = [];

  items.forEach((item, i) => {
    if (!isWellFormedOptionSet(item.options)) {
      violations.push({
        code: 'MALFORMED_OPTIONS',
        detail: `Ítem #${i + 1}: opciones mal formadas (ids=${item.options.map((o) => o.id).join(',')}, correctas=${item.options.filter((o) => o.isCorrect).length}).`,
      });
    } else {
      const correct = item.options.find((o) => o.isCorrect)!;
      positionDistribution[correct.id] = (positionDistribution[correct.id] ?? 0) + 1;
    }

    formatDistribution[item.format] = (formatDistribution[item.format] ?? 0) + 1;
    difficultyDistribution[item.difficulty] = (difficultyDistribution[item.difficulty] ?? 0) + 1;

    for (const exp of item.explanations) {
      if (citesByLetter(exp.title) || isBareLetterTitle(exp.title)) {
        letterCitations.push({ itemIndex: i + 1, layer: exp.layer, field: 'title', excerpt: exp.title.slice(0, 140) });
      }
      if (citesByLetter(exp.content)) {
        letterCitations.push({ itemIndex: i + 1, layer: exp.layer, field: 'content', excerpt: exp.content.slice(0, 140) });
      }
    }
  });

  if (letterCitations.length > 0) {
    violations.push({
      code: 'LETTER_CITATION',
      detail: `${letterCitations.length} explicación(es) citan una opción por su LETRA en vez de por su contenido — el simulador no baraja opciones para todas las instituciones (CLAUDE.md), así que la letra es información estructural, no un identificador arbitrario.`,
    });
  }

  if (items.length >= POSITION_SKEW_MIN_LOT_SIZE) {
    for (const letter of OPTION_LETTERS) {
      const share = (positionDistribution[letter] ?? 0) / items.length;
      if (share > MAX_LETTER_SHARE || share < MIN_LETTER_SHARE) {
        violations.push({
          code: 'POSITION_SKEW',
          detail: `La opción "${letter}" es la correcta en ${(share * 100).toFixed(1)}% de los ${items.length} reactivos (permitido: 15%-40%).`,
        });
      }
    }
  }

  return {
    total: items.length,
    positionDistribution,
    formatDistribution,
    difficultyDistribution,
    letterCitations,
    violations,
    ok: violations.length === 0,
  };
}

/** Formatea un `LotReport` como texto legible para consola (CLI y logs). */
export function formatLotReport(report: LotReport): string {
  const lines: string[] = [];
  lines.push(`Total de reactivos: ${report.total}`);
  lines.push(`Distribución de posición de la respuesta correcta: ${JSON.stringify(report.positionDistribution)}`);
  lines.push(`Distribución de formato: ${JSON.stringify(report.formatDistribution)}`);
  lines.push(`Distribución de dificultad: ${JSON.stringify(report.difficultyDistribution)}`);
  if (report.total < POSITION_SKEW_MIN_LOT_SIZE) {
    lines.push(
      `⚠️  Lote de ${report.total} < ${POSITION_SKEW_MIN_LOT_SIZE}: el chequeo de sesgo de posición (15%-40%) no aplica por muestra insuficiente.`,
    );
  }
  if (report.violations.length === 0) {
    lines.push('✅ Sin violaciones.');
  } else {
    lines.push(`❌ ${report.violations.length} violación(es):`);
    for (const v of report.violations) {
      lines.push(`   [${v.code}] ${v.detail}`);
    }
    if (report.letterCitations.length > 0) {
      lines.push('   Detalle de citas por letra:');
      for (const hit of report.letterCitations) {
        lines.push(`     ítem #${hit.itemIndex} capa ${hit.layer} (${hit.field}): "...${hit.excerpt}..."`);
      }
    }
  }
  return lines.join('\n');
}
