import { describe, it, expect } from 'vitest';
import {
  buildGroundingBlock,
  resolveCitations,
  type GroundingChunk,
} from '../../scripts/lib/grounding';
import {
  chunkPages,
  isJunkChunk,
  makeExcerpt,
} from '../../scripts/lib/source-scan';
import { validateDraft } from '../../scripts/lib/question-draft-schema';

/** F2b: anclaje estricto en fragmentos fuente + chunking del escáner. */

const chunks: GroundingChunk[] = [
  { id: 'chk_a', text: 'Los números reales incluyen racionales e irracionales…', locationRef: 'p. 12', sourceName: 'guia_ECOEM.pdf' },
  { id: 'chk_b', text: 'La unidad imaginaria i satisface i² = -1…', locationRef: 'p. 13', sourceName: 'guia_ECOEM.pdf' },
];

describe('resolveCitations (anclaje estricto)', () => {
  it('con fragmentos disponibles, exige al menos una cita', () => {
    const r = resolveCitations([], chunks);
    expect(r.ok).toBe(false);
    expect(r.error).toContain('Sin cita');
    const r2 = resolveCitations(undefined, chunks);
    expect(r2.ok).toBe(false);
  });

  it('resuelve índices 1-based a ids de chunk, deduplicando', () => {
    const r = resolveCitations([1, 2, 1], chunks);
    expect(r.ok).toBe(true);
    expect(r.chunkIds).toEqual(['chk_a', 'chk_b']);
  });

  it('rechaza índices fuera de rango (alucinación de fuente)', () => {
    const r = resolveCitations([3], chunks);
    expect(r.ok).toBe(false);
    expect(r.error).toContain('fuera de rango');
    expect(resolveCitations([0], chunks).ok).toBe(false);
  });

  it('sin fragmentos disponibles NO exige citas (TEMARIO_ONLY, no bloquea)', () => {
    const r = resolveCitations([], []);
    expect(r.ok).toBe(true);
    expect(r.chunkIds).toEqual([]);
  });

  it('el draft Zod acepta el campo sourceChunks', () => {
    const draft = {
      stem: 'x',
      options: [
        { id: 'A', text: 'a', isCorrect: true },
        { id: 'B', text: 'b', isCorrect: false },
        { id: 'C', text: 'c', isCorrect: false },
        { id: 'D', text: 'd', isCorrect: false },
      ],
      difficulty: 'BASIC',
      explanations: [
        { layer: 1, title: 't', content: 'c' },
        { layer: 2, title: 't', content: 'c' },
        { layer: 3, title: 't', content: 'c' },
      ],
      sourceChunks: [1, 2],
    };
    const r = validateDraft(draft);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.draft.sourceChunks).toEqual([1, 2]);
  });

  it('el bloque de grounding numera fuentes y exige el campo sourceChunks', () => {
    const block = buildGroundingBlock(chunks);
    expect(block).toContain('[FUENTE 1]');
    expect(block).toContain('[FUENTE 2]');
    expect(block).toContain('p. 12');
    expect(block).toContain('sourceChunks');
  });
});

describe('chunking del escáner', () => {
  const longPara = (seed: string) =>
    `${seed} — La preparación para el examen de admisión requiere dominar los conceptos fundamentales de cada materia del temario oficial, practicar con reactivos similares a los del examen real y repasar sistemáticamente los temas donde el aspirante muestra mayor debilidad. `.repeat(3);

  it('agrupa párrafos por página sin cortar oración por oración', () => {
    const pages = [
      { num: 4, text: `${longPara('Intro')}\n\n${longPara('Desarrollo')}` },
      { num: 5, text: longPara('Cierre') },
    ];
    const result = chunkPages(pages);
    expect(result.length).toBeGreaterThanOrEqual(2);
    expect(result[0].locationRef).toBe('p. 4');
    expect(result.at(-1)?.locationRef).toBe('p. 5');
    for (const c of result) {
      expect(c.text.length).toBeGreaterThan(300);
      expect(c.excerpt.length).toBeLessThanOrEqual(210);
    }
  });

  it('descarta portadas (mayúsculas), índices (líneas→página) y fragmentos cortos', () => {
    expect(isJunkChunk('GUÍA DE ESTUDIO\nUNAM 2027\nCONVOCATORIA OFICIAL')).toBe(true);
    const toc = Array.from({ length: 10 }, (_, i) => `Tema ${i} de estudio ......... ${i + 10}`).join('\n');
    expect(isJunkChunk(toc)).toBe(true);
    expect(isJunkChunk('breve')).toBe(true);
    expect(isJunkChunk(longPara('Contenido real'))).toBe(false);
  });

  it('makeExcerpt corta en frontera de palabra con elipsis', () => {
    const excerpt = makeExcerpt(longPara('Extracto'));
    expect(excerpt.length).toBeLessThanOrEqual(210);
    expect(excerpt.endsWith('…')).toBe(true);
    expect(excerpt).not.toMatch(/\s…$/);
  });
});
