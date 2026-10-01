import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, it, expect } from 'vitest';

import { validateDraft, normalizeStem } from '../../scripts/lib/question-draft-schema';
import { analyzeLot, topicLabelFromFilename, type LotItem } from '../../scripts/lib/lot-validation';
import { fingerprint, lotHash } from '../../scripts/g100/blind-lot';

/**
 * G100: los lotes que REEMPLAZAN a los 70 reactivos anclados a guías CENEVAL.
 * Lo que se fija aquí es lo que, si se rompe, reabre el riesgo de propiedad
 * intelectual: un reemplazo anclado otra vez, una copia del original, un tema
 * sin cobertura uno-a-uno. Todo se calcula leyendo los archivos, no listas
 * escritas a mano (lección G73: nada de listas paralelas que se desincronicen).
 */

const ROOT = resolve('docs/content-batches/g100-ceneval');
const bank = JSON.parse(readFileSync(resolve('backups/content-bank.json'), 'utf8')) as {
  Question: { id: string; stem: string; topicId: string; options: { text: string }[] }[];
};
const anchored = JSON.parse(readFileSync(join(ROOT, 'anchored-70.json'), 'utf8')) as {
  total: number;
  questions: { id: string; topicId: string }[];
};

interface Draft {
  stem: string;
  options: { id: string; text: string; isCorrect: boolean }[];
  sourceChunks: number[];
  passage: { ref: string; title: string | null; content: string } | null;
  explanations: { content: string }[];
  difficulty: string;
  format: string;
}

const lotDirs = readdirSync(ROOT, { withFileTypes: true }).filter((d) => d.isDirectory() && d.name !== 'verification');
const lots = await Promise.all(
  lotDirs.map(async (d) => {
    const dir = join(ROOT, d.name);
    const { TOPICS } = (await import(pathToFileURL(join(dir, 'build-data.mjs')).href)) as {
      TOPICS: { id: string; file: string }[];
    };
    const byTopic = TOPICS.map((t) => ({
      topicId: t.id,
      file: t.file,
      drafts: JSON.parse(readFileSync(join(dir, t.file), 'utf8')) as Draft[],
    }));
    return { name: d.name, byTopic };
  }),
);
const allDrafts = lots.flatMap((l) => l.byTopic.flatMap((t) => t.drafts.map((d) => ({ ...d, topicId: t.topicId, lot: l.name }))));

const words = (s: string) => new Set(normalizeStem(s).split(' ').filter((w) => w.length > 2));
const jaccard = (a: Set<string>, b: Set<string>) => {
  let inter = 0;
  for (const w of a) if (b.has(w)) inter++;
  return inter / (a.size + b.size - inter || 1);
};

describe('lotes G100 — cobertura uno-a-uno de los 70 anclados', () => {
  it('el censo tiene 70 y cada tema recibe tantos reemplazos como anclados tenía', () => {
    expect(anchored.total).toBe(70);
    const need = new Map<string, number>();
    for (const q of anchored.questions) need.set(q.topicId, (need.get(q.topicId) ?? 0) + 1);
    const have = new Map<string, number>();
    for (const d of allDrafts) have.set(d.topicId, (have.get(d.topicId) ?? 0) + 1);
    const gaps = [...need].filter(([t, n]) => (have.get(t) ?? 0) < n).map(([t, n]) => `${t}: faltan ${n - (have.get(t) ?? 0)}`);
    expect(gaps).toEqual([]);
    // y no se compone nada en un tema que no tenía anclados
    expect([...have.keys()].filter((t) => !need.has(t))).toEqual([]);
  });

  it('todos los temas existen en el banco', () => {
    const known = new Set(bank.Question.map((q) => q.topicId));
    expect(allDrafts.filter((d) => !known.has(d.topicId)).length).toBe(0);
  });
});

describe('lotes G100 — ningún reemplazo queda anclado', () => {
  it('cada reactivo valida el esquema y NO cita fragmentos fuente (nace TEMARIO_ONLY)', () => {
    const bad: string[] = [];
    for (const d of allDrafts) {
      const r = validateDraft(d);
      if (!r.ok) bad.push(`${d.lot}: ${d.stem.slice(0, 40)} → ${r.errors[0]}`);
      if (d.sourceChunks.length > 0) bad.push(`${d.lot}: cita sourceChunks — ${d.stem.slice(0, 40)}`);
    }
    expect(bad).toEqual([]);
  });

  it('ningún texto del lote (enunciado, opciones, pasaje, explicaciones) menciona CENEVAL/EXANI', () => {
    const hits = allDrafts.filter((d) =>
      /ceneval|exani/i.test(JSON.stringify([d.stem, d.options, d.passage, d.explanations])),
    );
    expect(hits.map((d) => d.stem.slice(0, 50))).toEqual([]);
  });

  it('el enunciado no repite el de NINGÚN reactivo del banco y no se parece a los anclados de su tema', () => {
    const existing = new Set(bank.Question.map((q) => normalizeStem(q.stem)));
    const anchoredByTopic = new Map<string, Set<string>[]>();
    for (const a of anchored.questions) {
      const q = bank.Question.find((x) => x.id === a.id)!;
      const w = words(q.stem + ' ' + q.options.map((o) => o.text).join(' '));
      (anchoredByTopic.get(a.topicId) ?? anchoredByTopic.set(a.topicId, []).get(a.topicId)!).push(w);
    }
    const problems: string[] = [];
    for (const d of allDrafts) {
      if (existing.has(normalizeStem(d.stem))) problems.push(`duplicado exacto: ${d.stem.slice(0, 50)}`);
      const mine = words(d.stem + ' ' + d.options.map((o) => o.text).join(' '));
      for (const other of anchoredByTopic.get(d.topicId) ?? []) {
        const j = jaccard(mine, other);
        if (j >= 0.6) problems.push(`demasiado parecido a un anclado (J=${j.toFixed(2)}): ${d.stem.slice(0, 50)}`);
      }
    }
    expect(problems).toEqual([]);
  });

  it('control positivo: el detector de parecido SÍ se pone rojo ante una copia', () => {
    const a = bank.Question.find((q) => q.id === anchored.questions[0].id)!;
    const text = a.stem + ' ' + a.options.map((o) => o.text).join(' ');
    expect(jaccard(words(text), words(text))).toBe(1);
    expect(jaccard(words(text), words('zzz yyy xxx'))).toBe(0);
  });
});

describe('lotes G100 — reglas de lote (G3c/G77/G95)', () => {
  it.each(lots.map((l) => [l.name, l] as const))('el lote «%s» pasa analyzeLot sin violaciones', (_name, lot) => {
    const items: LotItem[] = lot.byTopic.flatMap((t) =>
      t.drafts.map((d) => {
        const r = validateDraft(d);
        if (!r.ok) throw new Error(r.errors[0]);
        return {
          options: r.draft.options,
          format: r.draft.format,
          difficulty: r.draft.difficulty,
          explanations: r.draft.explanations,
          passageRef: r.draft.passage?.ref ?? null,
          topic: topicLabelFromFilename(t.file),
        };
      }),
    );
    const report = analyzeLot(items);
    expect(report.violations.map((v) => v.detail)).toEqual([]);
  });
});

describe('lotes G100 — la verificación ciega corresponde a lo que se va a insertar', () => {
  it.each(lots.map((l) => [l.name, l] as const))(
    'el informe de «%s» aprueba CADA reactivo con la huella del texto actual',
    (name, lot) => {
      const report = JSON.parse(readFileSync(join(ROOT, 'verification', `${name}-report.json`), 'utf8')) as {
        rows: { hash: string; fingerprint: string; status: string }[];
      };
      const stale: string[] = [];
      for (const d of lot.byTopic.flatMap((t) => t.drafts)) {
        const row = report.rows.find((r) => r.hash === lotHash(d));
        if (!row) stale.push(`sin informe: ${d.stem.slice(0, 50)}`);
        else if (row.status !== 'APROBADO') stale.push(`no aprobado: ${d.stem.slice(0, 50)}`);
        else if (row.fingerprint !== fingerprint(d)) stale.push(`editado tras verificar: ${d.stem.slice(0, 50)}`);
      }
      expect(stale).toEqual([]);
    },
  );
});
