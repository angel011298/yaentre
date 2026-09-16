import { describe, it, expect } from 'vitest';
import {
  analyzeLot,
  binomialUpperTail,
  topicLabelFromFilename,
  POSITION_SKEW_MIN_LOT_SIZE,
  LENGTH_BIAS_MIN_LOT_SIZE,
  LENGTH_SHARE_WARN_MAX,
  LENGTH_SHARE_REJECT_MAX,
  LENGTH_BIAS_SUBGROUP_MIN_SIZE,
  LENGTH_BIAS_SUBGROUP_P_WARN_MAX,
  LENGTH_BIAS_SUBGROUP_P_REJECT_MAX,
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

describe('binomialUpperTail — cola exacta P(X >= k | Binomial(n, 0.25))', () => {
  it('reproduce al decimal los p-valores que G94 calculó a mano contra el lote real de G93', () => {
    // docs/ESTADO.md §G94.6 — tabla "Tema | clave = la más larga | P(>=k|azar 25%)"
    expect(binomialUpperTail(6, 8, 0.25)).toBeCloseTo(0.0042266845703125, 10); // Comprensión lectora 6/8 = 0.42%
    expect(binomialUpperTail(2, 5, 0.25)).toBeCloseTo(0.3671875, 10); // Ortografía/Morfosintaxis/Lit. medieval 2/5 = 36.7%
    expect(binomialUpperTail(1, 3, 0.25)).toBeCloseTo(0.578125, 10); // Semántica 1/3 = 57.8%
    expect(binomialUpperTail(3, 9, 0.25)).toBeCloseTo(0.399322509765625, 10); // Redacción de textos 3/9 = 39.9%
    expect(binomialUpperTail(0, 5, 0.25)).toBe(1); // Literatura moderna 0/5 = 100%
    expect(binomialUpperTail(16, 40, 0.25)).toBeCloseTo(0.026244884083743814, 10); // Lote completo 16/40 = 2.62%
  });

  it('k<=0 -> 1 (todo es "al menos 0 aciertos"); k>n -> 0 (imposible)', () => {
    expect(binomialUpperTail(0, 10, 0.25)).toBe(1);
    expect(binomialUpperTail(-1, 10, 0.25)).toBe(1);
    expect(binomialUpperTail(11, 10, 0.25)).toBe(0);
  });

  it('a mayor n, el mismo 100% de aciertos es más improbable (el "margen" de muestra chica sale de la aritmética)', () => {
    const p3 = binomialUpperTail(3, 3, 0.25); // 1.5625%
    const p4 = binomialUpperTail(4, 4, 0.25); // 0.39%
    expect(p3).toBeCloseTo(0.015625, 10);
    expect(p4).toBeCloseTo(0.00390625, 10);
    expect(p4).toBeLessThan(p3);
  });
});

describe('topicLabelFromFilename — G95', () => {
  it('quita extensión y prefijo numérico de orden', () => {
    expect(topicLabelFromFilename('7-comprension-lectora.json')).toBe('comprension-lectora');
    expect(topicLabelFromFilename('/a/b/2-morfosintaxis.json')).toBe('morfosintaxis');
    expect(topicLabelFromFilename('C:\\lote\\1-ortografia-puntuacion.json')).toBe('ortografia-puntuacion');
  });

  it('sin prefijo numérico, deja el nombre tal cual (menos extensión)', () => {
    expect(topicLabelFromFilename('semantica.json')).toBe('semantica');
  });
});

describe('analyzeLot — LENGTH_BIAS_SUBGROUP (G95): sesgo concentrado que el promedio del lote esconde', () => {
  /** Reactivo con las 4 opciones de igual longitud (ninguna cuenta como más
   *  larga/corta — ties no cuentan) o, si `markLongest`, con la clave mucho
   *  más larga que las 3 incorrectas (todas iguales entre sí). */
  function makeLengthFlaggedItem(
    correctId: 'A' | 'B' | 'C' | 'D',
    markLongest: boolean,
    topic: string,
  ): LotItem {
    const even = 'x'.repeat(20);
    const long = 'x'.repeat(60);
    const texts = { A: even, B: even, C: even, D: even } as Record<'A' | 'B' | 'C' | 'D', string>;
    if (markLongest) texts[correctId] = long;
    return { ...makeItemWithOptionTexts(correctId, texts), topic };
  }

  /**
   * Reconstruye, en forma sintética, el reparto POR TEMA que G94 midió en el
   * lote real de G93 (docs/ESTADO.md §G94.6): 40 reactivos, la clave es la
   * "más larga" en exactamente 16 (40.0% del lote completo — el mismo
   * número que G93 reportó y que G94 confirmó al decimal), pero esos 16 NO
   * están repartidos: 6 de los 8 de "Comprensión lectora" (75%, p=0.42%),
   * el resto entre 0% y 40% en los otros temas (p entre 36.7% y 100%).
   * Semántica queda con solo 3 reactivos — por debajo de
   * LENGTH_BIAS_SUBGROUP_MIN_SIZE=4, así que ni siquiera se evalúa.
   */
  const TOPIC_PLAN: { topic: string; n: number; longest: number }[] = [
    { topic: 'Comprensión lectora', n: 8, longest: 6 },
    { topic: 'Ortografía y puntuación', n: 5, longest: 2 },
    { topic: 'Morfosintaxis', n: 5, longest: 2 },
    { topic: 'Literatura medieval', n: 5, longest: 2 },
    { topic: 'Redacción de textos', n: 9, longest: 3 },
    { topic: 'Literatura moderna', n: 5, longest: 0 },
    { topic: 'Semántica', n: 3, longest: 1 },
  ];

  function buildG93LikeLot(): LotItem[] {
    const letters: Array<'A' | 'B' | 'C' | 'D'> = ['A', 'B', 'C', 'D'];
    let letterCursor = 0;
    const items: LotItem[] = [];
    for (const { topic, n, longest } of TOPIC_PLAN) {
      for (let i = 0; i < n; i++) {
        const correctId = letters[letterCursor % 4];
        letterCursor++;
        items.push(makeLengthFlaggedItem(correctId, i < longest, topic));
      }
    }
    return items;
  }

  it('RED DEMOSTRADO: el chequeo de LOTE COMPLETO no rechaza (solo advierte) el caso donde SUBGROUP sí debe rechazar', () => {
    const items = buildG93LikeLot();
    expect(items).toHaveLength(40);
    const report = analyzeLot(items);

    // Confirma que el escenario reproduce el 40.0% exacto de G93/G94 a nivel de lote.
    expect(report.lengthBias.longestShare).toBeCloseTo(0.4, 10);

    // El chequeo de LOTE COMPLETO (aun ya corregido a `>=` en esta fase) solo
    // llega a WARN con 40.0% — no alcanza LENGTH_SHARE_REJECT_MAX (45%).
    // Esto es lo que un chequeo de puro promedio deja pasar sin bloquear.
    const lotLevelHits = report.violations.filter((v) => v.code === 'LENGTH_BIAS');
    expect(lotLevelHits.some((v) => v.severity === 'reject')).toBe(false);
    expect(lotLevelHits.some((v) => v.severity === 'warn')).toBe(true);

    // El chequeo por SUBGRUPO sí encuentra el problema real y RECHAZA el lote.
    const subgroupRejects = report.violations.filter(
      (v) => v.code === 'LENGTH_BIAS_SUBGROUP' && v.severity === 'reject',
    );
    expect(subgroupRejects.length).toBeGreaterThan(0);
    expect(subgroupRejects.some((v) => v.detail.includes('Comprensión lectora'))).toBe(true);
    expect(report.ok).toBe(false); // el lote completo queda RECHAZADO gracias al subgrupo

    // La estadística del subgrupo problemático coincide con el hallazgo real de G94.
    const compLectora = report.lengthBiasSubgroups.find(
      (s) => s.dimension === 'topic' && s.key === 'Comprensión lectora',
    );
    expect(compLectora).toBeDefined();
    expect(compLectora?.sampleSize).toBe(8);
    expect(compLectora?.longestCount).toBe(6);
    expect(compLectora?.pValueLongest).toBeCloseTo(0.0042266845703125, 8);
  });

  it('los subgrupos sanos (p >= 5%) no generan ni advertencia ni rechazo', () => {
    const items = buildG93LikeLot();
    const report = analyzeLot(items);
    const ortografia = report.lengthBiasSubgroups.find(
      (s) => s.dimension === 'topic' && s.key === 'Ortografía y puntuación',
    );
    expect(ortografia?.pValueLongest).toBeGreaterThan(LENGTH_BIAS_SUBGROUP_P_WARN_MAX);
    expect(
      report.violations.some(
        (v) => v.code === 'LENGTH_BIAS_SUBGROUP' && v.detail.includes('Ortografía y puntuación'),
      ),
    ).toBe(false);
  });

  it('un subgrupo por debajo de LENGTH_BIAS_SUBGROUP_MIN_SIZE se omite aunque su % sea alto (Semántica, n=3)', () => {
    const items = buildG93LikeLot();
    expect(LENGTH_BIAS_SUBGROUP_MIN_SIZE).toBe(4);
    const report = analyzeLot(items);
    expect(
      report.lengthBiasSubgroups.some((s) => s.dimension === 'topic' && s.key === 'Semántica'),
    ).toBe(false);
  });

  it('sin `topic` en los ítems, la dimensión "topic" no se evalúa — solo "format" (que aquí no aísla el problema)', () => {
    const items = buildG93LikeLot().map(({ topic: _topic, ...rest }) => rest);
    const report = analyzeLot(items);
    expect(report.lengthBiasSubgroups.some((s) => s.dimension === 'topic')).toBe(false);
    // El caso sintético usa un solo formato (MULTIPLE_CHOICE) para las 4 opciones,
    // así que agrupar por formato solo reproduce las cifras del lote completo
    // (40.0%, p=2.62%) y NO aísla el 75% real de comprensión lectora — la razón
    // por la que agrupar por TEMA es indispensable para este hallazgo (G94/G95).
    const byFormat = report.lengthBiasSubgroups.find((s) => s.dimension === 'format');
    expect(byFormat?.sampleSize).toBe(40);
    expect(byFormat?.longestCount).toBe(16);
  });

  it('umbral WARN (5%) vs REJECT (1%): un subgrupo entre ambos advierte sin rechazar', () => {
    // n=6, k=4 -> p = P(X>=4|n=6,p=.25) ≈ 3.30% -- entre 1% y 5%.
    const items: LotItem[] = [];
    const letters: Array<'A' | 'B' | 'C' | 'D'> = ['A', 'B', 'C', 'D', 'A', 'B'];
    for (let i = 0; i < 6; i++) {
      items.push(makeLengthFlaggedItem(letters[i], i < 4, 'Tema de prueba'));
    }
    const report = analyzeLot(items);
    const stat = report.lengthBiasSubgroups.find((s) => s.key === 'Tema de prueba' && s.dimension === 'topic');
    expect(stat?.pValueLongest).toBeGreaterThan(LENGTH_BIAS_SUBGROUP_P_REJECT_MAX);
    expect(stat?.pValueLongest).toBeLessThan(LENGTH_BIAS_SUBGROUP_P_WARN_MAX);
    const hit = report.violations.find(
      (v) => v.code === 'LENGTH_BIAS_SUBGROUP' && v.detail.includes('Tema de prueba'),
    );
    expect(hit?.severity).toBe('warn');
  });
});

describe('analyzeLot — LENGTH_BIAS de lote completo: `>=` en vez de `>` (G95)', () => {
  it('un lote EXACTAMENTE en 40.0% ahora SÍ advierte (antes pasaba silencioso — caso real de G93)', () => {
    // 40 ítems, exactamente 16 con la clave más larga (40.0% al decimal, la
    // misma cifra que G93 reportó y que antes de G95 no disparaba nada
    // porque el chequeo comparaba con `>` estricto.
    const items = Array.from({ length: 40 }, (_, i) => {
      const correctId = (['A', 'B', 'C', 'D'] as const)[i % 4];
      const even = 'x'.repeat(20);
      const long = 'x'.repeat(60);
      const texts = { A: even, B: even, C: even, D: even } as Record<'A' | 'B' | 'C' | 'D', string>;
      if (i < 16) texts[correctId] = long;
      return makeItemWithOptionTexts(correctId, texts);
    });
    const report = analyzeLot(items);
    expect(report.lengthBias.longestShare).toBeCloseTo(0.4, 10);
    const hit = report.violations.find((v) => v.code === 'LENGTH_BIAS' && v.severity === 'warn');
    expect(hit).toBeDefined();
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
