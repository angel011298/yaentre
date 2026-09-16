// Medición INDEPENDIENTE del sesgo de posición y del patrón de orden, sobre
// los 7 archivos JSON ya construidos (no reimplementa lot-validation.ts, lee
// el resultado final y lo mide con su propia lógica, como cruce).
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = dirname(fileURLToPath(import.meta.url));
const files = readdirSync(DIR).filter((f) => f.endsWith('.json')).sort();

const letters = [];
for (const f of files) {
  const items = JSON.parse(readFileSync(join(DIR, f), 'utf8'));
  for (const item of items) {
    const correct = item.options.find((o) => o.isCorrect);
    letters.push(correct.id);
  }
}

console.log(`Archivos: ${files.join(', ')}`);
console.log(`n=${letters.length}`);
console.log(`Secuencia de letras correctas (orden de inserción): ${letters.join(',')}`);

const counts = { A: 0, B: 0, C: 0, D: 0 };
for (const l of letters) counts[l]++;
console.log('Distribución:', counts, Object.fromEntries(Object.entries(counts).map(([k, v]) => [k, `${((v / letters.length) * 100).toFixed(1)}%`])));

// Racha periódica máxima (período 2, 3 o 4) — misma definición que ORDER_PATTERN de G77.
function maxPeriodicRun(seq, period) {
  let best = 0;
  for (let start = 0; start < seq.length; start++) {
    let len = 1;
    while (start + len < seq.length && seq[start + len] === seq[start + (len % period)]) len++;
    best = Math.max(best, len);
  }
  return best;
}
for (const period of [2, 3, 4]) {
  const run = maxPeriodicRun(letters, period);
  const cycles = run / period;
  console.log(`Período ${period}: racha máxima = ${run} elementos (${cycles.toFixed(2)} ciclos) ${cycles >= 3 ? '⚠️ >=3 ciclos' : 'sano'}`);
}
