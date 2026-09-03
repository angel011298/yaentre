import './lib/env';

/**
 * G69 — Sonda del techo REAL de conexiones (`pnpm scale:pool`).
 *
 * Qué mide y por qué así:
 *
 * En Vercel no hay "una" conexión a Postgres: hay N instancias lambda, cada
 * una con su pool de Prisma, todas hablando con Supavisor (el pooler de
 * Supabase) en modo transacción. Supavisor multiplexa esas conexiones de
 * CLIENTE sobre un puñado mucho menor de conexiones de SERVIDOR contra
 * Postgres. Ese número —el pool de servidor— es el cuello de botella real del
 * lanzamiento, y NO aparece en ninguna variable de `pg_settings`: es
 * configuración de Supavisor, invisible desde SQL.
 *
 * La única forma de conocerlo es medirlo: se disparan K consultas
 * `pg_sleep(D)` EN PARALELO por el pooler y se observa, desde una conexión
 * aparte, cuántos backends de nuestro rol están realmente activos en
 * `pg_stat_activity`. Si el pool de servidor es P < K, las consultas se
 * encolan y el tiempo total sube a `ceil(K/P) * D`. Dos señales
 * independientes (backends observados y tiempo de pared) que deben coincidir.
 *
 * Es una prueba DELIBERADAMENTE pequeña: `pg_sleep` no consume CPU ni I/O de
 * la base, solo ocupa una conexión. No degrada el servicio.
 *
 * Uso:  pnpm scale:pool [--max 40] [--sleep 1]
 */

import { PrismaClient } from '@prisma/client';

const args = process.argv.slice(2);
function arg(name: string, fallback: number): number {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const v = Number(args[i + 1]);
  return Number.isFinite(v) ? v : fallback;
}

const MAX_CLIENTS = arg('max', 40);
const SLEEP_SECS = arg('sleep', 1);
const STEPS = [4, 8, 12, 16, 20, 30, 40, 60].filter((k) => k <= MAX_CLIENTS);

interface StepResult {
  clients: number;
  wallMs: number;
  errors: number;
  maxBackends: number;
  /** Concurrencia efectiva deducida del tiempo de pared. */
  effective: number;
}

/** Observador: conexión aparte (modo sesión) que cuenta backends del rol. */
async function countBackends(observer: PrismaClient): Promise<number> {
  const rows = await observer.$queryRawUnsafe<{ n: bigint }[]>(
    `SELECT count(*) AS n
       FROM pg_stat_activity
      WHERE usename = current_user
        AND application_name = 'Supavisor'
        AND query LIKE '%pg_sleep%'`
  );
  return Number(rows[0]?.n ?? 0);
}

async function runStep(
  pooled: PrismaClient,
  observer: PrismaClient,
  clients: number
): Promise<StepResult> {
  let maxBackends = 0;
  let sampling = true;
  const sampler = (async () => {
    while (sampling) {
      try {
        const n = await countBackends(observer);
        if (n > maxBackends) maxBackends = n;
      } catch {
        /* el observador nunca debe tumbar la medición */
      }
      await new Promise((r) => setTimeout(r, 60));
    }
  })();

  const t0 = performance.now();
  const settled = await Promise.allSettled(
    Array.from({ length: clients }, () =>
      // `$executeRaw`, no `$queryRaw`: `pg_sleep` devuelve `void` y Prisma no
      // sabe deserializar `void` — SIEMPRE lanza (guardrail G67 de CLAUDE.md).
      pooled.$executeRawUnsafe(`SELECT pg_sleep(${SLEEP_SECS})`)
    )
  );
  const wallMs = performance.now() - t0;
  sampling = false;
  await sampler;

  const errors = settled.filter((s) => s.status === 'rejected').length;
  const rounds = Math.max(1, wallMs / (SLEEP_SECS * 1000));
  return {
    clients,
    wallMs,
    errors,
    maxBackends,
    effective: Math.round((clients / rounds) * 10) / 10,
  };
}

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('Falta DATABASE_URL');

  // El pool del CLIENTE se abre a propósito tan grande como el paso más
  // grande: lo que se quiere medir es el techo del POOLER, no el de Prisma.
  const clientUrl = new URL(url);
  clientUrl.searchParams.set('connection_limit', String(MAX_CLIENTS));
  clientUrl.searchParams.set('pool_timeout', '60');
  clientUrl.searchParams.set('pgbouncer', 'true');

  const pooled = new PrismaClient({ datasourceUrl: clientUrl.toString() });
  const observer = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });

  console.log('G69 — techo real de conexiones a través del pooler\n');
  const server = await observer.$queryRawUnsafe<{ mx: string; used: bigint; role: string }[]>(
    `SELECT current_setting('max_connections') AS mx,
            (SELECT count(*) FROM pg_stat_activity) AS used,
            current_user AS role`
  );
  console.log(
    `Postgres: max_connections=${server[0].mx} · en uso ahora=${server[0].used} · rol=${server[0].role}`
  );
  console.log(`Cada paso: K consultas pg_sleep(${SLEEP_SECS}) en paralelo por el pooler.\n`);

  // Calentamiento: abrir el pool sin contarlo.
  await pooled.$queryRawUnsafe('SELECT 1');

  const results: StepResult[] = [];
  for (const k of STEPS) {
    const r = await runStep(pooled, observer, k);
    results.push(r);
    console.log(
      `K=${String(k).padStart(3)}  wall=${(r.wallMs / 1000).toFixed(2)}s  ` +
        `backends_max=${String(r.maxBackends).padStart(3)}  ` +
        `concurrencia_efectiva≈${r.effective}  errores=${r.errors}`
    );
    // Respiro entre pasos: que el pooler devuelva las conexiones.
    await new Promise((r) => setTimeout(r, 1500));
  }

  const ceiling = Math.max(...results.map((r) => Math.max(r.maxBackends, r.effective)));
  console.log(
    `\nTecho observado del pool de SERVIDOR (rol de la app): ~${Math.round(ceiling)} conexiones.`
  );
  const totalErrors = results.reduce((a, r) => a + r.errors, 0);
  console.log(`Errores totales: ${totalErrors}`);

  await pooled.$disconnect();
  await observer.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
