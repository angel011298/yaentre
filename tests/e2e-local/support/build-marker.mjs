// G103 — huella del build LOCAL de e2e. `write` la deja junto al build recién
// compilado; `check` impide servir un `.next` compilado con otro entorno (los
// NEXT_PUBLIC_* quedan incrustados: un build hecho con el entorno real haría
// que el navegador de las pruebas hablara con el Supabase real).
import { readFileSync, rmSync, writeFileSync } from 'node:fs';

const file = '.next/E2E_LOCAL_BUILD';
const expected = `${process.env.NEXT_PUBLIC_SUPABASE_URL}|${process.env.STRIPE_E2E_LOCAL_API}`;
if (!/^http:\/\/127\.0\.0\.1:\d+\|http:\/\/127\.0\.0\.1:\d+$/.test(expected)) {
  console.error('build-marker: el entorno no es el de la pila local.');
  process.exit(1);
}
if (process.argv[2] === 'clear') {
  rmSync(file, { force: true });
} else if (process.argv[2] === 'write') {
  writeFileSync(file, expected);
} else {
  let found = '';
  try {
    found = readFileSync(file, 'utf8');
  } catch {
    /* sin huella */
  }
  if (found !== expected) {
    console.error('build-marker: .next no es un build de la pila local; corre sin E2E_SKIP_BUILD.');
    process.exit(1);
  }
}
