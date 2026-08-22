import { describe, it, expect } from 'vitest';
import {
  validateDraft,
  QUESTION_FORMATS,
} from '../../scripts/lib/question-draft-schema';

/** F2: el contrato Zod acepta format por reactivo e imageUrl por opción. */

const baseDraft = {
  stem: 'Enunciado de prueba',
  options: [
    { id: 'A', text: 'a', isCorrect: true },
    { id: 'B', text: 'b', isCorrect: false },
    { id: 'C', text: 'c', isCorrect: false },
    { id: 'D', text: 'd', isCorrect: false },
  ],
  difficulty: 'INTERMEDIATE',
  explanations: [
    { layer: 1, title: 't1', content: 'c1' },
    { layer: 2, title: 't2', content: 'c2' },
    { layer: 3, title: 't3', content: 'c3' },
  ],
};

describe('QuestionDraft: format (F2)', () => {
  it('sin format → default MULTIPLE_CHOICE (compat con corpus few-shot)', () => {
    const r = validateDraft(baseDraft);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.draft.format).toBe('MULTIPLE_CHOICE');
  });

  it('acepta los 12 formatos del enum (incl. los 10 requeridos por F2)', () => {
    expect(QUESTION_FORMATS).toContain('SENTENCE_COMPLETION');
    expect(QUESTION_FORMATS).toContain('ANALOGY');
    expect(QUESTION_FORMATS).toContain('ORDERING');
    expect(QUESTION_FORMATS).toContain('NUMERIC_SERIES');
    expect(QUESTION_FORMATS).toContain('PROBLEM_SOLVING');
    expect(QUESTION_FORMATS).toContain('SPATIAL_SERIES');
    expect(QUESTION_FORMATS).toContain('SPATIAL_IMAGINATION');
    for (const format of QUESTION_FORMATS) {
      const r = validateDraft({ ...baseDraft, format });
      expect(r.ok).toBe(true);
    }
  });

  it('rechaza un formato desconocido', () => {
    const r = validateDraft({ ...baseDraft, format: 'ENSAYO_LIBRE' });
    expect(r.ok).toBe(false);
  });
});

describe('QuestionDraft: imageUrl por opción (F2)', () => {
  it('acepta imageUrl válida por opción y la conserva', () => {
    const withImages = {
      ...baseDraft,
      format: 'SPATIAL_SERIES',
      options: baseDraft.options.map((o) => ({
        ...o,
        imageUrl: `https://cdn.yaentre.mx/figuras/${o.id}.svg`,
      })),
    };
    const r = validateDraft(withImages);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.draft.options[0].imageUrl).toBe('https://cdn.yaentre.mx/figuras/A.svg');
    }
  });

  it('sin imageUrl → null (opción de solo texto, camino normal)', () => {
    const r = validateDraft(baseDraft);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.draft.options[0].imageUrl).toBeNull();
  });

  it('rechaza imageUrl que no sea URL', () => {
    const bad = {
      ...baseDraft,
      options: baseDraft.options.map((o, i) =>
        i === 0 ? { ...o, imageUrl: 'no-es-una-url' } : o,
      ),
    };
    const r = validateDraft(bad);
    expect(r.ok).toBe(false);
  });
});
