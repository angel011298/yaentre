// G103 — el segundo servidor (:3001, banderas apagadas) reutiliza el build del
// primero: espera a que exista su huella de build local antes de arrancar.
import { existsSync, readFileSync } from 'node:fs';

const file = '.next/E2E_LOCAL_BUILD';
const expected = `${process.env.NEXT_PUBLIC_SUPABASE_URL}|${process.env.STRIPE_E2E_LOCAL_API}`;
const started = Date.now();
// El primer servidor BORRA la huella antes de compilar (`build-marker clear`):
// unos segundos bastan para que esa limpieza ocurra antes de mirar.
await new Promise((r) => setTimeout(r, process.env.E2E_SKIP_BUILD === '1' ? 0 : 5_000));
while (Date.now() - started < 900_000) {
  if (existsSync(file) && readFileSync(file, 'utf8') === expected && existsSync('.next/BUILD_ID')) process.exit(0);
  await new Promise((r) => setTimeout(r, 2_000));
}
console.error('wait-build: no apareció un build de la pila local.');
process.exit(1);
