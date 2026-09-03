import './lib/env';

/**
 * G69 — Prueba de carga CONTROLADA (`pnpm scale:load`).
 *
 * Dos capas, porque el cuello de botella no está donde se ve:
 *
 *  · `--http` (por defecto) mide la capa de Vercel contra el sitio REAL:
 *    CDN, middleware y funciones. Rutas de solo lectura, todas idempotentes
 *    (`GET`), ninguna que escriba ni mande correo.
 *
 *  · `--db` mide la capa que de verdad se satura: el pooler de Supabase.
 *    Ejecuta el flujo REAL del dashboard (los 9 loaders de
 *    `app/(app)/app/page.tsx`, todos de solo lectura) con V usuarios
 *    virtuales en paralelo, y reporta rendimiento, latencia y errores.
 *    Es la única forma de ver el `P2024` (cola de Prisma llena) antes de que
 *    lo vea un alumno a media sesión.
 *
 * RESPONSABILIDAD. Esto corre contra producción, así que:
 *   - la carga es una rampa corta y acotada (por defecto ≤24 concurrentes,
 *     unos cientos de peticiones en total: menos de lo que genera una sola
 *     clase de 30 alumnos entrando a la vez);
 *   - hay enfriamiento entre pasos;
 *   - se ABORTA sola si la tasa de error de un paso supera el umbral, para no
 *     insistir sobre un servicio que ya está sufriendo;
 *   - no toca ningún flujo que escriba, cobre o mande correo.
 *
 * Uso:
 *   pnpm scale:load                       # HTTP contra https://yaentre.com
 *   pnpm scale:load --url https://otra    # otro origen
 *   pnpm scale:load --db                  # capa de base de datos
 *   pnpm scale:load --db --max 32
 */

const args = process.argv.slice(2);
const flag = (n: string) => args.includes(`--${n}`);
function opt(name: string, fallback: string): string {
  const i = args.indexOf(`--${name}`);
  return i > -1 && args[i + 1] ? args[i + 1] : fallback;
}

const BASE = opt('url', 'https://yaentre.com').replace(/\/$/, '');
const MAX = Number(opt('max', '24'));
const ABORT_ERROR_RATE = 0.25;

interface Sample {
  ms: number;
  ok: boolean;
  status?: number;
  error?: string;
}

interface StepReport {
  label: string;
  concurrency: number;
  requests: number;
  errors: number;
  rps: number;
  p50: number;
  p95: number;
  max: number;
  statuses: Record<string, number>;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const i = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[i];
}

function report(label: string, concurrency: number, samples: Sample[], wallMs: number): StepReport {
  const sorted = samples.map((s) => s.ms).sort((a, b) => a - b);
  const statuses: Record<string, number> = {};
  for (const s of samples) {
    const key = s.error ? `err:${s.error}` : String(s.status ?? 'ok');
    statuses[key] = (statuses[key] ?? 0) + 1;
  }
  return {
    label,
    concurrency,
    requests: samples.length,
    errors: samples.filter((s) => !s.ok).length,
    rps: Math.round((samples.length / (wallMs / 1000)) * 10) / 10,
    p50: Math.round(percentile(sorted, 50)),
    p95: Math.round(percentile(sorted, 95)),
    max: Math.round(sorted[sorted.length - 1] ?? 0),
    statuses,
  };
}

function printReport(r: StepReport): void {
  const pad = (s: string | number, n: number) => String(s).padEnd(n);
  console.log(
    `  ${pad(`c=${r.concurrency}`, 8)}${pad(`n=${r.requests}`, 8)}` +
      `${pad(`${r.rps} req/s`, 13)}${pad(`p50=${r.p50}ms`, 14)}` +
      `${pad(`p95=${r.p95}ms`, 14)}${pad(`max=${r.max}ms`, 13)}errores=${r.errors}` +
      (r.errors > 0 ? `  ${JSON.stringify(r.statuses)}` : '')
  );
}

/** Ejecuta `total` tareas con `concurrency` en vuelo a la vez. */
async function runPool<T>(
  total: number,
  concurrency: number,
  task: (i: number) => Promise<T>
): Promise<T[]> {
  const out: T[] = [];
  let next = 0;
  const workers = Array.from({ length: concurrency }, async () => {
    for (;;) {
      const i = next++;
      if (i >= total) return;
      out.push(await task(i));
    }
  });
  await Promise.all(workers);
  return out;
}

// ─────────────────────────────── Capa HTTP ───────────────────────────────

interface HttpTarget {
  label: string;
  path: string;
  /** Qué se está midiendo de verdad con esta ruta. */
  what: string;
  expect: (status: number) => boolean;
}

const HTTP_TARGETS: HttpTarget[] = [
  {
    label: 'landing /',
    path: '/',
    what: 'página ISR (revalidate 60) — CDN + función solo al revalidar',
    expect: (s) => s === 200,
  },
  {
    label: 'precios',
    path: '/precios',
    what: 'página ISR con precios de temporada',
    expect: (s) => s === 200,
  },
  {
    label: 'login',
    path: '/login',
    what: 'entrada del embudo — la más pedida en un pico de registro',
    expect: (s) => s === 200,
  },
  {
    label: '/app (sin sesión)',
    path: '/app',
    what: 'middleware + guard: redirección a /login sin tocar Postgres',
    expect: (s) => s === 307 || s === 302 || s === 200,
  },
];

async function httpMode(): Promise<void> {
  console.log(`G69 — prueba de carga HTTP controlada contra ${BASE}\n`);
  const steps = [1, 4, 8, 16, MAX].filter((c, i, a) => c <= MAX && a.indexOf(c) === i);

  for (const target of HTTP_TARGETS) {
    console.log(`▸ ${target.label} — ${target.what}`);
    for (const c of steps) {
      const total = c * 5;
      const t0 = performance.now();
      const samples = await runPool<Sample>(total, c, async () => {
        const s0 = performance.now();
        try {
          const res = await fetch(`${BASE}${target.path}`, {
            redirect: 'manual',
            headers: { 'User-Agent': 'yaentre-scale-probe/G69' },
          });
          // Drenar el cuerpo: sin esto la conexión no se libera y la latencia
          // medida es la de las cabeceras, no la de la respuesta completa.
          await res.arrayBuffer().catch(() => undefined);
          return { ms: performance.now() - s0, ok: target.expect(res.status), status: res.status };
        } catch (e) {
          return { ms: performance.now() - s0, ok: false, error: (e as Error).name };
        }
      });
      const r = report(target.label, c, samples, performance.now() - t0);
      printReport(r);
      if (r.errors / r.requests > ABORT_ERROR_RATE) {
        console.log('  ⚠ tasa de error por encima del umbral — se corta la rampa de esta ruta.');
        break;
      }
      await new Promise((res) => setTimeout(res, 1200)); // enfriamiento
    }
    console.log('');
  }

  console.log(
    'Nota: estas rutas son estáticas/ISR o se resuelven en el middleware, así que\n' +
      'miden la capa de Vercel, NO la base de datos. Para el cuello de botella real\n' +
      'corre `pnpm scale:load --db`.'
  );
}

// ──────────────────────────── Capa base de datos ────────────────────────────

async function dbMode(): Promise<void> {
  const { PrismaClient } = await import('@prisma/client');
  const { serverlessDatabaseUrl } = await import('../src/lib/db/connection-url');

  // El pool del cliente se abre grande a propósito: lo que se busca saturar es
  // el pooler, no la cola local de Prisma.
  const raw = serverlessDatabaseUrl(process.env.DATABASE_URL);
  if (!raw) throw new Error('Falta DATABASE_URL');
  const url = new URL(raw);
  url.searchParams.set('connection_limit', String(MAX));
  url.searchParams.set('pool_timeout', '30');

  const prisma = new PrismaClient({ datasourceUrl: url.toString() });
  (globalThis as unknown as { prisma?: unknown }).prisma = prisma;

  const observer = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });

  const dashboard = await import('../src/lib/db/dashboard');
  const adaptive = await import('../src/lib/db/adaptive');
  const gamification = await import('../src/lib/db/gamification');

  // Sujeto: el perfil con más historial. Solo LECTURA — los mismos loaders que
  // `app/(app)/app/page.tsx` dispara con `Promise.all`.
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT up.id
      FROM user_profiles up
     WHERE up."targetCareerId" IS NOT NULL AND up."targetExamId" IS NOT NULL
     ORDER BY (SELECT count(*) FROM exam_sessions s WHERE s."userProfileId" = up.id) DESC
     LIMIT 1
  `;
  if (rows.length === 0) throw new Error('No hay ningún perfil con carrera y examen meta.');
  const profileId = rows[0].id;

  const renderDashboard = async () => {
    const now = new Date();
    await Promise.all([
      dashboard.loadExamCountdown(profileId, now),
      dashboard.loadWeakestTopics(profileId, 3),
      dashboard.loadRecentSimulations(profileId, 3),
      dashboard.loadHeatmapData(profileId, now),
      dashboard.loadEntrometroAccess(profileId),
      adaptive.computeCareerStrategy(profileId),
      adaptive.computeWeekOverWeekDelta(profileId, now),
      gamification.loadStreakStatus(profileId, now),
      gamification.loadMasteredSubjectBadges(profileId),
    ]);
  };

  console.log('G69 — prueba de carga contra la base de datos (dashboard real, solo lectura)\n');
  console.log(`Sujeto: ${profileId}`);
  const meta = await observer.$queryRawUnsafe<{ mx: string; used: bigint }[]>(
    `SELECT current_setting('max_connections') AS mx, (SELECT count(*) FROM pg_stat_activity) AS used`
  );
  console.log(`Postgres: max_connections=${meta[0].mx} · en uso antes de empezar=${meta[0].used}\n`);

  await renderDashboard(); // calentamiento (abre el pool, llena la caché de Next)

  const steps = [1, 2, 4, 8, 16, MAX].filter((c, i, a) => c <= MAX && a.indexOf(c) === i);
  for (const c of steps) {
    const total = c * 3;
    let peakBackends = 0;
    let sampling = true;
    const sampler = (async () => {
      while (sampling) {
        try {
          const n = await observer.$queryRawUnsafe<{ n: bigint }[]>(
            `SELECT count(*) AS n FROM pg_stat_activity
              WHERE usename = current_user AND application_name = 'Supavisor' AND state = 'active'`
          );
          peakBackends = Math.max(peakBackends, Number(n[0].n));
        } catch {
          /* el observador nunca tumba la medición */
        }
        await new Promise((r) => setTimeout(r, 80));
      }
    })();

    const t0 = performance.now();
    const samples = await runPool<Sample>(total, c, async () => {
      const s0 = performance.now();
      try {
        await renderDashboard();
        return { ms: performance.now() - s0, ok: true, status: 200 };
      } catch (e) {
        const err = e as { code?: string; name?: string; message?: string };
        return {
          ms: performance.now() - s0,
          ok: false,
          error: err.code ?? err.name ?? 'ERR',
        };
      }
    });
    sampling = false;
    await sampler;

    const wall = performance.now() - t0;
    const r = report('dashboard', c, samples, wall);
    printReport(r);
    console.log(
      `           backends_activos_pico=${peakBackends}  ` +
        `dashboards/s=${(samples.length / (wall / 1000)).toFixed(2)}`
    );

    if (r.errors / r.requests > ABORT_ERROR_RATE) {
      console.log('  ⚠ tasa de error por encima del umbral — se corta la rampa.');
      break;
    }
    await new Promise((res) => setTimeout(res, 1500));
  }

  console.log(
    '\nRecordatorio de lectura: esta medición sale de una máquina en México contra\n' +
      'us-east-1 (~110 ms por viaje). En Vercel `iad1` la latencia por viaje cae a\n' +
      'milisegundos, así que el RENDIMIENTO real es mucho mayor; lo que se traslada\n' +
      'tal cual es la FORMA de la curva y el techo de concurrencia.'
  );

  await prisma.$disconnect();
  await observer.$disconnect();
}

async function main(): Promise<void> {
  if (flag('db')) await dbMode();
  else await httpMode();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
