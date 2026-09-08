/**
 * scripts/g73/scheduled-emails-probe.ts — G73.
 *
 * Sonda de REGRESIÓN de los tres correos programados (F-06). No manda ningún
 * correo: comprueba lo ÚNICO que los tuvo rotos en silencio desde G59 —
 * que el rol de la app pueda RESOLVER el correo del destinatario.
 *
 * Por qué existe. `runDailyNotificationJobs` devuelve `{streakRisk, …}` con
 * ceros tanto cuando no hay destinatarios legítimos como cuando la consulta
 * de correos revienta: el runner aísla cada job con `Promise.allSettled` y
 * `sendEmail` nunca lanza. Es decir, el modo de fallo real de esta función es
 * INDISTINGUIBLE de "hoy no tocaba mandar nada". Por eso la sonda no mira el
 * conteo del cron: ataca `getAuthEmails` directamente y exige filas.
 *
 * Los dos defectos que habría atrapado (ambos reales, ambos en producción):
 *   1. `42501 permission denied for schema auth` — el rol no alcanzaba
 *      `auth.users`. Además, el rol de PRODUCCIÓN es `acierta_prod`, no
 *      `acierta_ci`: correr esto con las credenciales de CI y darlo por bueno
 *      es precisamente cómo el defecto sobrevivió a las fases G65-G72.
 *   2. `42883 operator does not exist: uuid = text` — el JOIN comparaba
 *      `auth.users.id` (uuid) con `user_profiles."userId"` (text) sin cast.
 *
 * El rojo es alcanzable: revocar el EXECUTE de
 * `app_security.auth_emails_for_profiles` la pone en rojo de inmediato.
 *
 *   pnpm verify:emails                 # contra DATABASE_URL del entorno
 *   DATABASE_URL=<prod> pnpm verify:emails
 */
import { prisma } from '../g71/db';
import { getAuthEmails } from '../../src/lib/db/auth-users';

interface Check {
  nombre: string;
  ok: boolean;
  detalle: string;
}

async function main() {
  const checks: Check[] = [];

  const dbUser = await prisma.$queryRaw<Array<{ rol: string }>>`SELECT current_user AS rol`;
  const rol = dbUser[0]?.rol ?? '?';
  console.log(`\nRol de base de datos en uso: ${rol}`);
  if (rol !== 'acierta_prod') {
    console.log(
      '  ⚠️  No es el rol de PRODUCCIÓN. Los privilegios se conceden por rol:\n' +
        '      un verde aquí NO dice nada sobre producción (así sobrevivió el defecto de G59).'
    );
  }

  const profiles = await prisma.userProfile.findMany({ select: { id: true } });
  if (profiles.length === 0) {
    console.error('\n✗ No hay perfiles en esta base: la sonda no puede comprobar nada.');
    process.exitCode = 1;
    return;
  }

  const ids = profiles.map((p) => p.id);
  let emails = new Map<string, string>();
  try {
    emails = await getAuthEmails(ids);
    checks.push({
      nombre: 'getAuthEmails no lanza',
      ok: true,
      detalle: `${ids.length} perfiles consultados`,
    });
  } catch (err) {
    checks.push({
      nombre: 'getAuthEmails no lanza',
      ok: false,
      detalle: err instanceof Error ? err.message : String(err),
    });
  }

  checks.push({
    nombre: 'resuelve al menos un correo real',
    ok: emails.size > 0,
    detalle: `${emails.size}/${ids.length} perfiles con correo`,
  });

  // Que devuelva ALGO no basta: el mapa tiene que venir indexado por
  // `UserProfile.id` (lo que los tres jobs le pasan), no por el id de Auth.
  const indexadoBien = emails.size > 0 && [...emails.keys()].every((k) => ids.includes(k));
  checks.push({
    nombre: 'mapa indexado por UserProfile.id',
    ok: indexadoBien,
    detalle:
      emails.size === 0
        ? 'sin correos que comprobar (la consulta no devolvió nada)'
        : indexadoBien
          ? 'todas las claves son ids de perfil'
          : 'hay claves que no son ids de perfil',
  });

  console.log('');
  for (const c of checks) {
    console.log(`  ${c.ok ? '✓' : '✗'} ${c.nombre.padEnd(38)} ${c.detalle}`);
  }

  const fallidos = checks.filter((c) => !c.ok);
  if (fallidos.length > 0) {
    console.error(
      `\n✗ ${fallidos.length} comprobación(es) en rojo — los 3 correos programados ` +
        `(resumen semanal, racha en riesgo, countdown) NO llegarían a nadie, y el cron ` +
        `seguiría respondiendo HTTP 200 con ceros.`
    );
    process.exitCode = 1;
    return;
  }
  console.log('\n✓ Los destinatarios de los correos programados se resuelven correctamente.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
