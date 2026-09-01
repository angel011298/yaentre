/**
 * scripts/backup-content-import.ts — Restauración del banco de contenido (G61)
 *
 * Reconstruye TODO el contenido desde un archivo de `pnpm backup:export` contra
 * una base de datos VACÍA (restauración real, o un entorno de pruebas idéntico).
 * Inserta en orden de dependencias preservando los `id` originales (cuid) para
 * que todas las llaves foráneas cuadren.
 *
 * Modos:
 *   pnpm backup:import --dry-run          Corre el wipe+import+verificación
 *                                         DENTRO de una transacción y hace
 *                                         ROLLBACK — no escribe nada. Prueba
 *                                         que el archivo restaura limpio contra
 *                                         el schema real (enums, FKs, índices).
 *   pnpm backup:import                    Importa a `public`. ABORTA si ya hay
 *                                         reactivos.
 *   pnpm backup:import --wipe --yes       Reemplaza el contenido de `public`
 *                                         (borra en orden inverso, luego importa).
 *   pnpm backup:import --schema <nombre>  Importa a un esquema aislado — requiere
 *                                         que exista con las tablas Y los enums
 *                                         (`?schema=` de Prisma califica los
 *                                         casts de enum). Ver docs/RESPALDOS.md.
 *   --file <ruta>                         Archivo alterno.
 *
 * Nunca toca datos de usuario/sesión/pago. Ver docs/RESPALDOS.md §Restauración.
 */
import './lib/env';
import { readFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { join } from 'node:path';
import { Prisma, PrismaClient } from '@prisma/client';
import {
  BACKUP_FORMAT,
  CONTENT_MODELS,
  type ContentModel,
  decodeRow,
  delegateName,
  fieldMeta,
  type BackupFile,
} from './lib/content-backup';

interface Args {
  file: string;
  schema: string | null;
  wipe: boolean;
  yes: boolean;
  dryRun: boolean;
}

function parseArgs(argv: string[]): Args {
  const get = (flag: string): string | null => {
    const i = argv.indexOf(flag);
    return i !== -1 && argv[i + 1] ? argv[i + 1] : null;
  };
  return {
    file: join(process.cwd(), get('--file') ?? 'backups/content-bank.json'),
    schema: get('--schema'),
    wipe: argv.includes('--wipe'),
    yes: argv.includes('--yes'),
    dryRun: argv.includes('--dry-run'),
  };
}

/** Reescribe la cadena de conexión para apuntar a un esquema aislado. */
function connectionUrlForSchema(schema: string): string {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error('Falta DATABASE_URL en el entorno.');
  const u = new URL(raw);
  u.searchParams.set('schema', schema);
  return u.toString();
}

function confirm(question: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(`${question} [escribe "SI"]: `, (a) => {
      rl.close();
      resolve(a.trim() === 'SI');
    });
  });
}

/** Subconjunto de un delegate de Prisma que el importador necesita. Sirve tanto
 *  para el cliente normal como para el cliente de transacción. */
type Delegate = {
  count: (a?: unknown) => Promise<number>;
  createMany: (a: { data: Record<string, unknown>[] }) => Promise<{ count: number }>;
  deleteMany: (a?: unknown) => Promise<{ count: number }>;
};

type AnyClient = PrismaClient | Prisma.TransactionClient;

function delegateFor(client: AnyClient, model: ContentModel): Delegate {
  return (client as unknown as Record<string, Delegate>)[delegateName(model)];
}

const BATCH = 500;

/** Rechazo centinela para forzar el ROLLBACK del `--dry-run`. */
class DryRunComplete extends Error {}

/** Filas del archivo, decodificadas y listas para Prisma, por modelo. */
function decodeAll(backup: BackupFile): Map<ContentModel, Record<string, unknown>[]> {
  const out = new Map<ContentModel, Record<string, unknown>[]>();
  for (const model of CONTENT_MODELS) {
    const meta = fieldMeta(model);
    const rows = ((backup[model] as Record<string, unknown>[]) ?? []).map((r) => decodeRow(r, meta));
    out.set(model, rows);
  }
  return out;
}

async function wipe(client: AnyClient): Promise<void> {
  for (const model of [...CONTENT_MODELS].reverse()) {
    const { count } = await delegateFor(client, model).deleteMany();
    if (count > 0) console.log(`  wipe ${model.padEnd(22)} -${count}`);
  }
}

/**
 * Solo `--dry-run`: dentro de la transacción que se revierte, limpia también
 * las tablas de usuario que apuntan al contenido con `ON DELETE RESTRICT`
 * (`exam_sessions` → cascada a `session_answers`). Sin esto el wipe del
 * contenido choca contra los datos de sesión de un entorno con tráfico real.
 * NADA de esto se persiste: el ROLLBACK del dry-run lo deshace todo.
 */
async function dryRunClearBlockers(tx: Prisma.TransactionClient): Promise<void> {
  const sessions = await tx.examSession.deleteMany();
  if (sessions.count > 0) {
    console.log(`  (dry-run) exam_sessions       -${sessions.count}  [se revierte]`);
  }
}

async function insertAll(
  client: AnyClient,
  rowsByModel: Map<ContentModel, Record<string, unknown>[]>,
  expected: Record<string, number>,
): Promise<number> {
  let total = 0;
  for (const model of CONTENT_MODELS) {
    const rows = rowsByModel.get(model) ?? [];
    const delegate = delegateFor(client, model);
    let inserted = 0;
    for (let i = 0; i < rows.length; i += BATCH) {
      const { count } = await delegate.createMany({ data: rows.slice(i, i + BATCH) });
      inserted += count;
    }
    total += inserted;
    console.log(`  ${model.padEnd(22)} +${String(inserted).padStart(6)}`);
    const want = expected[model] ?? 0;
    if (inserted !== want) {
      throw new Error(`${model}: insertados ${inserted} ≠ esperados ${want}. Restauración incompleta.`);
    }
  }
  return total;
}

/**
 * Integridad referencial mínima del contenido recién restaurado. Se califican
 * las tablas con el esquema destino porque las consultas crudas de Prisma no
 * heredan el `search_path` del ORM (que siempre antepone `"public"`), y el rol
 * de conexión no lo trae por defecto.
 */
async function assertReferentialIntegrity(client: AnyClient, schema: string): Promise<void> {
  if (!/^[a-z_][a-z0-9_]*$/i.test(schema)) throw new Error(`Nombre de esquema inválido: ${schema}`);
  const q = (t: string) => `"${schema}"."${t}"`;
  const rows = await client.$queryRawUnsafe<{ n: number }[]>(
    `SELECT (
       (SELECT count(*) FROM ${q('questions')} qq            LEFT JOIN ${q('topics')} t          ON t.id = qq."topicId"       WHERE t.id IS NULL) +
       (SELECT count(*) FROM ${q('questions')} qq            LEFT JOIN ${q('passages')} p        ON p.id = qq."passageId"     WHERE qq."passageId" IS NOT NULL AND p.id IS NULL) +
       (SELECT count(*) FROM ${q('explanation_layers')} e    LEFT JOIN ${q('questions')} qq      ON qq.id = e."questionId"    WHERE qq.id IS NULL) +
       (SELECT count(*) FROM ${q('question_source_chunks')} x LEFT JOIN ${q('questions')} qq     ON qq.id = x."questionId"    WHERE qq.id IS NULL) +
       (SELECT count(*) FROM ${q('question_source_chunks')} x LEFT JOIN ${q('source_chunks')} s  ON s.id = x."sourceChunkId"  WHERE s.id IS NULL) +
       (SELECT count(*) FROM ${q('topics')} t                LEFT JOIN ${q('subjects')} s        ON s.id = t."subjectId"      WHERE s.id IS NULL) +
       (SELECT count(*) FROM ${q('subjects')} s              LEFT JOIN ${q('areas')} a           ON a.id = s."areaId"         WHERE a.id IS NULL) +
       (SELECT count(*) FROM ${q('careers')} c               LEFT JOIN ${q('areas')} a           ON a.id = c."areaId"         WHERE a.id IS NULL)
     )::int AS n`,
  );
  const n = rows[0]?.n ?? 0;
  if (n > 0) throw new Error(`Integridad referencial rota: ${n} filas huérfanas tras la restauración.`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const backup = JSON.parse(readFileSync(args.file, 'utf-8')) as BackupFile;
  if (backup._manifest?.format !== BACKUP_FORMAT) {
    throw new Error(`El archivo no es un respaldo de contenido válido (${args.file}).`);
  }

  console.log('♻️  Restauración de contenido — YaEntre (G61)\n');
  console.log(`   Archivo:   ${args.file}`);
  console.log(`   Exportado: ${backup._manifest.exportedAt}`);
  console.log(`   Filas:     ${backup._manifest.totalRows}`);
  console.log(
    `   Destino:   ${args.schema ? `esquema "${args.schema}"` : 'public'}` +
      `${args.dryRun ? '  (DRY-RUN — se hace ROLLBACK, no se escribe nada)' : ''}\n`,
  );

  const rowsByModel = decodeAll(backup);
  const expected = backup._manifest.counts;
  const targetSchema = args.schema ?? 'public';

  const prisma = args.schema
    ? new PrismaClient({ datasourceUrl: connectionUrlForSchema(args.schema) })
    : new PrismaClient();

  try {
    if (args.dryRun) {
      try {
        await prisma.$transaction(
          async (tx) => {
            // Un esquema aislado (--schema) no tiene tablas de usuario que
            // bloqueen el wipe; solo `public` las tiene.
            if (!args.schema) await dryRunClearBlockers(tx);
            await wipe(tx);
            const total = await insertAll(tx, rowsByModel, expected);
            await assertReferentialIntegrity(tx, targetSchema);
            console.log(`\n  ${total} filas insertadas y verificadas dentro de la transacción.`);
            throw new DryRunComplete();
          },
          { timeout: 180_000, maxWait: 20_000 },
        );
      } catch (err) {
        if (!(err instanceof DryRunComplete)) throw err;
      }
      console.log('\n✅ DRY-RUN OK — el archivo restaura limpio. ROLLBACK hecho, nada se escribió.\n');
      return;
    }

    const existing = await delegateFor(prisma, 'Question').count();
    if (existing > 0 && !args.wipe) {
      throw new Error(
        `El destino ya tiene ${existing} reactivos. Usa --wipe --yes para reemplazarlos, ` +
          `--dry-run para probar sin escribir, o --schema <nombre> para un esquema aislado.`,
      );
    }
    if (args.wipe && existing > 0) {
      const ok = args.yes || (await confirm(`Se borrarán ${existing} reactivos y su contenido asociado.`));
      if (!ok) {
        console.log('Cancelado.');
        return;
      }
      await wipe(prisma);
      console.log('');
    }

    const total = await insertAll(prisma, rowsByModel, expected);
    await assertReferentialIntegrity(prisma, targetSchema);
    console.log(`\n✅ ${total} filas restauradas. Integridad referencial verificada.\n`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('❌ Falló la restauración:', err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
