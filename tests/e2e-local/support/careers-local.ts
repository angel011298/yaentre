/**
 * G103 — sincroniza el catálogo oficial de carreras en la pila LOCAL de e2e
 * (el respaldo del banco es anterior a G101). Fija la base local en el
 * entorno ANTES de cargar el script real, que no sobreescribe lo ya definido.
 */
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { readStackFile } from './stack-env';

const stack = readStackFile();
process.env.DATABASE_URL = stack.DB_URL;
process.env.DIRECT_URL = stack.DB_URL;
process.argv.push('--apply');
await import(pathToFileURL(join(process.cwd(), 'scripts/g101/sync-careers.ts')).href);
