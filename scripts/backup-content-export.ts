/**
 * scripts/backup-content-export.ts — Respaldo lógico del banco de contenido (G61)
 *
 * Lee TODO el contenido (reactivos + opciones, explicaciones por capas,
 * pasajes, taxonomía completa, fuentes y su trazabilidad) y lo escribe a UN
 * archivo JSON versionable. Corre en cualquier momento; solo LEE la base.
 *
 * El archivo permite reconstruir el banco desde cero contra una base vacía con
 * `pnpm backup:import`. La retención es el historial de git: cada corrida
 * sobreescribe `backups/content-bank.json` y ese cambio se commitea.
 *
 * Uso:
 *   pnpm backup:export                 # → backups/content-bank.json
 *   pnpm backup:export --out <ruta>    # destino alterno (p. ej. copia con fecha)
 *
 * Ver docs/RESPALDOS.md para el procedimiento completo y la frecuencia.
 */
import './lib/env';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { PrismaClient } from '@prisma/client';
import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  CONTENT_MODELS,
  type ContentModel,
  delegateName,
  encodeRow,
  fieldMeta,
  projectRefFromEnv,
  type BackupFile,
} from './lib/content-backup';

const DEFAULT_OUT = join(process.cwd(), 'backups', 'content-bank.json');

function parseOut(argv: string[]): string {
  const i = argv.indexOf('--out');
  if (i !== -1 && argv[i + 1]) return join(process.cwd(), argv[i + 1]);
  return DEFAULT_OUT;
}

async function readModel(
  prisma: PrismaClient,
  model: ContentModel,
): Promise<Record<string, unknown>[]> {
  const { pk } = fieldMeta(model);
  const orderBy = pk.map((k) => ({ [k]: 'asc' as const }));
  const delegate = (prisma as unknown as Record<string, { findMany: (a: unknown) => Promise<Record<string, unknown>[]> }>)[
    delegateName(model)
  ];
  return delegate.findMany({ orderBy });
}

async function main() {
  const outPath = parseOut(process.argv.slice(2));
  const prisma = new PrismaClient();

  console.log('📦 Respaldo de contenido — YaEntre (G61)\n');

  const data: Record<string, Record<string, unknown>[]> = {};
  const counts: Record<string, number> = {};

  try {
    for (const model of CONTENT_MODELS) {
      const meta = fieldMeta(model);
      const rows = await readModel(prisma, model);
      data[model] = rows.map((r) => encodeRow(r, meta.dateFields));
      counts[model] = rows.length;
      console.log(`  ${model.padEnd(22)} ${String(rows.length).padStart(6)} filas`);
    }
  } finally {
    await prisma.$disconnect();
  }

  const totalRows = Object.values(counts).reduce((a, b) => a + b, 0);
  const schemaSha = createHash('sha256')
    .update(readFileSync(join(process.cwd(), 'prisma', 'schema.prisma')))
    .digest('hex');

  const payload: BackupFile = {
    _manifest: {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      sourceProjectRef: projectRefFromEnv(),
      prismaSchemaSha256: schemaSha,
      models: [...CONTENT_MODELS],
      counts,
      totalRows,
    },
    ...data,
  };

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(payload, null, 2) + '\n', 'utf-8');

  const bytes = Buffer.byteLength(JSON.stringify(payload));
  console.log(
    `\n✅ ${totalRows} filas → ${relative(process.cwd(), outPath)} ` +
      `(${(bytes / 1024 / 1024).toFixed(2)} MB)`,
  );
  console.log('   Commitea este archivo: el historial de git es la retención.\n');
}

main().catch((err) => {
  console.error('❌ Falló el respaldo:', err);
  process.exitCode = 1;
});
