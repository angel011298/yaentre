import type { PromptContext } from './prompt-loader';

/**
 * Generador mock determinista. Sustituye la llamada a la API de Anthropic
 * cuando se corre con `--mock` (o `--dry-run` sin API key), para poder validar
 * todo el pipeline sin gastar tokens ni depender de la red.
 *
 * Produce reactivos estructuralmente VÁLIDOS (pasan la Etapa 2). El primero de
 * cada lote impar incluye LaTeX para ejercitar la validación KaTeX.
 */
export function mockGenerate(ctx: PromptContext, count: number): unknown[] {
  const items: unknown[] = [];
  for (let i = 0; i < count; i++) {
    const n = i + 1;
    const correctIndex = i % 4; // rota la correcta entre A/B/C/D
    const ids = ['A', 'B', 'C', 'D'];
    const options = ids.map((id, idx) => ({
      id,
      text: `Opción ${id} del reactivo ${n} sobre ${ctx.topic}`,
      isCorrect: idx === correctIndex,
    }));

    items.push({
      stem: `[MOCK ${n}] Reactivo de ejemplo sobre "${ctx.topic}" (${ctx.subject}). ¿Cuál es la opción correcta?`,
      options,
      difficulty: ['BASIC', 'INTERMEDIATE', 'ADVANCED'][i % 3],
      explanations: [
        {
          layer: 1,
          title: 'Por qué la correcta',
          content: `La opción ${ids[correctIndex]} es la correcta para este reactivo mock de ${ctx.topic}.`,
          latexContent: null,
        },
        {
          layer: 2,
          title: 'Paso a paso',
          content:
            'Resolución mock paso a paso. Si elegiste otra opción, revisa el concepto base.',
          latexContent: i % 2 === 0 ? 'x = \\frac{-b}{2a}' : null,
        },
        {
          layer: 3,
          title: 'Concepto base',
          content: `Concepto de fondo del tema ${ctx.topic}. Material mock para validación del pipeline.`,
          latexContent: null,
        },
      ],
    });
  }
  return items;
}

/**
 * Genera un reactivo deliberadamente INVÁLIDO (dos opciones correctas). Útil
 * para el modo `--mock --inject-invalid`: prueba que la Etapa 2 lo rechaza y
 * que NO llega a la DB.
 */
export function mockInvalidDraft(ctx: PromptContext): unknown {
  return {
    stem: `[MOCK INVÁLIDO] Reactivo con dos correctas sobre ${ctx.topic}`,
    options: [
      { id: 'A', text: 'Opción A', isCorrect: true },
      { id: 'B', text: 'Opción B', isCorrect: true },
      { id: 'C', text: 'Opción C', isCorrect: false },
      { id: 'D', text: 'Opción D', isCorrect: false },
    ],
    difficulty: 'INTERMEDIATE',
    explanations: [
      { layer: 1, title: 'x', content: 'x', latexContent: null },
      { layer: 2, title: 'y', content: 'y', latexContent: null },
      { layer: 3, title: 'z', content: 'z', latexContent: null },
    ],
  };
}
