// Constructor común de los lotes G100 (reemplazo de reactivos anclados a guías
// CENEVAL). Uso, desde la raíz del repo:
//
//   node docs/content-batches/g100-ceneval/build-lot.mjs <ingles|espanol|otros>
//
// Lee `<lote>/build-data.mjs` (export TOPICS + ITEMS) y escribe un JSON por
// tema en la misma carpeta, con el formato exacto que consume
// `pnpm content:insert` (QuestionDraftSchema).
//
//  · `correct` es SIEMPRE la respuesta correcta; la posición se decide con
//    crypto.randomInt POR REACTIVO (baraja Fisher-Yates), nunca con una regla
//    mental repetible (CLAUDE.md, G77: ORDER_PATTERN).
//  · `sourceChunks` queda SIEMPRE vacío: ningún reemplazo se ancla a un
//    fragmento de guía (G100). El reactivo nace TEMARIO_ONLY.
//  · Re-correr re-aleatoriza las posiciones; el contenido no cambia.
import { randomInt } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const LETTERS = ['A', 'B', 'C', 'D'];
const here = dirname(fileURLToPath(import.meta.url));
const lot = process.argv[2];
if (!lot) {
  console.error('Uso: node build-lot.mjs <ingles|espanol|otros>');
  process.exit(1);
}
const dir = resolve(here, lot);
const { TOPICS, ITEMS } = await import(pathToFileURL(join(dir, 'build-data.mjs')).href);

const passageByRef = new Map();
for (const item of ITEMS) {
  if (item.passage?.content) {
    passageByRef.set(item.passage.ref, {
      ref: item.passage.ref,
      title: item.passage.title ?? null,
      content: item.passage.content,
      sourceRef: null,
    });
  }
}

const byTopic = new Map();
for (const item of ITEMS) {
  if (!item.layer1 || !item.layer2 || !item.layer3) throw new Error(`Faltan capas: ${item.stem.slice(0, 60)}`);
  if (!item.distractors || item.distractors.length !== 3) throw new Error(`Se requieren 3 distractores: ${item.stem.slice(0, 60)}`);
  const texts = [item.correct, ...item.distractors];
  const order = [0, 1, 2, 3];
  for (let i = order.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  const draft = {
    stem: item.stem,
    options: order.map((originalIdx, slot) => ({
      id: LETTERS[slot],
      text: texts[originalIdx],
      isCorrect: originalIdx === 0,
    })),
    difficulty: item.difficulty,
    format: item.format ?? 'MULTIPLE_CHOICE',
    sourceChunks: [],
    passage: item.passage ? passageByRef.get(item.passage.ref) : null,
    explanations: [
      { layer: 1, title: item.t1 ?? 'El principio o la regla aplicable', content: item.layer1 },
      { layer: 2, title: item.t2 ?? 'Resolución paso a paso', content: item.layer2 },
      { layer: 3, title: item.t3 ?? 'Por qué no las otras opciones', content: item.layer3 },
    ],
  };
  if (!byTopic.has(item.topic)) byTopic.set(item.topic, []);
  byTopic.get(item.topic).push(draft);
}

let total = 0;
TOPICS.forEach((t, idx) => {
  const drafts = byTopic.get(idx + 1) ?? [];
  writeFileSync(join(dir, t.file), JSON.stringify(drafts, null, 2) + '\n', 'utf8');
  total += drafts.length;
  console.log(`${t.file}: ${drafts.length} reactivo(s)`);
});
console.log(`Total: ${total}`);
