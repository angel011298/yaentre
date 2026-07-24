import { describe, expect, it } from 'vitest';
import { toRunnerQuestion } from '@/lib/db/diagnostic';
import { orderQuestionOptions } from '@/lib/simulator/shuffle';
import { buildSubmitResponse } from '@/lib/sessions/scoring';
import { simulatorSyncSchema } from '@/lib/simulator/schema';

/**
 * LA regla de seguridad más importante del proyecto (F12 tarea 9): el contenido
 * que viaja al navegador por cada reactivo JAMÁS incluye cuál es la opción
 * correcta hasta que la sesión termine.
 *
 * Estos tests interceptan exactamente lo que el servidor SERIALIZA hacia el
 * cliente —usando las mismas funciones que arma el payload real (toRunnerQuestion
 * + orderQuestionOptions) y la respuesta de cada envío (buildSubmitResponse)— y
 * comprueban que la correctitud no cruza el cable. Una prueba de red de extremo
 * a extremo en navegador vive en tests/e2e/simulator.spec.ts; esta es la red de
 * seguridad determinista que corre en cada `pnpm test:unit`.
 */

// Reactivo tal como sale de la DB: la opción B es la correcta.
const dbQuestion = {
  id: 'q_leak',
  stem: '¿Cuál es la capital de México?',
  imageUrl: null,
  format: 'MULTIPLE_CHOICE',
  options: [
    { id: 'A', text: 'Guadalajara', isCorrect: false },
    { id: 'B', text: 'Ciudad de México', isCorrect: true },
    { id: 'C', text: 'Monterrey', isCorrect: false },
    { id: 'D', text: 'Puebla', isCorrect: false },
  ],
  passage: null,
  topic: { id: 't1', name: 'Geografía', subject: { id: 's1', name: 'Geografía' } },
} as unknown as Parameters<typeof toRunnerQuestion>[0];

/** Reproduce el payload EXACTO que el servidor manda por reactivo en el simulador. */
function wireQuestion(shuffle: boolean) {
  const base = toRunnerQuestion(dbQuestion);
  return {
    ...base,
    options: orderQuestionOptions(base.options, {
      enabled: shuffle,
      sessionId: 'sess1',
      questionId: dbQuestion.id,
    }),
  };
}

describe('el reactivo que viaja al cliente no filtra la respuesta correcta', () => {
  for (const shuffle of [false, true]) {
    it(`sin campo isCorrect ni pistas (barajado=${shuffle})`, () => {
      const q = wireQuestion(shuffle);
      const serialized = JSON.stringify(q);

      // Ni la palabra isCorrect, ni el booleano de correctitud, cruzan el cable.
      expect(serialized).not.toContain('isCorrect');
      expect(serialized.toLowerCase()).not.toContain('correct');

      // Cada opción expone SOLO id y texto — nada que delate cuál es la buena.
      for (const opt of q.options) {
        expect(Object.keys(opt).sort()).toEqual(['id', 'text']);
      }

      // Están las 4 opciones (barajar no pierde ni revela por posición).
      expect(q.options).toHaveLength(4);
      expect(new Set(q.options.map((o) => o.id))).toEqual(new Set(['A', 'B', 'C', 'D']));
    });
  }
});

describe('la respuesta de submit en modos de evaluación no revela correctitud', () => {
  it('FULL_SIMULATION devuelve solo { recorded: true }', () => {
    expect(buildSubmitResponse('FULL_SIMULATION', true, 'B')).toEqual({ recorded: true });
    expect(buildSubmitResponse('FULL_SIMULATION', false, 'B')).toEqual({ recorded: true });
  });

  it('DIAGNOSTIC tampoco revela', () => {
    expect(buildSubmitResponse('DIAGNOSTIC', true, 'B')).toEqual({ recorded: true });
  });

  it('control: un modo de práctica (drill) SÍ revela al instante', () => {
    expect(buildSubmitResponse('TOPIC_DRILL', true, 'B')).toEqual({
      recorded: true,
      isCorrect: true,
      correctOption: 'B',
    });
  });
});

describe('el contrato de sincronización cliente→servidor no acepta correctitud', () => {
  it('descarta cualquier isCorrect que un cliente intente inyectar', () => {
    const parsed = simulatorSyncSchema.parse({
      sessionId: 'sess1',
      answers: [
        // isCorrect no es parte del contrato; Zod debe descartarlo al parsear.
        { questionId: 'q_leak', selectedOption: 'A', position: 0, timeSpentSecs: 3, isCorrect: true },
      ],
      integrity: { tabBlurCount: 0, rightClickAttempts: 0, keyboardShortcutAttempts: 0 },
      suspicionEvents: [],
      completedFullscreen: true,
    });
    expect(parsed.answers[0]).not.toHaveProperty('isCorrect');
    expect(JSON.stringify(parsed)).not.toContain('isCorrect');
  });
});
