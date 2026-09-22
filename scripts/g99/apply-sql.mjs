/**
 * scripts/g99/apply-sql.mjs — aplicar una migración SQL plana a la base real.
 *
 * Este repo NO usa el flujo de migraciones de Prisma: `prisma/migrations/*.sql`
 * son archivos planos escritos a mano (ver CLAUDE.md). Correr
 * `prisma migrate dev/deploy/reset` haría que Prisma no reconociera ninguna,
 * detectara deriva y ofreciera RESETEAR la base. El camino documentado
 * (docs/VALIDACION_INFRA.md §"Conexión de DB") es `prisma db execute` contra
 * `DIRECT_URL`.
 *
 * Por qué hace falta este envoltorio: el CLI de Prisma carga `.env`, no
 * `.env.local`. En este repo `.env` son placeholders (`localhost:5432`) y las
 * credenciales reales viven en `.env.local`, así que `prisma db execute
 * --schema` apunta al lugar equivocado y falla con P1001. Aquí se carga
 * `.env.local` y se pasa la URL por `--url`, sin imprimirla nunca.
 *
 *   node scripts/g99/apply-sql.mjs prisma/migrations/0016_admin_maestro_g99.sql
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { config } = require('dotenv');

for (const file of ['.env.local', '.env']) {
  if (existsSync(file)) config({ path: file, quiet: true });
}

const sqlFile = process.argv[2];
if (!sqlFile) {
  console.error('Uso: node scripts/g99/apply-sql.mjs <archivo.sql>');
  process.exit(1);
}
if (!existsSync(sqlFile)) {
  console.error(`No existe el archivo: ${sqlFile}`);
  process.exit(1);
}

const url = process.env.DIRECT_URL;
if (!url || url.includes('localhost')) {
  console.error('DIRECT_URL ausente o apuntando a localhost. Revisa .env.local.');
  process.exit(1);
}

// Se imprime el HOST, nunca la cadena completa: confirma contra qué base se
// está aplicando sin filtrar la contraseña al log.
console.log(`→ aplicando ${sqlFile}`);
console.log(`→ destino: ${new URL(url).host}`);

// Se invoca el entry point de Prisma con el mismo `node` que corre este
// script, en vez de `pnpm`/`npx`: esos son `.cmd` en Windows y exigirían
// `shell: true`, que además cambia la sintaxis de expansión entre cmd.exe y
// sh. Sin shell no hay expansión que se rompa ni línea de comandos que
// atraviese un intérprete.
const prismaCli = require.resolve('prisma/build/index.js');
const res = spawnSync(
  process.execPath,
  [prismaCli, 'db', 'execute', '--file', sqlFile, '--url', url],
  { stdio: 'inherit', env: process.env }
);

process.exit(res.status ?? 1);
