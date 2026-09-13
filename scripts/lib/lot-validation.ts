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
 *
 * G77 amplía este módulo con dos chequeos más, encontrados por la
 * verificación ciega de G76 sobre el lote de Inglés UNAM (G75): ninguno de
 * los dos es un defecto de DISTRIBUCIÓN pareja (lo que ya cubre
 * POSITION_SKEW) sino del MÉTODO de composición —
 *
 *   1. LENGTH_BIAS: la clave era la opción más larga en 24/40 (60% contra
 *      25% esperado al azar) — un señuelo de longitud, aprendible sin
 *      dominar el contenido.
 *   2. ORDER_PATTERN: la clave siguió el ciclo EXACTO A,B,C,D,A,B,C,D,...
 *      en gramática y en vocabulario — la distribución pareja de
 *      POSITION_SKEW no distingue un orden aleatorio de uno perfectamente
 *      cíclico, porque un ciclo perfecto es la distribución MÁS pareja que
 *      existe.
 *
 * Ver el razonamiento de cada umbral junto a sus constantes, abajo.
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
  /** Clave del estímulo compartido (Passage) que este reactivo referencia.
   *  null/ausente salvo en comprensión de lectura (G22). */
  passageRef?: string | null;
}

export type LotViolationCode =
  | 'MALFORMED_OPTIONS'
  | 'POSITION_SKEW'
  | 'LETTER_CITATION'
  | 'PASSAGE_LINK'
  | 'LENGTH_BIAS'
  | 'ORDER_PATTERN';

/**
 * 'reject' bloquea el lote (`report.ok = false`); 'warn' queda en el reporte
 * sin bloquear — para un sesgo real pero dentro de rango de ruido de una
 * muestra pequeña (G77). Todas las reglas preexistentes (G3c) son 'reject':
 * ya vienen de un defecto confirmado, no de una métrica continua con zona
 * gris. Solo LENGTH_BIAS usa el nivel 'warn' (ver constantes abajo).
 */
export type LotViolationSeverity = 'reject' | 'warn';

export interface LotViolation {
  code: LotViolationCode;
  detail: string;
  severity: LotViolationSeverity;
}

export interface LetterCitationHit {
  itemIndex: number;
  layer: number;
  field: 'title' | 'content';
  excerpt: string;
}

/** Estadísticas de longitud opción-correcta vs. distractores (G77). */
export interface LengthBiasStats {
  /** Fracción de reactivos donde la clave es ESTRICTAMENTE más larga (en
   *  caracteres) que las 3 opciones incorrectas. Empates no cuentan. */
  longestShare: number;
  /** Igual que arriba, pero para "estrictamente más corta". */
  shortestShare: number;
  /** Promedio de (longitud de la clave / longitud media de los distractores)
   *  sobre el lote — 1.0 = sin sesgo, >1 = la clave tiende a ser más larga. */
  meanRatio: number;
  /** Reactivos considerados (excluye ítems con opciones mal formadas). */
  sampleSize: number;
}

/** Racha de posiciones-correctas con periodicidad exacta (G77). */
export interface OrderPatternHit {
  /** Longitud del ciclo detectado (2 = alternante, 3-4 = cíclico A-D). */
  period: number;
  /** Ítem donde empieza la racha (1-based, sobre el lote completo). */
  startItem: number;
  /** Ítem donde termina la racha (1-based, inclusive). */
  endItem: number;
  /** La secuencia de letras detectada, para inspección rápida. */
  sequence: string;
}

export interface LotReport {
  total: number;
  /** Conteo de reactivos donde la opción correcta cae en cada letra. */
  positionDistribution: Record<string, number>;
  formatDistribution: Record<string, number>;
  difficultyDistribution: Record<string, number>;
  /** ref del pasaje → nº de reactivos que lo comparten (comprensión de lectura). */
  passageGroups: Record<string, number>;
  letterCitations: LetterCitationHit[];
  lengthBias: LengthBiasStats;
  orderPatterns: OrderPatternHit[];
  violations: LotViolation[];
  ok: boolean;
}

/** Mínimo de preguntas que un texto compartido debe servir para que valga la
 *  pena el modelo Passage — por debajo, el reactivo debería ser autocontenido
 *  en el `stem`. El examen real agrupa 3-5. */
export const MIN_QUESTIONS_PER_PASSAGE = 2;

const OPTION_LETTERS = ['A', 'B', 'C', 'D'] as const;

// Umbral a partir del cual el sesgo de posición es estadísticamente
// significativo. Por debajo de esto (p. ej. un solo tema de 2-4 reactivos)
// no hay muestra suficiente para exigir 15-40% — el chequeo se omite para
// ese lote pequeño, pero el resto de las reglas (letra citada, opciones mal
// formadas) siguen siendo OBLIGATORIAS sin importar el tamaño.
export const POSITION_SKEW_MIN_LOT_SIZE = 20;
export const MAX_LETTER_SHARE = 0.4;
export const MIN_LETTER_SHARE = 0.15;

// ── Sesgo de LONGITUD (G77) ──────────────────────────────────────────────
//
// G76 encontró la clave como la opción MÁS LARGA en 24/40 (60%) del lote de
// Inglés UNAM, contra el 25% esperado al azar entre 4 opciones. A diferencia
// de POSITION_SKEW, aquí NO hay banda inferior simétrica: que la clave sea
// RARA VEZ la más larga (o la más corta) no es un defecto — es exactamente
// el efecto de "igualar el largo de las 4 opciones" que este archivo le pide
// al generador (ver G49 real: longestShare=8.6%, shortestShare=8.6%, sano).
// Solo un EXCESO por encima del azar filtra información explotable.
//
// Igual que POSITION_SKEW, exige muestra mínima: con <20 reactivos, el ruido
// de un lote pequeño puede producir un share alto por casualidad sin que
// haya un patrón real de redacción detrás.
export const LENGTH_BIAS_MIN_LOT_SIZE = 20;
// Banda de ADVERTENCIA: por encima de esto ya se aleja de forma visible del
// 25% esperado (mismo criterio numérico que MAX_LETTER_SHARE), pero a este
// nivel una muestra de 20-30 reactivos todavía puede llegar aquí por azar
// (p. ej. N=20, share=40% -> z≈1.55, no concluyente) — se reporta pero NO
// bloquea la inserción.
export const LENGTH_SHARE_WARN_MAX = 0.4;
// Banda de RECHAZO: para N=40 (el tamaño real de G76) un share de 45% ya es
// z≈2.9 (p<0.004) — estadísticamente muy poco probable por azar. El lote
// real de G76 midió 50% con esta definición estricta (empates no cuentan),
// cómodamente por encima de este corte.
export const LENGTH_SHARE_REJECT_MAX = 0.45;

// ── Patrón de ORDEN predecible en la secuencia de posiciones (G77) ──────
//
// G76 encontró la clave en el ciclo EXACTO A,B,C,D,A,B,C,D,... en gramática
// y en vocabulario (12/12 cada uno) — ya documentado informalmente como
// "racha cíclica de longitud >=3" en metadatos de lotes anteriores (p. ej.
// G49 §seed/positionSkew: "sin racha cíclica A->B->C->D de longitud >=3"),
// pero NUNCA antes codificado en `analyzeLot`. Esta sección lo formaliza y
// lo generaliza más allá del período 4 (alternante = período 2 incluido,
// por el mismo motivo: es igual de aprendible).
//
// Se exigen 3 ciclos completos como mínimo antes de marcar violación —igual
// que la convención ya usada a mano en G49— porque 1-2 repeticiones de un
// período corto ocurren por azar con más frecuencia de lo que parece (con 4
// letras, un período de 2 tiene ~25% de probabilidad de repetirse una vez
// nada más por coincidencia). Exigir el CICLO COMPLETO ×3 antes de bloquear
// evita marcar ruido como patrón, sin dejar pasar el caso real (que fue de
// 6 ciclos seguidos, muy por encima del mínimo).
export const ORDER_PATTERN_MIN_PERIOD = 2;
export const ORDER_PATTERN_MAX_PERIOD = 4;
export const ORDER_PATTERN_MIN_CYCLES = 3;

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
  const passageGroups: Record<string, number> = {};
  const letterCitations: LetterCitationHit[] = [];
  const violations: LotViolation[] = [];

  items.forEach((item, i) => {
    if (!isWellFormedOptionSet(item.options)) {
      violations.push({
        code: 'MALFORMED_OPTIONS',
        detail: `Ítem #${i + 1}: opciones mal formadas (ids=${item.options.map((o) => o.id).join(',')}, correctas=${item.options.filter((o) => o.isCorrect).length}).`,
        severity: 'reject',
      });
    } else {
      const correct = item.options.find((o) => o.isCorrect)!;
      positionDistribution[correct.id] = (positionDistribution[correct.id] ?? 0) + 1;
    }

    formatDistribution[item.format] = (formatDistribution[item.format] ?? 0) + 1;
    difficultyDistribution[item.difficulty] = (difficultyDistribution[item.difficulty] ?? 0) + 1;

    // ── Vínculo pasaje ⇔ formato (G22): un texto compartido debe ir con
    //    READING_COMPREHENSION y viceversa; se comprueba sin conocer la
    //    respuesta correcta, igual que la distribución de posición. ──
    const ref = item.passageRef ?? null;
    const isReadingComp = item.format === 'READING_COMPREHENSION';
    if (isReadingComp && !ref) {
      violations.push({
        code: 'PASSAGE_LINK',
        detail: `Ítem #${i + 1}: formato READING_COMPREHENSION sin passage.ref — no puede vincularse a un texto compartido.`,
        severity: 'reject',
      });
    }
    if (!isReadingComp && ref) {
      violations.push({
        code: 'PASSAGE_LINK',
        detail: `Ítem #${i + 1}: trae passage.ref "${ref}" pero su formato es ${item.format}, no READING_COMPREHENSION.`,
        severity: 'reject',
      });
    }
    if (ref) passageGroups[ref] = (passageGroups[ref] ?? 0) + 1;

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
      severity: 'reject',
    });
  }

  if (items.length >= POSITION_SKEW_MIN_LOT_SIZE) {
    for (const letter of OPTION_LETTERS) {
      const share = (positionDistribution[letter] ?? 0) / items.length;
      if (share > MAX_LETTER_SHARE || share < MIN_LETTER_SHARE) {
        violations.push({
          code: 'POSITION_SKEW',
          detail: `La opción "${letter}" es la correcta en ${(share * 100).toFixed(1)}% de los ${items.length} reactivos (permitido: 15%-40%).`,
          severity: 'reject',
        });
      }
    }
  }

  for (const [ref, count] of Object.entries(passageGroups)) {
    if (count < MIN_QUESTIONS_PER_PASSAGE) {
      violations.push({
        code: 'PASSAGE_LINK',
        detail: `El pasaje "${ref}" lo referencia solo ${count} reactivo(s) — un texto compartido debe servir a ≥${MIN_QUESTIONS_PER_PASSAGE} preguntas (el examen real agrupa 3-5); si es una sola, hazla autocontenida en el stem.`,
        severity: 'reject',
      });
    }
  }

  // ── Sesgo de longitud (G77) ──
  const lengthBias = analyzeLengthBias(items);
  if (items.length >= LENGTH_BIAS_MIN_LOT_SIZE) {
    for (const [label, share] of [
      ['más larga', lengthBias.longestShare],
      ['más corta', lengthBias.shortestShare],
    ] as const) {
      if (share > LENGTH_SHARE_REJECT_MAX) {
        violations.push({
          code: 'LENGTH_BIAS',
          detail: `La opción correcta es la ${label} de las 4 en ${(share * 100).toFixed(1)}% de los ${lengthBias.sampleSize} reactivos válidos (esperado al azar: ~25%; rechazo por encima de ${(LENGTH_SHARE_REJECT_MAX * 100).toFixed(0)}%). Un patrón así se puede explotar sin dominar el contenido.`,
          severity: 'reject',
        });
      } else if (share > LENGTH_SHARE_WARN_MAX) {
        violations.push({
          code: 'LENGTH_BIAS',
          detail: `La opción correcta es la ${label} de las 4 en ${(share * 100).toFixed(1)}% de los ${lengthBias.sampleSize} reactivos válidos (esperado al azar: ~25%; por encima de ${(LENGTH_SHARE_WARN_MAX * 100).toFixed(0)}% pero no concluyente con esta muestra) — revisar antes de insertar.`,
          severity: 'warn',
        });
      }
    }
  }

  // ── Patrón de orden predecible en la secuencia de posiciones (G77) ──
  const orderPatterns = detectOrderPatterns(items);
  for (const hit of orderPatterns) {
    violations.push({
      code: 'ORDER_PATTERN',
      detail: `Racha de periodicidad ${hit.period} en las posiciones de la respuesta correcta, ítems #${hit.startItem}-#${hit.endItem} (${hit.sequence}) — ${Math.round((hit.endItem - hit.startItem + 1) / hit.period)} ciclos completos, aprendible sin dominar el contenido si la institución destino no baraja las opciones.`,
      severity: 'reject',
    });
  }

  return {
    total: items.length,
    positionDistribution,
    formatDistribution,
    difficultyDistribution,
    passageGroups,
    letterCitations,
    lengthBias,
    orderPatterns,
    violations,
    ok: violations.every((v) => v.severity !== 'reject'),
  };
}

/**
 * Compara la longitud (en caracteres) de la opción correcta contra las 3
 * incorrectas, reactivo por reactivo. Ignora ítems con opciones mal
 * formadas (ya reportados por MALFORMED_OPTIONS). Empates no cuentan como
 * "más larga" ni "más corta" en ninguna dirección.
 */
function analyzeLengthBias(items: LotItem[]): LengthBiasStats {
  let longest = 0;
  let shortest = 0;
  let ratioSum = 0;
  let sampleSize = 0;

  for (const item of items) {
    if (!isWellFormedOptionSet(item.options)) continue;
    const correct = item.options.find((o) => o.isCorrect)!;
    const incorrectLens = item.options.filter((o) => !o.isCorrect).map((o) => o.text.length);
    const correctLen = correct.text.length;
    const maxIncorrect = Math.max(...incorrectLens);
    const minIncorrect = Math.min(...incorrectLens);
    if (correctLen > maxIncorrect) longest++;
    if (correctLen < minIncorrect) shortest++;
    const meanIncorrect = incorrectLens.reduce((a, b) => a + b, 0) / incorrectLens.length;
    ratioSum += correctLen / meanIncorrect;
    sampleSize++;
  }

  return {
    longestShare: sampleSize > 0 ? longest / sampleSize : 0,
    shortestShare: sampleSize > 0 ? shortest / sampleSize : 0,
    meanRatio: sampleSize > 0 ? ratioSum / sampleSize : 1,
    sampleSize,
  };
}

/**
 * Detecta rachas de periodicidad exacta en la secuencia de letras correctas,
 * EN EL ORDEN dado (el mismo orden de inserción que ve `positionDistribution`).
 * Ítems con opciones mal formadas se excluyen de la secuencia (no rompen una
 * racha con un hueco falso, simplemente no aportan dato) — el índice de
 * reporte siempre se traduce de vuelta al ítem ORIGINAL del lote completo.
 *
 * Para cada período p entre ORDER_PATTERN_MIN_PERIOD y ORDER_PATTERN_MAX_PERIOD,
 * busca la racha máxima de comparaciones consecutivas letra[i] === letra[i-p].
 * Una racha de `runLen` comparaciones consecutivas cubre `runLen + p` ítems
 * (el bloque que se repite con período p). Solo se reporta si ese bloque
 * alcanza ORDER_PATTERN_MIN_CYCLES ciclos completos (`runLen + p >= p * MIN_CYCLES`).
 */
function detectOrderPatterns(items: LotItem[]): OrderPatternHit[] {
  const letters: string[] = [];
  const originalIndex: number[] = [];
  items.forEach((item, i) => {
    if (!isWellFormedOptionSet(item.options)) return;
    const correct = item.options.find((o) => o.isCorrect)!;
    letters.push(correct.id);
    originalIndex.push(i);
  });

  const hits: OrderPatternHit[] = [];

  for (let period = ORDER_PATTERN_MIN_PERIOD; period <= ORDER_PATTERN_MAX_PERIOD; period++) {
    let runStart: number | null = null;
    let runLen = 0;

    const flush = () => {
      if (runStart !== null && runLen > 0) {
        const spanStartInFiltered = runStart - period;
        const spanLen = runLen + period;
        if (spanLen >= period * ORDER_PATTERN_MIN_CYCLES) {
          const spanEndInFiltered = spanStartInFiltered + spanLen - 1;
          hits.push({
            period,
            startItem: originalIndex[spanStartInFiltered] + 1,
            endItem: originalIndex[spanEndInFiltered] + 1,
            sequence: letters.slice(spanStartInFiltered, spanEndInFiltered + 1).join(','),
          });
        }
      }
      runStart = null;
      runLen = 0;
    };

    for (let i = period; i < letters.length; i++) {
      if (letters[i] === letters[i - period]) {
        if (runStart === null) runStart = i;
        runLen++;
      } else {
        flush();
      }
    }
    flush();
  }

  return hits;
}

/** Formatea un `LotReport` como texto legible para consola (CLI y logs). */
export function formatLotReport(report: LotReport): string {
  const lines: string[] = [];
  lines.push(`Total de reactivos: ${report.total}`);
  lines.push(`Distribución de posición de la respuesta correcta: ${JSON.stringify(report.positionDistribution)}`);
  lines.push(`Distribución de formato: ${JSON.stringify(report.formatDistribution)}`);
  lines.push(`Distribución de dificultad: ${JSON.stringify(report.difficultyDistribution)}`);
  if (Object.keys(report.passageGroups).length > 0) {
    lines.push(`Pasajes compartidos (ref → nº de preguntas): ${JSON.stringify(report.passageGroups)}`);
  }
  if (report.total < POSITION_SKEW_MIN_LOT_SIZE) {
    lines.push(
      `⚠️  Lote de ${report.total} < ${POSITION_SKEW_MIN_LOT_SIZE}: los chequeos de sesgo de posición y de longitud (15%-40% / muestra estadística) no aplican por muestra insuficiente.`,
    );
  }
  lines.push(
    `Sesgo de longitud: clave=más-larga en ${(report.lengthBias.longestShare * 100).toFixed(1)}%, clave=más-corta en ${(report.lengthBias.shortestShare * 100).toFixed(1)}% (n=${report.lengthBias.sampleSize}), razón media clave/distractores=${report.lengthBias.meanRatio.toFixed(2)}.`,
  );
  if (report.orderPatterns.length > 0) {
    lines.push(`Patrones de orden detectados: ${report.orderPatterns.length}`);
    for (const hit of report.orderPatterns) {
      lines.push(`   período ${hit.period}, ítems #${hit.startItem}-#${hit.endItem}: ${hit.sequence}`);
    }
  }

  const rejects = report.violations.filter((v) => v.severity === 'reject');
  const warnings = report.violations.filter((v) => v.severity === 'warn');
  if (rejects.length === 0 && warnings.length === 0) {
    lines.push('✅ Sin violaciones.');
  } else {
    if (rejects.length > 0) {
      lines.push(`❌ ${rejects.length} violación(es) que RECHAZAN el lote:`);
      for (const v of rejects) {
        lines.push(`   [${v.code}] ${v.detail}`);
      }
    }
    if (warnings.length > 0) {
      lines.push(`⚠️  ${warnings.length} advertencia(s) — no bloquean, revisar antes de insertar:`);
      for (const v of warnings) {
        lines.push(`   [${v.code}] ${v.detail}`);
      }
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
