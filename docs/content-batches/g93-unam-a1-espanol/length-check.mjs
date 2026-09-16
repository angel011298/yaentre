import { ITEMS } from './build-data.mjs';

let longest = 0;
let shortest = 0;
ITEMS.forEach((item, i) => {
  const lens = [item.correct.length, ...item.distractors.map((d) => d.length)];
  const correctLen = lens[0];
  const maxOther = Math.max(...lens.slice(1));
  const minOther = Math.min(...lens.slice(1));
  const isLongest = correctLen > maxOther;
  const isShortest = correctLen < minOther;
  if (isLongest) longest++;
  if (isShortest) shortest++;
  console.log(
    `${String(i + 1).padStart(2)} topic=${item.topic} correct=${correctLen} others=[${item.distractors.map((d) => d.length).join(',')}] ${isLongest ? 'LONGEST' : isShortest ? 'shortest' : ''}`,
  );
});
console.log(`\nTotal=${ITEMS.length} longest=${longest} (${((longest / ITEMS.length) * 100).toFixed(1)}%) shortest=${shortest} (${((shortest / ITEMS.length) * 100).toFixed(1)}%)`);
