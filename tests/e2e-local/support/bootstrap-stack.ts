/**
 * G103 — prepara la base de la pila LOCAL de e2e (una sola vez por pila):
 *   1. esquema completo desde `prisma/schema.prisma` (DDL que genera Prisma
 *      SIN conectarse a ninguna base) y encima las migraciones `00NN_*.sql`
 *      (RLS, funciones, buckets y políticas de Storage, restricciones que
 *      Prisma no modela). Los «ya existe» de las migraciones antiguas son
 *      esperados: esas columnas ya las creó el DDL completo;
 *   2. la tabla-marcador `__e2e_local_marker` (la guardia de todo el arnés);
 *   3. el banco de contenido desde `backups/content-bank.json` y el catálogo de
 *      carreras, con los scripts reales del repo.
 *
 *   E2E_LOCAL_STACK_ENV=<ruta> npx tsx tests/e2e-local/support/bootstrap-stack.ts
 *
 * El SQL se aplica con `docker exec … psql` DENTRO del contenedor de la pila
 * (E2E_DB_CONTAINER, por omisión `supabase_db_yaentre-e2e`): no hay forma de
 * que llegue a otra base.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { readStackFile } from './stack-env';

const ROOT = process.cwd();
const CONTAINER = process.env.E2E_DB_CONTAINER ?? 'supabase_db_yaentre-e2e';

function psql(sql: string, opts: { stopOnError: boolean }): { ok: boolean; errors: string[] } {
  const r = spawnSync('docker', ['exec', '-i', CONTAINER, 'psql', '-U', 'postgres', '-d', 'postgres', '-q', '-v', `ON_ERROR_STOP=${opts.stopOnError ? 1 : 0}`], {
    input: sql,
    encoding: 'utf8',
  });
  const errors = (r.stderr ?? '').split('\n').filter((l) => l.includes('ERROR'));
  return { ok: r.status === 0, errors };
}

async function main() {
  const stack = readStackFile();
  const has = spawnSync('docker', ['exec', CONTAINER, 'psql', '-U', 'postgres', '-tAc', "select to_regclass('public.__e2e_local_marker') is not null"], { encoding: 'utf8' });
  if (has.status !== 0) throw new Error(`No se pudo hablar con el contenedor ${CONTAINER}: ¿corre \`supabase start\`?`);
  if (has.stdout.trim() === 't' && !process.argv.includes('--force')) {
    console.log('La pila ya está preparada (existe __e2e_local_marker). Usa --force para repetir.');
    return;
  }

  const ddl = execFileSync('npx', ['prisma', 'migrate', 'diff', '--from-empty', '--to-schema-datamodel', 'prisma/schema.prisma', '--script'], {
    encoding: 'utf8',
    shell: true,
  });
  const base = psql(ddl, { stopOnError: true });
  if (!base.ok) throw new Error(`El esquema base falló:\n${base.errors.join('\n')}`);

  const unexpected: string[] = [];
  for (const file of readdirSync(join(ROOT, 'prisma/migrations')).filter((f) => /^\d{4}_.*\.sql$/.test(f)).sort()) {
    const r = psql(readFileSync(join(ROOT, 'prisma/migrations', file), 'utf8'), { stopOnError: false });
    // Esperados: lo que el DDL completo ya creó, y los roles de producción que
    // aquí no existen (acierta_ci / acierta_prod).
    const odd = r.errors.filter((e) => !/already exists|role "acierta_(ci|prod)" does not exist/.test(e));
    unexpected.push(...odd.map((e) => `${file}: ${e}`));
  }
  if (unexpected.length) throw new Error(`Errores no esperados al aplicar migraciones:\n${unexpected.join('\n')}`);

  const marker = psql('create table if not exists public.__e2e_local_marker (id int primary key); insert into public.__e2e_local_marker values (1) on conflict do nothing;', { stopOnError: true });
  if (!marker.ok) throw new Error('No se pudo crear la tabla-marcador.');

  // Los scripts reales del repo, con la base LOCAL (y solo esa) en el entorno.
  process.env.DATABASE_URL = stack.DB_URL;
  process.env.DIRECT_URL = stack.DB_URL;
  process.argv.push('--wipe', '--yes');
  await import(pathToFileURL(join(ROOT, 'scripts/backup-content-import.ts')).href);
  console.log('Banco de contenido importado. Sincroniza el catálogo de carreras con:');
  console.log('  E2E_LOCAL_STACK_ENV=… npx tsx --tsconfig scripts/tsconfig.perf.json tests/e2e-local/support/careers-local.ts');
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
