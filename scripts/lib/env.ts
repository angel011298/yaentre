import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Carga de variables de entorno para los scripts offline (F2).
 *
 * `import 'dotenv/config'` solo lee `.env`, pero las credenciales reales del
 * proyecto viven en `.env.local` (gitignored, convención Next.js). Este módulo
 * carga `.env.local` PRIMERO y `.env` como fallback (dotenv no sobreescribe
 * valores ya definidos), igual que hace Next.js en runtime.
 *
 * Importar al inicio de cada entry-point de scripts:
 *   import './lib/env';   (o '../lib/env' según profundidad)
 */
const root = process.cwd();
for (const file of ['.env.local', '.env']) {
  const path = join(root, file);
  if (existsSync(path)) config({ path, quiet: true });
}
