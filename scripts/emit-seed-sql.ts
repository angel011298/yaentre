/**
 * emit-seed-sql.ts (F1) — Ejecuta la lógica REAL del seed (prisma/seed/unam.ts
 * e ipn.ts) con un PrismaClient mockeado que registra cada upsert y emite SQL
 * idempotente. Permite sembrar contra Supabase vía el conector (Management API)
 * sin contraseña de DB local. Fidelidad garantizada: no transcribe datos, corre
 * el mismo código que `prisma db seed`.
 *
 * Uso: npx tsx scripts/emit-seed-sql.ts > scratchpad/seed.sql
 */
import Module from 'node:module';

interface Op {
  model: string;
  create: Record<string, unknown>;
}

const ops: Op[] = [];
const counters: Record<string, number> = {};

function makeModel(model: string) {
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    upsert: async ({ create }: any) => {
      counters[model] = (counters[model] ?? 0) + 1;
      const id = `${model}_${counters[model]}`;
      const row = { id, ...create };
      ops.push({ model, create: row });
      return row;
    },
  };
}

class MockPrismaClient {
  institution = makeModel('institution');
  level = makeModel('level');
  exam = makeModel('exam');
  area = makeModel('area');
  subject = makeModel('subject');
  topic = makeModel('topic');
  career = makeModel('career');
  async $disconnect() {}
}

// Interceptar @prisma/client vía require.cache (robusto ante el transpile de tsx)
const require = Module.createRequire(import.meta.url);
const prismaPath = require.resolve('@prisma/client');
require.cache[prismaPath] = {
  id: prismaPath,
  filename: prismaPath,
  loaded: true,
  exports: { PrismaClient: MockPrismaClient },
} as unknown as NodeModule;

// Modelo → tabla y clave natural (para ON CONFLICT)
const TABLE: Record<string, string> = {
  institution: 'institutions',
  level: 'levels',
  exam: 'exams',
  area: 'areas',
  subject: 'subjects',
  topic: 'topics',
  career: 'careers',
};
const CONFLICT: Record<string, string> = {
  institution: '(code)',
  level: '("institutionId", type)',
  exam: '("levelId", year)',
  area: '("examId", code)',
  subject: '("areaId", name)',
  topic: '("subjectId", name)',
  career: '("areaId", name)',
};

function sqlVal(v: unknown): string {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (v instanceof Date) return `'${v.toISOString()}'`;
  if (Array.isArray(v) || typeof v === 'object') {
    return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
  }
  return `'${String(v).replace(/'/g, "''")}'`;
}

async function main() {
  // require (no import) para que el transpile CJS de tsx pase por require.cache
  const { seedUnam } = require('../prisma/seed/unam.ts');
  const { seedIpn } = require('../prisma/seed/ipn.ts');
  await seedUnam();
  await seedIpn();

  const lines: string[] = [
    '-- Seed generado desde la lógica real de prisma/seed (F1). Idempotente.',
    'BEGIN;',
  ];
  for (const { model, create } of ops) {
    const cols = Object.keys(create);
    const colList = cols.map((c) => `"${c}"`).join(', ');
    const valList = cols.map((c) => sqlVal(create[c])).join(', ');
    const updatable = cols.filter((c) => c !== 'id');
    const setClause = updatable.map((c) => `"${c}" = EXCLUDED."${c}"`).join(', ');
    lines.push(
      `INSERT INTO "${TABLE[model]}" (${colList}) VALUES (${valList}) ` +
        `ON CONFLICT ${CONFLICT[model]} DO UPDATE SET ${setClause};`,
    );
  }
  lines.push('COMMIT;');
  process.stdout.write(lines.join('\n') + '\n');
  process.stderr.write(`\n-- ${ops.length} filas emitidas\n`);
}

main();
