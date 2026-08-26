import { describe, it, expect } from 'vitest';
import {
  buildBlindItem,
  shuffleOptionsForQuestion,
  translateChosenOption,
  isCalcSubject,
  VerifierAnswerSchema,
  VERIFIER_MODEL_TIER,
  AUDIT_MODEL_TIER,
  type StoredOption,
} from '../../scripts/lib/blind-verification';

/**
 * CRITERIO DE ACEPTACIÓN G2: el lote ciego (lo que lee la sesión
 * verificadora, SEPARADA de la que compuso el reactivo) NUNCA contiene
 * `isCorrect` ni `explanations`. Reemplaza a tests/scripts/verifier-payload.test.ts
 * (retirado junto con verifier.ts, que llamaba a la API de pago).
 */

const SECRET_EXPLANATION = 'EXPLICACION_SECRETA_QUE_REVELA_LA_RESPUESTA';

const options: StoredOption[] = [
  { id: 'A', text: '54', isCorrect: false },
  { id: 'B', text: '56', isCorrect: true },
  { id: 'C', text: '58', isCorrect: false, imageUrl: 'https://example.com/c.png' },
  { id: 'D', text: '64', isCorrect: false },
];

// Draft "rico" tal como vive en la DB (con isCorrect y explicaciones) — el
// mismo tipo de objeto de entrada que un draft real tendría, para probar que
// buildBlindItem los excluye por construcción, no por convención.
const question = {
  id: 'q_test_123',
  stem: '¿Cuánto es $7 \\times 8$?',
  options,
  format: 'PROBLEM_SOLVING',
  passageContent: null,
  // Campos que NUNCA deben aparecer en el payload — presentes aquí para
  // confirmar que buildBlindItem los ignora (selección explícita de campos).
  explanations: [
    { layer: 1, title: 'Por qué B', content: SECRET_EXPLANATION },
    { layer: 2, title: 'Repaso', content: 'La multiplicación es suma repetida' },
  ],
};

const ctx = { subject: 'Matemáticas', topic: 'Aritmética', institution: 'UNAM' };

describe('blind-verification: el lote ciego jamás contiene isCorrect ni explanations', () => {
  const item = buildBlindItem(question, ctx);
  const serialized = JSON.stringify(item);

  it('el ítem serializado no contiene isCorrect en ninguna forma', () => {
    expect(serialized).not.toContain('isCorrect');
    expect(serialized.toLowerCase()).not.toContain('iscorrect');
  });

  it('el ítem no contiene explicaciones (ni el campo ni su contenido)', () => {
    expect(serialized).not.toContain('explanations');
    expect(serialized).not.toContain('explanation');
    expect(serialized).not.toContain(SECRET_EXPLANATION);
    expect(serialized).not.toContain('suma repetida');
  });

  it('estructuralmente: BlindBatchItem solo tiene los campos de sustentante', () => {
    expect(Object.keys(item).sort()).toEqual(
      [
        'questionId',
        'institution',
        'subject',
        'topic',
        'format',
        'passage',
        'requiresCalculation',
        'stem',
        'options',
      ].sort(),
    );
    for (const option of item.options) {
      expect(Object.keys(option).sort()).toEqual(['label', 'text', 'imageUrl'].sort());
    }
  });

  it('sí conserva lo que el sustentante DEBE ver (stem, opciones, imagen)', () => {
    expect(item.stem).toContain('7 \\times 8');
    expect(item.options).toHaveLength(4);
    expect(item.options.some((o) => o.imageUrl === 'https://example.com/c.png')).toBe(true);
    expect(item.format).toBe('PROBLEM_SOLVING');
  });

  it('detecta materias de cálculo para requiresCalculation', () => {
    expect(item.requiresCalculation).toBe(true);
    const nonCalc = buildBlindItem(question, { ...ctx, subject: 'Historia de México' });
    expect(nonCalc.requiresCalculation).toBe(false);
  });
});

describe('blind-verification: mezclado determinista y traducción de vuelta', () => {
  it('el mismo questionId siempre produce el mismo orden mezclado', () => {
    const a = shuffleOptionsForQuestion('q1', options);
    const b = shuffleOptionsForQuestion('q1', options);
    expect(a).toEqual(b);
  });

  it('ids distintos típicamente producen órdenes distintos (no determinista por posición fija)', () => {
    const a = shuffleOptionsForQuestion('q1', options).map((o) => o.originalId);
    const b = shuffleOptionsForQuestion('q2', options).map((o) => o.originalId);
    expect(a).not.toEqual(b);
  });

  it('el mezclado nunca revela isCorrect (el tipo de salida no lo tiene)', () => {
    const shuffled = shuffleOptionsForQuestion('q1', options);
    for (const o of shuffled) {
      expect(Object.keys(o)).not.toContain('isCorrect');
    }
  });

  it('translateChosenOption recupera el id ORIGINAL de la opción correcta tras el mezclado', () => {
    const shuffled = shuffleOptionsForQuestion('q_test_123', options);
    const correctLabel = shuffled.find((o) => o.originalId === 'B')!.label;
    const translated = translateChosenOption('q_test_123', options, correctLabel);
    expect(translated).toBe('B');
  });

  it('round-trip: cualquier letra elegida se traduce de vuelta a su id original correcto', () => {
    for (const label of ['A', 'B', 'C', 'D'] as const) {
      const shuffled = shuffleOptionsForQuestion('qX', options);
      const originalFromShuffle = shuffled.find((o) => o.label === label)!.originalId;
      expect(translateChosenOption('qX', options, label)).toBe(originalFromShuffle);
    }
  });
});

describe('blind-verification: schema de respuesta de la sesión verificadora', () => {
  it('acepta una respuesta bien formada', () => {
    const result = VerifierAnswerSchema.safeParse({
      questionId: 'q1',
      chosenOption: 'B',
      confidence: 0.95,
      reasoning: 'porque sí',
      problems: [],
    });
    expect(result.success).toBe(true);
  });

  it('rechaza confidence fuera de [0,1] y chosenOption fuera de A-D', () => {
    expect(
      VerifierAnswerSchema.safeParse({ questionId: 'q1', chosenOption: 'B', confidence: 1.5 }).success,
    ).toBe(false);
    expect(
      VerifierAnswerSchema.safeParse({ questionId: 'q1', chosenOption: 'E', confidence: 0.9 }).success,
    ).toBe(false);
  });

  it('reasoning, problems, usedCalculation y model son opcionales con default', () => {
    const result = VerifierAnswerSchema.parse({ questionId: 'q1', chosenOption: 'A', confidence: 0.9 });
    expect(result.reasoning).toBe('');
    expect(result.problems).toEqual([]);
    expect(result.usedCalculation).toBe(false);
    expect(result.model).toBe(VERIFIER_MODEL_TIER);
  });

  it('preserva el modelo real declarado por la sesión verificadora en vez del default', () => {
    const result = VerifierAnswerSchema.parse({
      questionId: 'q1',
      chosenOption: 'A',
      confidence: 0.9,
      model: 'claude-opus-5',
    });
    expect(result.model).toBe('claude-opus-5');
  });
});

describe('blind-verification: tiers de modelo (documentación, nunca API)', () => {
  it('verificador y auditor son tiers distintos', () => {
    expect(VERIFIER_MODEL_TIER).not.toBe(AUDIT_MODEL_TIER);
  });

  it('detecta materias de cálculo (con y sin acentos)', () => {
    expect(isCalcSubject('Matemáticas')).toBe(true);
    expect(isCalcSubject('Matematicas Aplicadas')).toBe(true);
    expect(isCalcSubject('Física')).toBe(true);
    expect(isCalcSubject('Química')).toBe(true);
    expect(isCalcSubject('Historia de México')).toBe(false);
    expect(isCalcSubject('Español')).toBe(false);
  });
});
