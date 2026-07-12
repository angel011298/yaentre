import { describe, it, expect } from 'vitest';
import {
  validateDraft,
  normalizeStem,
  extractInlineLatex,
  validateLatexFragment,
  DIFFICULTY_LEVELS,
} from '../../scripts/lib/question-draft-schema';
import { parseModelOutput } from '../../scripts/lib/parse-model-output';

/** Fábrica de un reactivo válido; cada test lo muta para probar un fallo. */
function validDraft() {
  return {
    stem: '¿Cuánto es $2 + 2$?',
    options: [
      { id: 'A', text: '$3$', isCorrect: false },
      { id: 'B', text: '$4$', isCorrect: true },
      { id: 'C', text: '$5$', isCorrect: false },
      { id: 'D', text: '$6$', isCorrect: false },
    ],
    difficulty: 'BASIC',
    explanations: [
      { layer: 1, title: 'Suma', content: 'Dos más dos es cuatro.', latexContent: null },
      {
        layer: 2,
        title: 'Paso a paso',
        content: 'Sumamos las unidades.',
        latexContent: '2 + 2 = 4',
      },
      { layer: 3, title: 'Concepto', content: 'La adición.', latexContent: null },
    ],
  };
}

describe('validateDraft — casos válidos', () => {
  it('acepta un reactivo bien formado', () => {
    const result = validateDraft(validDraft());
    expect(result.ok).toBe(true);
  });

  it('acepta los cinco niveles de dificultad', () => {
    for (const difficulty of DIFFICULTY_LEVELS) {
      const result = validateDraft({ ...validDraft(), difficulty });
      expect(result.ok).toBe(true);
    }
  });

  it('acepta latexContent nulo o ausente en la capa 2', () => {
    const draft = validDraft();
    draft.explanations[1].latexContent = null;
    expect(validateDraft(draft).ok).toBe(true);
  });
});

describe('validateDraft — opciones', () => {
  it('rechaza si hay 0 opciones correctas', () => {
    const draft = validDraft();
    draft.options.forEach((o) => (o.isCorrect = false));
    const result = validateDraft(draft);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => /exactamente 1 opción correcta/i.test(e))).toBe(true);
    }
  });

  it('rechaza si hay 2 opciones correctas', () => {
    const draft = validDraft();
    draft.options[0].isCorrect = true; // ahora A y B correctas
    const result = validateDraft(draft);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => /exactamente 1 opción correcta/i.test(e))).toBe(true);
    }
  });

  it('rechaza si hay menos de 4 opciones', () => {
    const draft = validDraft();
    draft.options = draft.options.slice(0, 3);
    const result = validateDraft(draft);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => /exactamente 4 opciones/i.test(e))).toBe(true);
    }
  });

  it('rechaza una opción con texto vacío', () => {
    const draft = validDraft();
    draft.options[2].text = '   ';
    const result = validateDraft(draft);
    expect(result.ok).toBe(false);
  });

  it('rechaza ids de opción duplicados', () => {
    const draft = validDraft();
    draft.options[3].id = 'A';
    const result = validateDraft(draft);
    expect(result.ok).toBe(false);
  });
});

describe('validateDraft — explicaciones', () => {
  it('rechaza si falta una capa', () => {
    const draft = validDraft();
    draft.explanations = draft.explanations.slice(0, 2); // solo 1 y 2
    const result = validateDraft(draft);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => /capas 1, 2 y 3/i.test(e))).toBe(true);
    }
  });

  it('rechaza contenido de explicación vacío', () => {
    const draft = validDraft();
    draft.explanations[0].content = '';
    const result = validateDraft(draft);
    expect(result.ok).toBe(false);
  });

  it('rechaza capas duplicadas (1,1,2 en vez de 1,2,3)', () => {
    const draft = validDraft();
    draft.explanations[2].layer = 1;
    const result = validateDraft(draft);
    expect(result.ok).toBe(false);
  });
});

describe('validateDraft — dificultad', () => {
  it('rechaza un valor de dificultad inválido', () => {
    const draft = { ...validDraft(), difficulty: 'MEDIUM' };
    const result = validateDraft(draft);
    expect(result.ok).toBe(false);
  });
});

describe('validateDraft — LaTeX', () => {
  it('rechaza LaTeX malformado en el stem', () => {
    const draft = validDraft();
    draft.stem = 'Resuelve $\\frac{1}{$'; // llave sin cerrar / fracción incompleta
    const result = validateDraft(draft);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => /LaTeX inválido/i.test(e))).toBe(true);
    }
  });

  it('rechaza LaTeX malformado en latexContent', () => {
    const draft = validDraft();
    draft.explanations[1].latexContent = '\\frac{1'; // fracción incompleta
    const result = validateDraft(draft);
    expect(result.ok).toBe(false);
  });

  it('acepta LaTeX bien formado', () => {
    expect(validateLatexFragment('\\frac{a}{b} + \\sqrt{x}')).toBeNull();
  });

  it('reporta error en LaTeX inválido', () => {
    expect(validateLatexFragment('\\frac{1}')).not.toBeNull();
  });
});

describe('extractInlineLatex', () => {
  it('extrae fragmentos entre $...$', () => {
    expect(extractInlineLatex('El valor $x^2$ y también $y_1$.')).toEqual([
      'x^2',
      'y_1',
    ]);
  });

  it('ignora texto sin LaTeX', () => {
    expect(extractInlineLatex('Sin fórmulas aquí.')).toEqual([]);
  });
});

describe('normalizeStem (dedupe)', () => {
  it('normaliza acentos, mayúsculas y espacios', () => {
    expect(normalizeStem('¿Cuánto  es 2+2?')).toBe(normalizeStem('cuanto es 2+2'));
  });

  it('distingue enunciados diferentes', () => {
    expect(normalizeStem('¿Cuánto es 2+2?')).not.toBe(normalizeStem('¿Cuánto es 3+3?'));
  });
});

describe('parseModelOutput', () => {
  it('parsea un array JSON limpio', () => {
    const result = parseModelOutput('[{"a":1}]');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.items).toHaveLength(1);
  });

  it('parsea un array envuelto en cercas markdown', () => {
    const result = parseModelOutput('```json\n[{"a":1},{"b":2}]\n```');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.items).toHaveLength(2);
  });

  it('recupera el array aunque haya texto alrededor', () => {
    const result = parseModelOutput('Aquí tienes:\n[{"a":1}]\nEspero que ayude.');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.items).toHaveLength(1);
  });

  it('envuelve un objeto suelto en un array', () => {
    const result = parseModelOutput('{"a":1}');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.items).toHaveLength(1);
  });

  it('falla con texto sin JSON', () => {
    const result = parseModelOutput('No pude generar nada.');
    expect(result.ok).toBe(false);
  });
});
