import '../g71/env';

/**
 * scripts/g73b/grants-probe.ts — G73b.  `pnpm security:grants`
 *
 * ── QUÉ COMPRUEBA, Y POR QUÉ ASÍ ────────────────────────────────────────────
 *
 * G73 encontró que el limitador de tasa distribuido de G65 llevaba MESES
 * inerte en producción. Ninguna auditoría lo vio porque todas comprobaron el
 * CÓDIGO (que era correcto) y las sondas corrían con las credenciales locales
 * de `acierta_ci` (que sí tenía el privilegio). El rol de producción es
 * `acierta_prod` y no lo tenía; `consumeRateLimit` falla abierto por diseño,
 * así que devolvía `allowed: true` sin un solo síntoma.
 *
 * Esta sonda existe para que eso no vuelva a pasar, y por eso NO pregunta si
 * un GRANT está escrito. Ejecuta las operaciones REALES de la aplicación
 * contra la base REAL con el rol que de verdad conecta, y mira el EFECTO:
 *
 *   · el contador del limitador ¿sube de 1 en 1 y BLOQUEA en el presupuesto?
 *   · `getAuthEmails` ¿devuelve correos, o cero como durante 4 fases?
 *   · una tabla NUEVA en `public` ¿nace cerrada a `anon`/`authenticated`?
 *
 * El tercero cubre el segundo hallazgo de G73b: los privilegios por defecto
 * del esquema `public` concedían `arwdDxtm` a `anon` sobre cada tabla futura,
 * porque el `REVOKE ON ALL TABLES` de la migración 0009 solo alcanzó a las
 * tablas que existían aquel día. Medido antes de la migración 0015:
 * `anon_insert = true` sobre una tabla recién creada.
 *
 * ── POR QUÉ EL ROL IMPORTA MÁS QUE EL RESULTADO ─────────────────────────────
 *
 * Un verde con `acierta_ci` no dice NADA sobre producción: es exactamente el
 * verde que tuvieron G65, G66, G67, G71 y G72 mientras el control estaba
 * muerto. Por eso, si no corre con el rol de producción, esta sonda sale en
 * AMARILLO y con código de salida distinto de cero salvo que se le pase
 * `--permitir-rol-no-productivo` de forma explícita.
 *
 *   DATABASE_URL=<cadena de producción> pnpm security:grants
 *   pnpm security:grants --permitir-rol-no-productivo   # solo para CI local
 *
 * ── CÓMO SE COMPRUEBA QUE EL ROJO ES ALCANZABLE ─────────────────────────────
 *
 *   REVOKE USAGE ON SCHEMA app_security FROM acierta_app, acierta_prod;
 *   → G1 y G2 en rojo.  Restaurar con la migración 0015.
 */
import { PrismaClient } from '@prisma/client';
import { getAuthEmails } from '../../src/lib/db/auth-users';

const ROL_DE_PRODUCCION = 'acierta_prod';
const PERMITIR_NO_PROD = process.argv.includes('--permitir-rol-no-productivo');

const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });

interface Check {
  id: string;
  ok: boolean;
  detalle: string;
}
const checks: Check[] = [];
const record = (id: string, ok: boolean, detalle: string): void => {
  checks.push({ id, ok, detalle });
};

/** Sujeto irrepetible: la sonda nunca debe pisar el cubo de un usuario real. */
const SUJETO = `g73b-grants-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

async function main(): Promise<void> {
  const [{ rol }] = await prisma.$queryRaw<Array<{ rol: string }>>`SELECT current_user AS rol`;
  console.log(`\nG73b — sonda de privilegios POR EFECTO`);
  console.log(`Rol de base de datos en uso: ${rol}\n`);

  const esProd = rol === ROL_DE_PRODUCCION;
  if (!esProd) {
    console.log(
      `  ⚠️  Este NO es el rol de producción (${ROL_DE_PRODUCCION}).\n` +
        `      Los privilegios se conceden POR ROL: un verde aquí no dice nada\n` +
        `      sobre producción. Así sobrevivió el defecto de G65 hasta G73.\n`
    );
  }

  // ── G1. El limitador de tasa CUENTA de verdad ────────────────────────────
  //
  // El síntoma exacto del defecto de G73 era `hits: 0` en cada llamada (el
  // `catch` que falla abierto devuelve el veredicto vacío). Si el contador no
  // sube 1, 2, 3…, el control no está contando nada.
  const { consumeRateLimit, resetRateLimit, RATE_LIMITS } = await import(
    '../../src/lib/rate-limit/store'
  );
  // `resetRateLimit` SÍ lanza cuando falta el privilegio (a diferencia de
  // `consumeRateLimit`, que falla abierto). Se tolera aquí a propósito: el
  // objetivo es que la sonda llegue a las comprobaciones de EFECTO y las
  // pinte en rojo con su diagnóstico, no que reviente con un stack antes de
  // comprobar nada. Un rojo legible es lo que hace que alguien lo arregle.
  const limpiar = async (sujeto: string): Promise<void> => {
    try {
      await resetRateLimit('SIGN_IN', sujeto);
    } catch {
      /* el propio fallo se reporta en G1/G2 */
    }
  };
  {
    await limpiar(SUJETO);
    const hits: number[] = [];
    for (let i = 0; i < 3; i++) hits.push((await consumeRateLimit('SIGN_IN', SUJETO)).hits);
    const cuenta = hits.join(',') === '1,2,3';
    record(
      'G1-el-limitador-cuenta',
      cuenta,
      cuenta
        ? 'tres intentos → hits 1,2,3 (el contador escribe en Postgres)'
        : `hits observados: [${hits.join(',')}] — 0 significa que consumeRateLimit falló ABIERTO`
    );
  }

  // ── G2. …y BLOQUEA en el presupuesto ─────────────────────────────────────
  //
  // Contar sin bloquear tampoco sirve. Se agota el presupuesto de login y se
  // exige un veredicto denegado con `Retry-After` real.
  {
    const { limit } = RATE_LIMITS.SIGN_IN;
    await limpiar(SUJETO);
    let ultimo = { allowed: true, hits: 0, retryAfterSecs: 0 };
    for (let i = 0; i < limit + 1; i++) ultimo = await consumeRateLimit('SIGN_IN', SUJETO);
    record(
      'G2-el-limitador-bloquea',
      !ultimo.allowed && ultimo.retryAfterSecs > 0,
      ultimo.allowed
        ? `el intento ${limit + 1} de ${limit} SIGUIÓ PERMITIDO — el freno de fuerza bruta no existe`
        : `bloqueado en el intento ${ultimo.hits} (presupuesto ${limit}), Retry-After ${ultimo.retryAfterSecs}s`
    );
    await limpiar(SUJETO);
  }

  // ── G3. Los correos programados resuelven destinatario ───────────────────
  //
  // El defecto original de F-06. Se ataca `getAuthEmails` directamente porque
  // el conteo del cron no distingue "no había a quién escribir" de "reventó".
  {
    const perfiles = await prisma.userProfile.findMany({ select: { id: true }, take: 50 });
    if (perfiles.length === 0) {
      record('G3-correos-resuelven', false, 'no hay perfiles: la sonda no puede comprobar nada');
    } else {
      try {
        const emails = await getAuthEmails(perfiles.map((p) => p.id));
        record(
          'G3-correos-resuelven',
          emails.size > 0,
          `${emails.size}/${perfiles.length} perfiles con correo resoluble`
        );
      } catch (err) {
        record(
          'G3-correos-resuelven',
          false,
          `getAuthEmails lanzó: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }
  }

  // ── G4. Ninguna tabla FUTURA de `public` nacerá escribible por el navegador ─
  //
  // Segundo hallazgo de G73b, misma familia que el primero. `anon` es el rol
  // de la llave pública que viaja en el bundle del navegador. Los privilegios
  // por defecto de un proyecto Supabase le conceden `arwdDxtm` (escritura
  // incluida) sobre cada tabla NUEVA de `public`; el `REVOKE ON ALL TABLES` de
  // la migración 0009 solo alcanzó a las tablas que existían aquel día.
  // Medido en producción antes de la migración 0015: una tabla recién creada
  // nacía con INSERT, UPDATE, DELETE y TRUNCATE abiertos a `anon`.
  //
  // La lista de creadores que se revisa NO está escrita a mano: sale de
  // `pg_default_acl`, o sea de la propia base. Un rol nuevo que aparezca ahí
  // se revisa solo.
  //
  // `supabase_admin` se informa aparte y no pone la sonda en rojo: sus
  // privilegios por defecto NO son alterables desde este proyecto (`postgres`
  // no es miembro suyo) y ese rol no crea tablas de la aplicación. Un rojo
  // permanente e incorregible enseña a ignorar la prueba — G69 §8.4.
  {
    const acls = await prisma.$queryRaw<
      Array<{ creador: string; esquema: string; acl: string }>
    >`
      SELECT r.rolname AS creador, n.nspname AS esquema, d.defaclacl::text AS acl
        FROM pg_default_acl d
        JOIN pg_roles r ON r.oid = d.defaclrole
        JOIN pg_namespace n ON n.oid = d.defaclnamespace
       WHERE n.nspname IN ('public', 'app_security') AND d.defaclobjtype = 'r'
    `;
    // `arwdDxt` = INSERT/SELECT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER.
    // Nos interesan solo los de ESCRITURA: a=INSERT, w=UPDATE, d=DELETE, D=TRUNCATE.
    const escribe = (acl: string, rolQueRecibe: string): boolean => {
      const m = new RegExp(`${rolQueRecibe}=([a-zA-Z*]*)/`).exec(acl);
      return m ? /[awdD]/.test(m[1].replace(/\*/g, '')) : false;
    };
    const propios = acls.filter((a) => a.creador !== 'supabase_admin');
    const abiertos = propios.filter(
      (a) => escribe(a.acl, 'anon') || escribe(a.acl, 'authenticated')
    );
    record(
      'G4-tabla-futura-cerrada-a-anon',
      abiertos.length === 0,
      abiertos.length === 0
        ? `${propios.length} juego(s) de privilegios por defecto revisados; ninguno da escritura a anon/authenticated`
        : `creadores que abrirían una tabla nueva al navegador: ${abiertos.map((a) => `${a.creador}→${a.esquema}`).join(', ')}`
    );
    const ajenos = acls.filter(
      (a) => a.creador === 'supabase_admin' && (escribe(a.acl, 'anon') || escribe(a.acl, 'authenticated'))
    );
    if (ajenos.length > 0) {
      console.log(
        `  ℹ️  Riesgo residual documentado: los privilegios por defecto de ` +
          `supabase_admin sobre ${ajenos.map((a) => a.esquema).join(', ')} sí dan escritura a ` +
          `anon/authenticated. No son alterables desde este proyecto y ese rol no crea ` +
          `tablas de la aplicación. Ver docs/AUDITORIA_SEGURIDAD.md §18.\n`
      );
    }

    // Y la contraparte: la app tiene que seguir alcanzando lo que se cree.
    const [{ app_en_defaults }] = await prisma.$queryRaw<Array<{ app_en_defaults: boolean }>>`
      SELECT bool_or(d.defaclacl::text LIKE '%acierta_app=%') AS app_en_defaults
        FROM pg_default_acl d JOIN pg_namespace n ON n.oid = d.defaclnamespace
       WHERE n.nspname = 'public' AND d.defaclobjtype = 'r'
    `;
    record(
      'G5-la-app-hereda-lo-nuevo-por-grupo',
      app_en_defaults === true,
      app_en_defaults
        ? 'los privilegios por defecto nombran al GRUPO acierta_app, no a roles de conexión'
        : 'ningún privilegio por defecto apunta al grupo: una tabla nueva dejaría a la app fuera'
    );
  }

  // ── G6b. El rol de la app no puede crear tablas (mínimo privilegio) ───────
  {
    const [{ puede }] = await prisma.$queryRaw<Array<{ puede: boolean }>>`
      SELECT has_schema_privilege(current_user, 'public', 'CREATE') AS puede
    `;
    record(
      'G6b-la-app-no-crea-tablas',
      !puede,
      puede
        ? `${rol} puede CREATE en public: podría fabricar tablas fuera de toda migración`
        : `${rol} no tiene CREATE en public (las migraciones las aplica postgres)`
    );
  }

  // ── G6. Ningún rol de conexión aparece nombrado en los privilegios ───────
  //
  // La comprobación del guardrail mismo: si alguien vuelve a escribir una
  // lista de roles a mano, esto se pone rojo. Los privilegios de la app tienen
  // que colgar del GRUPO.
  {
    const filas = await prisma.$queryRaw<Array<{ rolname: string }>>`
      SELECT rolname FROM pg_roles
       WHERE rolcanlogin AND rolname LIKE 'acierta\\_%'
         AND NOT pg_has_role(rolname, 'acierta_app', 'USAGE')
    `;
    record(
      'G6-todo-rol-de-la-app-en-el-grupo',
      filas.length === 0,
      filas.length === 0
        ? 'todos los roles de conexión del proyecto heredan de acierta_app'
        : `fuera del grupo: ${filas.map((f) => f.rolname).join(', ')} — recibirán privilegios solo si alguien los nombra a mano`
    );
  }

  // ── Veredicto ────────────────────────────────────────────────────────────
  console.log('┌─ Resultado ────────────────────────────────────────────────');
  for (const c of checks) console.log(`│ ${c.ok ? '✅' : '❌'} ${c.id.padEnd(34)} ${c.detalle}`);
  console.log('└────────────────────────────────────────────────────────────\n');

  const rojos = checks.filter((c) => !c.ok);
  if (rojos.length > 0) {
    console.error(`✗ ${rojos.length} comprobación(es) en rojo con el rol ${rol}.`);
    process.exitCode = 1;
    return;
  }
  if (!esProd && !PERMITIR_NO_PROD) {
    console.error(
      `✗ Todo en verde, pero con el rol ${rol}, NO con ${ROL_DE_PRODUCCION}.\n` +
        `  Este verde es precisamente el que tuvieron G65-G72 mientras el limitador\n` +
        `  estaba muerto en producción. Corre la sonda con el DATABASE_URL real, o\n` +
        `  acepta el resultado a sabiendas con --permitir-rol-no-productivo.`
    );
    process.exitCode = 1;
    return;
  }
  console.log(`✓ Los privilegios de la app funcionan con el rol ${rol}.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
