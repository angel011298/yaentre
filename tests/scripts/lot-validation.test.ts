import { describe, it, expect } from 'vitest';
import {
  analyzeLot,
  POSITION_SKEW_MIN_LOT_SIZE,
  LENGTH_BIAS_MIN_LOT_SIZE,
  LENGTH_SHARE_WARN_MAX,
  LENGTH_SHARE_REJECT_MAX,
  ORDER_PATTERN_MIN_CYCLES,
  type LotItem,
} from '../../scripts/lib/lot-validation';

/**
 * G3c: la verificación ciega (G2) opera reactivo por reactivo y no puede
 * detectar un defecto del CONJUNTO — como los 35 reactivos de G3a, donde la
 * respuesta correcta cayó en la posición "A" el 100% de las veces. Estos
 * tests son el contrato de la regla que lo hubiera bloqueado.
 */

function makeItem(correctId: 'A' | 'B' | 'C' | 'D', overrides: Partial<LotItem> = {}): LotItem {
  return {
    options: [
      { id: 'A', text: 'opción A', isCorrect: correctId === 'A' },
      { id: 'B', text: 'opción B', isCorrect: correctId === 'B' },
      { id: 'C', text: 'opción C', isCorrect: correctId === 'C' },
      { id: 'D', text: 'opción D', isCorrect: correctId === 'D' },
    ],
    format: 'MULTIPLE_CHOICE',
    difficulty: 'INTERMEDIATE',
    explanations: [
      { layer: 1, title: 'Por qué', content: 'Explicación sin citar letras.' },
      { layer: 2, title: 'Paso a paso', content: 'Explicación sin citar letras.' },
      { layer: 3, title: 'Concepto base', content: 'Explicación sin citar letras.' },
    ],
    ...overrides,
  };
}

describe('analyzeLot — sesgo de posición', () => {
  it('caso de referencia G3a: 35/35 en "A" -> rechazado', () => {
    const items = Array.from({ length: 35 }, () => makeItem('A'));
    const report = analyzeLot(items);
    expect(report.ok).toBe(false);
    expect(report.violations.some((v) => v.code === 'POSITION_SKEW')).toBe(true);
    expect(report.positionDistribution).toEqual({ A: 35 });
  });

  it('distribución sana (~25% cada letra, N=35) -> aprobado', () => {
    const letters: Array<'A' | 'B' | 'C' | 'D'> = ['A', 'B', 'C', 'D'];
    const items = Array.from({ length: 35 }, (_, i) => makeItem(letters[i % 4]));
    const report = analyzeLot(items);
    expect(report.violations.filter((v) => v.code === 'POSITION_SKEW')).toHaveLength(0);
    expect(report.positionDistribution).toEqual({ A: 9, B: 9, C: 9, D: 8 });
  });

  it('lote pequeño (< 20) con sesgo total NO dispara POSITION_SKEW (muestra insuficiente)', () => {
    const items = Array.from({ length: 4 }, () => makeItem('A'));
    const report = analyzeLot(items);
    expect(report.violations.filter((v) => v.code === 'POSITION_SKEW')).toHaveLength(0);
    expect(report.total).toBeLessThan(POSITION_SKEW_MIN_LOT_SIZE);
  });

  it('exactamente en el umbral 40% no viola; un reactivo más sí', () => {
    // 20 reactivos, 8 en "A" = 40% exacto -> permitido
    const atLimit = [
      ...Array.from({ length: 8 }, () => makeItem('A')),
      ...Array.from({ length: 4 }, () => makeItem('B')),
      ...Array.from({ length: 4 }, () => makeItem('C')),
      ...Array.from({ length: 4 }, () => makeItem('D')),
    ];
    expect(analyzeLot(atLimit).violations.filter((v) => v.code === 'POSITION_SKEW')).toHaveLength(0);

    // 20 reactivos, 9 en "A" = 45% -> rechazado
    const overLimit = [
      ...Array.from({ length: 9 }, () => makeItem('A')),
      ...Array.from({ length: 4 }, () => makeItem('B')),
      ...Array.from({ length: 4 }, () => makeItem('C')),
      ...Array.from({ length: 3 }, () => makeItem('D')),
    ];
    expect(analyzeLot(overLimit).violations.some((v) => v.code === 'POSITION_SKEW')).toBe(true);
  });
});

describe('analyzeLot — citas por letra en explicaciones', () => {
  it('detecta "opción B" en el contenido de una capa', () => {
    const items = [
      makeItem('A', {
        explanations: [
          { layer: 1, title: 'Por qué', content: 'Correcto.' },
          { layer: 2, title: 'Paso a paso', content: 'Correcto.' },
          {
            layer: 3,
            title: 'Concepto base',
            content: 'El error es confundir con la opción B, que es otra cosa.',
          },
        ],
      }),
    ];
    const report = analyzeLot(items);
    expect(report.ok).toBe(false);
    expect(report.violations.some((v) => v.code === 'LETTER_CITATION')).toBe(true);
    expect(report.letterCitations).toHaveLength(1);
    expect(report.letterCitations[0]).toMatchObject({ itemIndex: 1, layer: 3, field: 'content' });
  });

  it('detecta un título bare-letter ("Por qué A")', () => {
    const items = [
      makeItem('A', {
        explanations: [
          { layer: 1, title: 'Por qué A', content: 'Correcto.' },
          { layer: 2, title: 'Paso a paso', content: 'Correcto.' },
          { layer: 3, title: 'Concepto base', content: 'Correcto.' },
        ],
      }),
    ];
    const report = analyzeLot(items);
    expect(report.letterCitations.some((h) => h.field === 'title')).toBe(true);
  });

  it('NO marca falso positivo por unidades científicas (°C, Amperes, Coulombs)', () => {
    const items = [
      makeItem('A', {
        explanations: [
          { layer: 1, title: 'Por qué', content: 'En el cero absoluto (0 K, −273.15°C), el movimiento es mínimo.' },
          { layer: 2, title: 'Paso a paso', content: 'Esta relación usa Kw = 1×10⁻¹⁴ a 25°C.' },
          { layer: 3, title: 'Concepto base', content: 'Una corriente de 5A) genera un campo magnético.' },
        ],
      }),
    ];
    const report = analyzeLot(items);
    expect(report.letterCitations).toHaveLength(0);
  });

  it('SÍ marca "(definida en B)" — cita real aunque no diga "opción"', () => {
    const items = [
      makeItem('A', {
        explanations: [
          { layer: 1, title: 'Por qué', content: 'Correcto.' },
          { layer: 2, title: 'Paso a paso', content: 'Correcto.' },
          {
            layer: 3,
            title: 'Concepto base',
            content: 'El voltaje describe la energía potencial (definida en B), no la corriente.',
          },
        ],
      }),
    ];
    const report = analyzeLot(items);
    expect(report.letterCitations).toHaveLength(1);
  });

  it('NO marca falso positivo por contenido matemático legítimo (p. ej. "$(x-3)(x+3)$")', () => {
    const items = [
      makeItem('A', {
        explanations: [
          { layer: 1, title: 'Por qué $(x-3)(x+3)$', content: 'Factorización de diferencia de cuadrados.' },
          { layer: 2, title: 'Paso a paso', content: 'Aplica $a^2-b^2=(a-b)(a+b)$.' },
          { layer: 3, title: 'Concepto base', content: 'Sí se factoriza en los reales.' },
        ],
      }),
    ];
    const report = analyzeLot(items);
    expect(report.letterCitations).toHaveLength(0);
  });

  it('cita por letra en un lote de 1 reactivo SIGUE bloqueando (regla sin importar tamaño)', () => {
    const items = [
      makeItem('A', {
        explanations: [
          { layer: 1, title: 'Por qué', content: 'Ver inciso C para el contraste.' },
          { layer: 2, title: 'Paso a paso', content: 'Correcto.' },
          { layer: 3, title: 'Concepto base', content: 'Correcto.' },
        ],
      }),
    ];
    expect(analyzeLot(items).ok).toBe(false);
  });
});

describe('analyzeLot — opciones mal formadas', () => {
  it('rechaza un ítem con 2 opciones correctas', () => {
    const item = makeItem('A');
    item.options[1].isCorrect = true;
    const report = analyzeLot([item]);
    expect(report.violations.some((v) => v.code === 'MALFORMED_OPTIONS')).toBe(true);
  });

  it('rechaza un ítem con ids duplicados/faltantes', () => {
    const item = makeItem('A');
    item.options[3].id = 'A';
    const report = analyzeLot([item]);
    expect(report.violations.some((v) => v.code === 'MALFORMED_OPTIONS')).toBe(true);
  });
});

describe('analyzeLot — vínculo pasaje ↔ formato (G22)', () => {
  it('un pasaje compartido por 5 reactivos READING_COMPREHENSION -> aprobado', () => {
    const letters: Array<'A' | 'B' | 'C' | 'D'> = ['A', 'B', 'C', 'D', 'A'];
    const items = letters.map((l) =>
      makeItem(l, { format: 'READING_COMPREHENSION', passageRef: 'P1' }),
    );
    const report = analyzeLot(items);
    expect(report.violations.filter((v) => v.code === 'PASSAGE_LINK')).toHaveLength(0);
    expect(report.passageGroups).toEqual({ P1: 5 });
  });

  it('READING_COMPREHENSION sin passageRef -> PASSAGE_LINK', () => {
    const items = [makeItem('A', { format: 'READING_COMPREHENSION' })];
    const report = analyzeLot(items);
    expect(report.ok).toBe(false);
    expect(report.violations.some((v) => v.code === 'PASSAGE_LINK')).toBe(true);
  });

  it('passageRef en un reactivo que NO es READING_COMPREHENSION -> PASSAGE_LINK', () => {
    const items = [makeItem('A', { format: 'MULTIPLE_CHOICE', passageRef: 'P1' })];
    const report = analyzeLot(items);
    expect(report.ok).toBe(false);
    expect(report.violations.some((v) => v.code === 'PASSAGE_LINK')).toBe(true);
  });

  it('un pasaje referenciado por un solo reactivo -> PASSAGE_LINK (debería ir en el stem)', () => {
    const items = [
      makeItem('A', { format: 'READING_COMPREHENSION', passageRef: 'P1' }),
      makeItem('B', { format: 'READING_COMPREHENSION', passageRef: 'P2' }),
      makeItem('C', { format: 'READING_COMPREHENSION', passageRef: 'P1' }),
    ];
    const report = analyzeLot(items);
    expect(report.violations.some((v) => v.code === 'PASSAGE_LINK')).toBe(true);
    expect(report.passageGroups).toEqual({ P1: 2, P2: 1 });
  });

  it('sin pasajes en el lote -> passageGroups vacío, sin violación', () => {
    const report = analyzeLot([makeItem('A'), makeItem('B')]);
    expect(report.passageGroups).toEqual({});
    expect(report.violations.filter((v) => v.code === 'PASSAGE_LINK')).toHaveLength(0);
  });
});

/**
 * Secuencia REAL de posiciones-correctas de G49 (Física, UNAM Área 1 — un
 * lote "profundizado" ya sano según el barrido de G3c/G74): balanceada
 * (A9/B9/C9/D8, dentro de 15-40%) y SIN periodicidad — verificado a mano
 * contra `analyzeLot` antes de escribir estos tests. Se reutiliza aquí como
 * la secuencia de letras "de control" para los dos chequeos nuevos de G77,
 * en vez de inventar una secuencia sintética que accidentalmente resulte
 * periódica.
 */
const G49_SANE_SEQUENCE: Array<'A' | 'B' | 'C' | 'D'> = [
  'A', 'A', 'C', 'C', 'D', 'B', 'A', 'C', 'D', 'C',
  'A', 'B', 'D', 'C', 'B', 'D', 'B', 'D', 'A', 'C',
  'B', 'D', 'B', 'A', 'A', 'C', 'B', 'D', 'C', 'B',
  'B', 'A', 'D', 'A', 'C',
];

function makeItemWithOptionTexts(
  correctId: 'A' | 'B' | 'C' | 'D',
  texts: Record<'A' | 'B' | 'C' | 'D', string>,
): LotItem {
  return makeItem(correctId, {
    options: (['A', 'B', 'C', 'D'] as const).map((id) => ({
      id,
      text: texts[id],
      isCorrect: id === correctId,
    })),
  });
}

describe('analyzeLot — sesgo de longitud (G77)', () => {
  it('clave sistemáticamente más larga que los distractores -> LENGTH_BIAS de rechazo', () => {
    // Reusa la secuencia balanceada y no-periódica de G49 (35 items, >= LENGTH_BIAS_MIN_LOT_SIZE)
    // pero hace que la opción correcta sea siempre mucho más larga que las 3 incorrectas.
    const items = G49_SANE_SEQUENCE.map((correctId) => {
      const texts = { A: 'corta', B: 'corta', C: 'corta', D: 'corta' } as Record<'A' | 'B' | 'C' | 'D', string>;
      texts[correctId] = 'esta es la opción correcta, mucho más larga que las demás';
      return makeItemWithOptionTexts(correctId, texts);
    });
    const report = analyzeLot(items);
    expect(report.ok).toBe(false);
    const hit = report.violations.find((v) => v.code === 'LENGTH_BIAS');
    expect(hit).toBeDefined();
    expect(hit?.severity).toBe('reject');
    expect(report.lengthBias.longestShare).toBeGreaterThan(LENGTH_SHARE_REJECT_MAX);
  });

  it('clave sistemáticamente más corta -> también LENGTH_BIAS de rechazo (ambas direcciones)', () => {
    const items = G49_SANE_SEQUENCE.map((correctId) => {
      const texts = {
        A: 'una opción incorrecta bastante larga y elaborada',
        B: 'una opción incorrecta bastante larga y elaborada',
        C: 'una opción incorrecta bastante larga y elaborada',
        D: 'una opción incorrecta bastante larga y elaborada',
      } as Record<'A' | 'B' | 'C' | 'D', string>;
      texts[correctId] = 'corta';
      return makeItemWithOptionTexts(correctId, texts);
    });
    const report = analyzeLot(items);
    expect(report.ok).toBe(false);
    expect(report.violations.some((v) => v.code === 'LENGTH_BIAS')).toBe(true);
    expect(report.lengthBias.shortestShare).toBeGreaterThan(LENGTH_SHARE_REJECT_MAX);
  });

  it('longitudes parejas entre clave y distractores -> sin LENGTH_BIAS (caso sano, G49)', () => {
    // Mismas letras (balanceadas, no periódicas) y las 4 opciones con
    // longitud EXACTAMENTE igual (difieren solo en el último carácter) para
    // que no haya correlación accidental entre la letra y su longitud fija
    // -- el caso real de G49, que sí pasó sin advertencia.
    const items = G49_SANE_SEQUENCE.map((correctId) =>
      makeItemWithOptionTexts(correctId, {
        A: 'una opción de longitud pareja A',
        B: 'una opción de longitud pareja B',
        C: 'una opción de longitud pareja C',
        D: 'una opción de longitud pareja D',
      }),
    );
    const report = analyzeLot(items);
    expect(report.violations.filter((v) => v.code === 'LENGTH_BIAS')).toHaveLength(0);
    expect(report.lengthBias.longestShare).toBeLessThanOrEqual(LENGTH_SHARE_WARN_MAX);
    expect(report.lengthBias.shortestShare).toBeLessThanOrEqual(LENGTH_SHARE_WARN_MAX);
  });

  it('lote pequeño (< 20) con sesgo total de longitud NO dispara LENGTH_BIAS (muestra insuficiente)', () => {
    const items = Array.from({ length: 4 }, (_, i) =>
      makeItemWithOptionTexts((['A', 'B', 'C', 'D'] as const)[i], {
        A: i === 0 ? 'la opción correcta es mucho más larga que el resto' : 'corta',
        B: i === 1 ? 'la opción correcta es mucho más larga que el resto' : 'corta',
        C: i === 2 ? 'la opción correcta es mucho más larga que el resto' : 'corta',
        D: i === 3 ? 'la opción correcta es mucho más larga que el resto' : 'corta',
      }),
    );
    const report = analyzeLot(items);
    expect(report.violations.filter((v) => v.code === 'LENGTH_BIAS')).toHaveLength(0);
    expect(items.length).toBeLessThan(LENGTH_BIAS_MIN_LOT_SIZE);
  });

  it('reproduce el hallazgo real de G76: lote de Inglés UNAM (40 ítems, orden real de inserción)', () => {
    // Secuencia y longitudes reconstruidas de backups/content-bank.json (createdAt real
    // de inserción) para el pool UNAM:INGLES de G75/G76 — ver docs/ESTADO.md §G76.6.
    // longestShare medido aquí: 50% (estrictamente "más larga que las 3", empates aparte)
    // — por encima de LENGTH_SHARE_REJECT_MAX incluso con la definición estricta.
    const englishCorrectSequence = 'ABCDBCDABCDAABCBABCDABCDABCDABCDABCDABCD'.split('') as Array<
      'A' | 'B' | 'C' | 'D'
    >;
    // Longitudes representativas del patrón real: en lectura/vocabulario la clave trae
    // los matices completos ("...aunque todavía tiene limitaciones") y los distractores
    // se despachan en media línea (docs/ESTADO.md §G76.6a).
    const items = englishCorrectSequence.map((correctId) => {
      const texts = { A: 'distractor breve', B: 'distractor breve', C: 'distractor breve', D: 'distractor breve' } as Record<
        'A' | 'B' | 'C' | 'D',
        string
      >;
      texts[correctId] = 'la clave con todos los matices necesarios para ser inequívocamente correcta';
      return makeItemWithOptionTexts(correctId, texts);
    });
    const report = analyzeLot(items);
    expect(report.ok).toBe(false);
    expect(report.violations.some((v) => v.code === 'LENGTH_BIAS')).toBe(true);
  });
});

describe('analyzeLot — patrón de orden predecible (G77)', () => {
  it('ciclo exacto A,B,C,D repetido 3 veces (12 ítems) -> ORDER_PATTERN de rechazo (caso real G76)', () => {
    const cycle: Array<'A' | 'B' | 'C' | 'D'> = ['A', 'B', 'C', 'D'];
    const items = Array.from({ length: 12 }, (_, i) => makeItem(cycle[i % 4]));
    const report = analyzeLot(items);
    expect(report.ok).toBe(false);
    const hit = report.violations.find((v) => v.code === 'ORDER_PATTERN');
    expect(hit).toBeDefined();
    expect(hit?.severity).toBe('reject');
    expect(report.orderPatterns.some((p) => p.period === 4)).toBe(true);
  });

  it('2 ciclos completos (8 ítems) NO alcanzan ORDER_PATTERN_MIN_CYCLES=3 -> sin violación', () => {
    const cycle: Array<'A' | 'B' | 'C' | 'D'> = ['A', 'B', 'C', 'D'];
    expect(ORDER_PATTERN_MIN_CYCLES).toBe(3);
    const items = Array.from({ length: 8 }, (_, i) => makeItem(cycle[i % 4]));
    const report = analyzeLot(items);
    expect(report.violations.filter((v) => v.code === 'ORDER_PATTERN')).toHaveLength(0);
  });

  it('patrón alternante A,B,A,B,... (período 2, 6 ítems) -> ORDER_PATTERN de rechazo', () => {
    const pattern: Array<'A' | 'B' | 'C' | 'D'> = ['A', 'B', 'A', 'B', 'A', 'B'];
    const items = pattern.map((id) => makeItem(id));
    const report = analyzeLot(items);
    expect(report.ok).toBe(false);
    expect(report.orderPatterns.some((p) => p.period === 2)).toBe(true);
  });

  it('reproduce el hallazgo real de G76: gramática + vocabulario concatenados (24 ítems) marca un solo bloque período-4', () => {
    // Orden real de inserción (createdAt) de docs/ESTADO.md §G76.6b: gramática
    // (ítems 17-28 del lote completo) seguida de vocabulario (29-40), ambos
    // A,B,C,D,A,B,C,D,A,B,C,D — el mismo ciclo, así que la racha detectada
    // abarca los 24 ítems como un bloque continuo.
    const grammarAndVocab = 'ABCDABCDABCDABCDABCDABCD'.split('') as Array<'A' | 'B' | 'C' | 'D'>;
    const items = grammarAndVocab.map((id) => makeItem(id));
    const report = analyzeLot(items);
    expect(report.ok).toBe(false);
    const hit = report.orderPatterns.find((p) => p.period === 4);
    expect(hit).toBeDefined();
    expect(hit?.startItem).toBe(1);
    expect(hit?.endItem).toBe(24);
  });

  it('secuencia balanceada y no-periódica (G49, 35 ítems reales) -> sin ORDER_PATTERN (sin falsos positivos)', () => {
    const items = G49_SANE_SEQUENCE.map((id) => makeItem(id));
    const report = analyzeLot(items);
    expect(report.orderPatterns).toHaveLength(0);
    expect(report.violations.filter((v) => v.code === 'ORDER_PATTERN')).toHaveLength(0);
  });

  it('un ítem malformado FUERA de la racha no impide detectarla (se excluye de la secuencia, no aporta hueco)', () => {
    const cycle: Array<'A' | 'B' | 'C' | 'D'> = ['A', 'B', 'C', 'D'];
    const items: LotItem[] = Array.from({ length: 12 }, (_, i) => makeItem(cycle[i % 4]));
    // Un 13er ítem malformado (2 correctas) al final: no debe "diluir" la
    // racha cíclica real de los 12 primeros ni contarse en su secuencia.
    const malformed = makeItem('A');
    malformed.options[1].isCorrect = true;
    items.push(malformed);
    const report = analyzeLot(items);
    expect(report.violations.some((v) => v.code === 'MALFORMED_OPTIONS')).toBe(true);
    const hit = report.orderPatterns.find((p) => p.period === 4);
    expect(hit).toBeDefined();
    expect(hit?.startItem).toBe(1);
    expect(hit?.endItem).toBe(12);
  });
});

describe('analyzeLot — distribuciones informativas', () => {
  it('reporta distribución de formato y dificultad sin bloquear por sí solas', () => {
    const items = [
      makeItem('A', { format: 'PROBLEM_SOLVING', difficulty: 'ADVANCED' }),
      makeItem('B', { format: 'PROBLEM_SOLVING', difficulty: 'ADVANCED' }),
      makeItem('C', { format: 'PROBLEM_SOLVING', difficulty: 'ADVANCED' }),
      makeItem('D', { format: 'PROBLEM_SOLVING', difficulty: 'ADVANCED' }),
    ];
    const report = analyzeLot(items);
    expect(report.formatDistribution).toEqual({ PROBLEM_SOLVING: 4 });
    expect(report.difficultyDistribution).toEqual({ ADVANCED: 4 });
    expect(report.ok).toBe(true);
  });
});
