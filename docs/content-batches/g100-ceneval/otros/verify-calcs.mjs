// Autoverificación: recalcula en código la clave de CADA reactivo (por su índice en
// build-data.mjs) y las cifras que producen los errores típicos citados en la capa 3,
// y comprueba que (1) la clave del archivo coincide con la calculada, (2) cada
// distractor del archivo coincide con el error esperado y (3) ninguno coincide con la clave.
// Uso: node docs/content-batches/g100-ceneval/otros/verify-calcs.mjs
import { ITEMS } from './build-data.mjs';

// Extrae los números de un texto de opción (fracciones \dfrac{a}{b}, separador de miles).
function nums(text) {
  let t = text.replace(/\\text\{[^}]*\}/g, '');
  t = t.replace(/(-?)\\dfrac\{(\d+)\}\{(\d+)\}/g, (_, s, a, b) => ` ${s}${Number(a) / Number(b)} `);
  t = t.replace(/(\d) (\d{3})(?!\d)/g, '$1$2');
  return (t.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number).map((n) => Math.round(n * 1e6) / 1e6);
}
const r6 = (n) => Math.round(n * 1e6) / 1e6;
const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

// Búsqueda por fuerza bruta de raíces reales de f en [lo, hi] con paso fino (cambio de signo / cero).
function roots(f, lo, hi, step = 0.0005) {
  const out = [];
  for (let x = lo; x < hi; x += step) {
    const a = f(x), b = f(x + step);
    if (Math.abs(a) < 1e-9) out.push(r6(x));
    else if (a * b < 0) out.push(r6(x + step / 2));
  }
  return [...new Set(out.map((v) => Math.round(v * 100) / 100))];
}

const g = 9.8;
const calcs = [];

// 0 · (x+1)/2 − (x−3)/4 = 4
{
  const f = (x) => (x + 1) / 2 - (x - 3) / 4 - 4;
  const key = roots(f, -50, 50)[0];
  calcs.push({
    key: [key],
    wrong: [
      [17], // 2(x+1)−(x−3) mal distribuido: 2x+2−x−3=16
      [-1], // 4 sin multiplicar en el lado derecho: x+5=4
      [21], // x+5=16 → x−5=16
    ],
    check: () => { if (Math.abs(f(key)) > 1e-9) throw new Error('item 0 no cumple'); },
  });
}
// 1 · 3x²−12x+k=0 con discriminante 0
{
  const k = (12 * 12) / (4 * 3);
  const doble = 12 / (2 * 3);
  calcs.push({ key: [k], wrong: [[(12 * 12) / 4], [doble ** 2], [doble]],
    check: () => { if (144 - 4 * 3 * k !== 0) throw new Error('item 1'); } });
}
// 2 · √(x+7)+5=x : candidatos de la cuadrática x²−11x+18=0 y comprobación
{
  const cand = roots((x) => x * x - 11 * x + 18, -20, 20);
  const valid = cand.filter((x) => x + 7 >= 0 && Math.abs(Math.sqrt(x + 7) + 5 - x) < 1e-6);
  const extraneous = cand.filter((x) => !valid.includes(x));
  if (!(same(cand, [2, 9]) && same(valid, [9]) && same(extraneous, [2]))) throw new Error('item 2 candidatos');
  calcs.push({ key: valid, wrong: [cand, extraneous, [-9, -2]] });
}
// 3 · 3c+2p=76 ; 2c+5p=113
{
  let sol;
  for (let c = 0; c <= 100; c++) for (let p = 0; p <= 100; p++) if (3 * c + 2 * p === 76 && 2 * c + 5 * p === 113) sol = { c, p };
  calcs.push({ key: [sol.p], wrong: [[sol.c], [sol.c + sol.p], [(76 + 3 * sol.c) / 2]] });
}
// 4 · 18 + 6k = 96
{
  const k = (96 - 18) / 6;
  calcs.push({ key: [k], wrong: [[(96 + 18) / 6], [96 / 6], [(96 - 6) / 18]] });
}
// 5 · 4x+6 = 3(x+6)
{
  let x;
  for (let i = 0; i <= 100; i++) if (4 * i + 6 === 3 * (i + 6)) x = i;
  calcs.push({ key: [4 * x], wrong: [[x], [4 * x + 6], [3 * x]] });
}
// 6 · 0.10x + 0.40·20 = 0.30(x+20)
{
  const f = (x) => 0.1 * x + 0.4 * 20 - 0.3 * (x + 20);
  const x = roots(f, 0, 200)[0];
  const e1 = roots((v) => 0.1 * v + 8 - 0.3 * v, 0, 200)[0]; // sin los 20 L en el total
  const e2 = roots((v) => 0.1 * v + 8 - (0.3 * v - 6), 0, 200)[0]; // signo del 6
  calcs.push({ key: [x], wrong: [[e1], [e2], [r6(2)]] });
}
// 7 · a(a+5)=126 ; perímetro
{
  let a;
  for (let i = 1; i < 100; i++) if (i * (i + 5) === 126) a = i;
  const l = a + 5;
  calcs.push({ key: [2 * (a + l)], wrong: [[a + l], [2 * (l + (l + 5))], [2 * l]] });
}
// 8 · raíces r y 2r, suma 9, k = producto
{
  let r;
  for (let i = 1; i < 50; i++) if (i + 2 * i === 9) r = i;
  calcs.push({ key: [r * 2 * r], wrong: [[9 * r], [(2 * r) ** 2], [r * r]] });
}
// 9 · 540 m en 1.5 min
{
  const t = 1.5 * 60;
  calcs.push({ key: [540 / t], wrong: [[540 / 1.5], [540 * 1.5], [540 / 60]] });
}
// 10 · caída libre 4 s
{
  const t = 4;
  calcs.push({ key: [r6(0.5 * g * t * t)], wrong: [[r6(g * t)], [r6(g * t * t)], [r6(0.5 * g * t)]] });
}
// 11 · v² = v0² + 2aΔx ; v0=24, a=−1.2, v=0
{
  const v0 = 24, a = -1.2;
  const dx = r6((0 - v0 * v0) / (2 * a));
  const t = r6(-v0 / a);
  if (r6((v0 / 2) * t) !== dx) throw new Error('item 11: comprobación por tiempo');
  calcs.push({ key: [dx], wrong: [[r6(v0 * t + 0.5 * -a * t * t)], [r6(v0 * t)], [t]] });
}
// 12 · encuentro de frente
{
  const D = 300, va = 70, vb = 80;
  const t = D / (va + vb);
  const dA = va * t;
  calcs.push({ key: [dA], wrong: [[vb * t], [D / 2], [va * (D / (vb - va))]] });
}
// 13 · tiro vertical v0 = 29.4
{
  const v0 = 29.4;
  const ts = r6(v0 / g);
  const h = r6((v0 * v0) / (2 * g));
  const ttot = 2 * ts;
  calcs.push({ key: [h, ttot], wrong: [[h, ts], [r6((v0 * v0) / g), ttot], [r6(0.5 * g * ttot * ttot), ttot]] });
}
// 14 · residuo p(x)=2x³−5x²+3x−7 entre x−2 (por evaluación y por división sintética)
{
  const p = (x) => 2 * x ** 3 - 5 * x ** 2 + 3 * x - 7;
  let acc = 0;
  for (const c of [2, -5, 3, -7]) acc = acc * 2 + c;
  if (acc !== p(2)) throw new Error('item 14: división sintética ≠ evaluación');
  calcs.push({ key: [p(2)], wrong: [[p(-2)], [2 * 8 - 5 * 4 - 3 * 2 - 7], [-p(2)]] });
}
// 15 · p(x)=2x³+x²−13x+6 : raíces por búsqueda y suma de cuadrados
{
  const p = (x) => 2 * x ** 3 + x ** 2 - 13 * x + 6;
  const rs = roots(p, -10, 10);
  if (!same(rs.sort((a, b) => a - b), [-3, 0.5, 2])) throw new Error('item 15 raíces');
  const sq = rs.reduce((s, x) => s + x * x, 0);
  const S = -1 / 2, e2 = -13 / 2;
  if (r6(S * S - 2 * e2) !== r6(sq)) throw new Error('item 15 Vieta');
  calcs.push({ key: [r6(sq)], wrong: [[r6(S * S)], [r6(S * S - 2 * -e2)], [r6(S * S - e2)]] });
}

if (calcs.length !== ITEMS.length) throw new Error(`calcs=${calcs.length} ≠ ITEMS=${ITEMS.length}`);

let fails = 0;
const fail = (i, msg) => { fails++; console.error(`✗ reactivo ${i}: ${msg}`); };
ITEMS.forEach((it, i) => {
  const c = calcs[i];
  c.check?.();
  const key = c.key.map(r6);
  const gotKey = nums(it.correct);
  if (!same(gotKey, key)) fail(i, `clave del archivo ${JSON.stringify(gotKey)} ≠ calculada ${JSON.stringify(key)}`);
  if (it.distractors.length !== 3) fail(i, 'no hay 3 distractores');
  const dnums = it.distractors.map(nums);
  c.wrong.forEach((w, j) => {
    const exp = w.map(r6);
    if (same(exp, key)) fail(i, `el error esperado nº${j + 1} coincide con la clave`);
    if (!dnums.some((d) => same(d, exp))) fail(i, `ningún distractor coincide con el error esperado ${JSON.stringify(exp)}`);
  });
  dnums.forEach((d, j) => {
    if (same(d, key)) fail(i, `el distractor ${j + 1} (${it.distractors[j]}) coincide con la clave`);
    if (dnums.findIndex((e) => same(e, d)) !== j) fail(i, `el distractor ${j + 1} está duplicado`);
    if (!c.wrong.some((w) => same(w.map(r6), d))) fail(i, `el distractor ${j + 1} no corresponde a un error calculado`);
  });
  console.log(`✓ ${String(i).padStart(2)}  clave=${JSON.stringify(key)}  errores=${JSON.stringify(c.wrong)}`);
});
if (fails) { console.error(`\n${fails} fallo(s)`); process.exit(1); }
console.log(`\nverify-calcs: ${ITEMS.length}/${ITEMS.length} reactivos verificados, 0 fallos.`);
