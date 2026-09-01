/**
 * scripts/perf-pool-probe.ts (G59) — Mide el costo de protocolo de la cadena
 * de conexión: cuántos viajes de red cuesta REALMENTE cada consulta.
 *
 * Hallazgo que motiva este script: con `?pgbouncer=true` (la receta clásica de
 * Prisma para PgBouncer), el motor de Prisma envuelve cada operación en
 * `BEGIN` / `DEALLOCATE ALL` / … / `COMMIT`. Son cuatro viajes por consulta,
 * no uno. `DEALLOCATE ALL` existe para no chocar con sentencias preparadas
 * heredadas de otro cliente en un pooler en modo transacción; Supavisor (el
 * pooler de Supabase, puerto 6543) sí soporta sentencias preparadas con
 * nombre, así que la pregunta empírica es si esa protección sigue haciendo
 * falta aquí.
 *
 * Este script NO cambia nada: abre dos clientes, uno con el parámetro y otro
 * sin él, corre la misma carga en ambos y reporta viajes y latencia.
 *
 * Uso:  pnpm perf:pool
 */
import './lib/env';
import { PrismaClient } from '@prisma/client';

interface Sample {
  label: string;
  statements: string[];
  wallMs: number;
  error?: string;
}

async function probe(label: string, url: string, rounds: number): Promise<Sample> {
  const client = new PrismaClient({
    datasourceUrl: url,
    log: [{ emit: 'event', level: 'query' }],
  });

  const statements: string[] = [];
  let capturing = false;
  client.$on('query', (e) => {
    if (capturing) statements.push(e.query);
  });

  try {
    // Calentamiento: abrir la conexión y dejar el pool listo.
    await client.$queryRaw`SELECT 1`;
    await client.userProfile.count();

    capturing = true;
    const t0 = performance.now();
    for (let i = 0; i < rounds; i++) {
      // Mezcla representativa: una lectura del modelo, una cruda y un conteo.
      await client.userProfile.count();
      await client.$queryRaw`SELECT count(*)::int AS n FROM "questions" WHERE "isVerified"`;
      await client.subject.findMany({ select: { id: true }, take: 5 });
    }
    const wallMs = performance.now() - t0;
    capturing = false;

    return { label, statements, wallMs };
  } catch (err) {
    return { label, statements, wallMs: -1, error: (err as Error).message };
  } finally {
    await client.$disconnect();
  }
}

function summarize(s: Sample, rounds: number): void {
  if (s.error) {
    console.log(`${s.label}: ERROR — ${s.error}`);
    return;
  }
  const proto = s.statements.filter((q) => /^(BEGIN|COMMIT|ROLLBACK|DEALLOCATE)/.test(q)).length;
  const real = s.statements.length - proto;
  const ops = rounds * 3;
  console.log(
    `${s.label.padEnd(26)} viajes=${String(s.statements.length).padStart(4)}  ` +
      `(reales ${String(real).padStart(3)} / protocolo ${String(proto).padStart(3)})  ` +
      `viajes por operación=${(s.statements.length / ops).toFixed(1)}  ` +
      `${s.wallMs.toFixed(0)} ms`
  );
}

async function main(): Promise<void> {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error('Falta DATABASE_URL');

  const withFlag = new URL(raw);
  withFlag.searchParams.set('pgbouncer', 'true');
  withFlag.searchParams.set('connection_limit', '5');

  const withoutFlag = new URL(raw);
  withoutFlag.searchParams.delete('pgbouncer');
  withoutFlag.searchParams.set('connection_limit', '5');

  const ROUNDS = 10;
  console.log(`Host: ${withFlag.hostname}:${withFlag.port} · ${ROUNDS} rondas × 3 operaciones\n`);

  // Se corren en serie para no repartirse el ancho de banda.
  const a = await probe('con pgbouncer=true', withFlag.toString(), ROUNDS);
  const b = await probe('sin pgbouncer', withoutFlag.toString(), ROUNDS);

  summarize(a, ROUNDS);
  summarize(b, ROUNDS);

  // Segunda pasada sin el parámetro: si Supavisor no soportara sentencias
  // preparadas con nombre, el choque saldría al reusar la conexión.
  const c = await probe('sin pgbouncer (2ª pasada)', withoutFlag.toString(), ROUNDS);
  summarize(c, ROUNDS);

  // ── Prueba de concurrencia ──
  // El modo en que FALLAN las sentencias preparadas sobre un pooler en modo
  // transacción es intermitente: aparece cuando la conexión del cliente se
  // reasigna a otra conexión de servidor que no tiene esa sentencia. Una sola
  // conexión secuencial casi nunca lo dispara. Aquí se fuerza: varios clientes
  // (como varias instancias lambda) con consultas en paralelo, para que
  // Supavisor tenga que multiplexar de verdad.
  console.log('\n── Concurrencia: 8 clientes × 20 rondas en paralelo, sin pgbouncer ──');
  const CLIENTS = 8;
  const CONC_ROUNDS = 20;
  const t0 = performance.now();
  const results = await Promise.allSettled(
    Array.from({ length: CLIENTS }, (_, i) =>
      probe(`cliente-${i}`, withoutFlag.toString(), CONC_ROUNDS)
    )
  );
  const wallMs = performance.now() - t0;

  const errors = results
    .map((r) => (r.status === 'fulfilled' ? r.value.error : String(r.reason)))
    .filter((e): e is string => Boolean(e));

  const trips = results.reduce(
    (acc, r) => acc + (r.status === 'fulfilled' && !r.value.error ? r.value.statements.length : 0),
    0
  );

  console.log(
    `operaciones=${CLIENTS * CONC_ROUNDS * 3}  viajes=${trips}  ` +
      `viajes por operación=${(trips / (CLIENTS * CONC_ROUNDS * 3)).toFixed(1)}  ${wallMs.toFixed(0)} ms`
  );
  if (errors.length === 0) {
    console.log('errores de sentencia preparada: NINGUNO');
  } else {
    console.log(`errores (${errors.length}):`);
    for (const e of [...new Set(errors)]) console.log('   ' + e);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
