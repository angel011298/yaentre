// Construye los 7 archivos JSON del lote G82 (uno por tema de Historia
// Universal, IPN SOCADM) a partir de build-data.mjs. La posición de la
// respuesta correcta se asigna con crypto.randomInt POR REACTIVO, de forma
// independiente — no con una regla mental repetible (G77 §7 de CLAUDE.md).
// Reproducir: `node build.mjs` desde esta misma carpeta (re-aleatoriza las
// posiciones; el contenido de los reactivos en build-data.mjs no cambia).
import { randomInt } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ITEMS, TOPIC_IDS } from './build-data.mjs';

const LETTERS = ['A', 'B', 'C', 'D'];
const OUT_DIR = dirname(fileURLToPath(import.meta.url));
mkdirSync(OUT_DIR, { recursive: true });

const byTopic = new Map(); // topicIndex(1-7) -> array of drafts

for (const item of ITEMS) {
  const texts = [item.correct, ...item.distractors]; // index 0 = correcta
  // Baraja Fisher-Yates con crypto.randomInt — orden verdaderamente aleatorio
  // por reactivo, no un patrón cíclico decidido a mano.
  const order = [0, 1, 2, 3];
  for (let i = order.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  const options = order.map((originalIdx, slot) => ({
    id: LETTERS[slot],
    text: texts[originalIdx],
    isCorrect: originalIdx === 0,
  }));

  const draft = {
    stem: item.stem,
    options,
    difficulty: item.difficulty,
    format: 'MULTIPLE_CHOICE',
    sourceChunks: [], // TEMARIO_ONLY: sin SourceChunk disponible para esta materia
    explanations: [
      { layer: 1, title: 'El proceso o la causa', content: item.layer1 },
      { layer: 2, title: 'Contexto histórico', content: item.layer2 },
      { layer: 3, title: 'Por qué no las otras opciones', content: item.layer3 },
    ],
  };

  if (!byTopic.has(item.topic)) byTopic.set(item.topic, []);
  byTopic.get(item.topic).push(draft);
}

const TOPIC_FILE_NAMES = [
  '1-antiguedad-clasica.json',
  '2-edad-media.json',
  '3-renacimiento.json',
  '4-ilustracion-liberalismo.json',
  '5-industrializacion.json',
  '6-guerras-mundiales.json',
  '7-siglo-xxi.json',
];

let total = 0;
for (const [topicIdx, drafts] of [...byTopic.entries()].sort((a, b) => a[0] - b[0])) {
  const fileName = TOPIC_FILE_NAMES[topicIdx - 1];
  const filePath = join(OUT_DIR, fileName);
  writeFileSync(filePath, JSON.stringify(drafts, null, 2) + '\n', 'utf8');
  console.log(`${fileName}: ${drafts.length} reactivos -> topicId ${TOPIC_IDS[topicIdx - 1]}`);
  total += drafts.length;
}
console.log(`Total: ${total} reactivos en ${OUT_DIR}`);
