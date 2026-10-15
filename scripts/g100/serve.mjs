/**
 * scripts/g100/serve.mjs — G100. Levanta el build de producción local con
 * variables de entorno propias, para la sonda `verify:session-no-trace`.
 *
 *   node scripts/g100/serve.mjs <puerto> [CLAVE=valor ...]
 *
 * Las variables del proceso ganan a `.env.local` (Next las carga sin pisar las
 * que ya existen), así que aquí se puede, p. ej., poner a la cuenta fixture en
 * `MASTER_ADMIN_EMAILS` o acortar `EPHEMERAL_SESSION_MAX_AGE_SECS` sin tocar
 * ningún archivo. Las configuraciones `g100-*` de `.claude/launch.json` lo usan.
 */
import { spawn } from 'node:child_process';

const [port = '3100', ...pairs] = process.argv.slice(2);
const env = { ...process.env };
for (const pair of pairs) {
  const i = pair.indexOf('=');
  if (i > 0) env[pair.slice(0, i)] = pair.slice(i + 1);
}

const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', port], {
  env,
  stdio: 'inherit',
});
child.on('exit', (code) => process.exit(code ?? 0));
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => child.kill(sig));
