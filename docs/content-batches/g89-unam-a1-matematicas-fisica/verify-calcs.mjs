// Recalcula, de forma INDEPENDIENTE del texto de los reactivos, cada
// resultado numérico del lote G89 y lo compara contra la clave declarada en
// build-data.mjs. No lee `correct`/`distractors` como fuente de verdad — los
// vuelve a derivar desde cero a partir del enunciado del problema.
// Uso: node verify-calcs.mjs

const results = [];
function check(label, expected, got, tol = 1e-9) {
  const ok = Math.abs(expected - got) <= tol;
  results.push({ label, expected, got, ok });
}

// ── 1. Progresiones y combinatoria ──
check('1.1 aritmética a8 (a1=5,d=6)', 47, 5 + 7 * 6);
check('1.2 geométrica a6 (a1=3,r=2)', 96, 3 * 2 ** 5);
check('1.3 permutación 5!', 120, [1, 2, 3, 4, 5].reduce((a, b) => a * b, 1));
function factorial(n) { return n <= 1 ? 1 : n * factorial(n - 1); }
function comb(n, r) { return factorial(n) / (factorial(r) * factorial(n - r)); }
function perm(n, r) { return factorial(n) / factorial(n - r); }
check('1.4 C(8,3)', 56, comb(8, 3));
check('1.5 CASA arreglos (4!/2!)', 12, factorial(4) / factorial(2));
check('1.6 suma aritmética S20 (a1=2,d=3)', 610, (20 / 2) * (2 * 2 + (20 - 1) * 3));
check('1.7 P(6,2)', 30, perm(6, 2));

// ── 2. Estadística descriptiva ──
const d1 = [78, 85, 90, 82, 95];
check('2.1 media', 86, d1.reduce((a, b) => a + b, 0) / d1.length);
const d2 = [12, 7, 15, 9, 21, 7, 18].sort((a, b) => a - b);
check('2.2 mediana (7 datos, posición 4)', 12, d2[3]);
const d3 = [2, 1, 3, 2, 2, 4, 1, 2, 3];
const freq = {};
for (const v of d3) freq[v] = (freq[v] || 0) + 1;
const moda = Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0];
check('2.3 moda', 2, Number(moda));
const d4 = [18, 22, 15, 25, 20, 17, 23];
check('2.4 rango', 10, Math.max(...d4) - Math.min(...d4));
check('2.5 ponderada 0.3*80+0.7*90', 87, 0.3 * 80 + 0.7 * 90);
check('2.6 % no aprobó (15/40)', 37.5, (15 / 40) * 100);
const d7 = [8, 9, 10, 11, 12];
const mean7 = 10;
const mad = d7.reduce((s, v) => s + Math.abs(v - mean7), 0) / d7.length;
check('2.7 desviación media absoluta', 1.2, mad);

// ── 3. Series y sucesiones ──
// 3.1 alternating +4 then /2, starting 2: 2,6,3,7,3.5,7.5,?
let seq = [2];
for (let i = 0; i < 6; i++) {
  const last = seq[seq.length - 1];
  seq.push(i % 2 === 0 ? last + 4 : last / 2);
}
check('3.1 alternada (2,+4,/2,...) 7mo término', 3.75, seq[6]);
// 3.2 alternating diffs 6,5,6,5,... starting 20
let a = 20;
const diffs = [6, 5, 6, 5, 6];
const seq2 = [a];
for (const dd of diffs) { a += dd; seq2.push(a); }
check('3.2a siguiente término (37+5)', 42, seq2[4]);
check('3.2b término después (42+6)', 48, seq2[5]);
check('3.3 serie geométrica S5 (a1=2,r=3)', 242, (2 * (3 ** 5 - 1)) / (3 - 1));
const fib = [1, 1];
for (let i = 2; i < 7; i++) fib.push(fib[i - 1] + fib[i - 2]);
check('3.4 Fibonacci a7', 13, fib[6]);
check('3.5 serie geométrica infinita (a1=8,r=0.5)', 16, 8 / (1 - 0.5));
check('3.6 siguiente cuadrado (6²)', 36, 6 ** 2);
check('3.7 suma 1..15 (n(n+1)/2)', 120, (15 * 16) / 2);

// ── 4. Matrices y sistemas de ecuaciones ──
check('4.1 sistema x+y=10,x-y=4 -> x', 7, (10 + 4) / 2);
check('4.2 det [[3,5],[2,4]]', 2, 3 * 4 - 5 * 2);
check('4.3 (A+B)(2,1) = 3+(-1)', 2, 3 + -1);
{
  const D = 2 * -1 - 1 * 1;
  const Dy = 2 * 1 - 8 * 1;
  check('4.4 Cramer y', 2, Dy / D);
}
check('4.5 Av fila1 = 2*5+3*2', 16, 2 * 5 + 3 * 2);
check('4.6 mayor de suma15/dif3', 9, (15 + 3) / 2);
check('4.7 k para det=0: 8k-8=0', 1, 8 / 8);

// ── 5. Conservación de momento ──
check('5.1 p=mv (4,6)', 24, 4 * 6);
check('5.2 choque inelástico v=(6*5)/(6+4)', 3, (6 * 5) / (6 + 4));
check('5.3 patinadores v2=(50*2)/40', 2.5, (50 * 2) / 40);
check('5.4 momento total 2*3 + 1*-4', 2, 2 * 3 + 1 * -4);
// 5.6: m(8) = (m+3)(2) -> 8m = 2m+6 -> 6m=6 -> m=1
check('5.6 masa incógnita 6m=6', 1, 6 / 6);

// ── 6. Trabajo y energía ──
check('6.1 W=Fd', 100, 20 * 5);
check('6.2 W=Fd cos60', 100, 50 * 4 * 0.5);
check('6.3 Ec=0.5mv^2', 100, 0.5 * 2 * 10 ** 2);
check('6.4 teorema trabajo-energía v', 4, Math.sqrt((2 * 24) / 3));
check('6.5 Ep=mgh', 400, 5 * 10 * 8);
check('6.6 caída libre v=sqrt(2gh)', 20, Math.sqrt(2 * 10 * 20));

let allOk = true;
for (const r of results) {
  const status = r.ok ? 'OK  ' : 'FAIL';
  if (!r.ok) allOk = false;
  console.log(`${status} ${r.label}: esperado=${r.expected} calculado=${r.got}`);
}
console.log(`\n${results.length} cálculos verificados, ${results.filter((r) => r.ok).length} correctos.`);
if (!allOk) {
  console.error('\n❌ Hay cálculos que NO coinciden.');
  process.exit(1);
} else {
  console.log('\n✅ Todos los cálculos verifican correctamente.');
}
