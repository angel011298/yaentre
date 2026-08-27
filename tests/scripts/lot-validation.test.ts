import { describe, it, expect } from 'vitest';
import {
  analyzeLot,
  POSITION_SKEW_MIN_LOT_SIZE,
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
