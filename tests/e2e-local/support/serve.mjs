// G103 — arranca `next start` y copia su salida a un archivo además de a la
// consola: `global-teardown.ts` hace fallar la suite si el servidor registró
// errores (un `AuthError` en una página que igual respondía 404 pasó una
// corrida entera en verde sin que nada lo mirara).
import { spawn } from 'node:child_process';
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const port = args.includes('-p') ? args[args.indexOf('-p') + 1] : '3000';
mkdirSync('test-results', { recursive: true });
const log = `test-results/e2e-server-${port}.log`;
writeFileSync(log, '');
const child = spawn('pnpm', ['start', ...args], { shell: true, stdio: ['ignore', 'pipe', 'pipe'] });
for (const stream of [child.stdout, child.stderr]) {
  stream.on('data', (chunk) => {
    process.stdout.write(chunk);
    appendFileSync(log, chunk);
  });
}
child.on('exit', (code) => process.exit(code ?? 0));
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => child.kill(sig));
