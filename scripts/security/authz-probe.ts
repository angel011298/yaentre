import '../lib/env';

/**
 * G65 — Sonda ACTIVA de autorización en la CAPA DE APLICACIÓN.
 *
 * La sonda hermana (`isolation-probe.ts`) ataca por PostgREST y prueba RLS.
 * Ésta ataca por dentro: llama a las MISMAS funciones que ejecuta cada Server
 * Action justo después de su guard, pero cambiando el identificador — que es
 * exactamente lo que puede hacer un usuario autenticado manipulando el cuerpo
 * de la petición. Prisma corre con `acierta_ci` (BYPASSRLS), así que aquí NO
 * hay red de RLS: lo único que separa a un alumno de los datos de otro es la
 * verificación de propiedad del propio código.
 *
 * Uso: pnpm security:authz
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });

interface Check {
  id: string;
  descripcion: string;
  bloqueado: boolean;
  detalle: string;
}

const checks: Check[] = [];

function record(id: string, descripcion: string, bloqueado: boolean, detalle: string): void {
  checks.push({ id, descripcion, bloqueado, detalle });
}

/** Ejecuta `fn`; se considera BLOQUEADO si lanza o si `esFuga` dice que no hubo fuga. */
async function attempt(
  id: string,
  descripcion: string,
  fn: () => Promise<unknown>,
  esFuga: (resultado: unknown) => boolean
): Promise<void> {
  try {
    const out = await fn();
    const fuga = esFuga(out);
    record(id, descripcion, !fuga, `devolvió ${JSON.stringify(out)?.slice(0, 220)}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message.split('\n')[0] : String(err);
    record(id, descripcion, true, `rechazado: ${msg.slice(0, 160)}`);
  }
}

/**
 * Ningún esquema Zod del borde (Server Action o Route Handler) debe aceptar un
 * identificador de usuario. Es la premisa de la que cuelga toda la capa de
 * autorización: el `userProfileId` sale SIEMPRE del guard, nunca del cliente.
 */
async function assertNoUserIdAtTheEdge(): Promise<void> {
  const sospechoso = /(userProfileId|studentProfileId|parentProfileId|authUserId|userId)\s*:/;
  const permitido = /counterpartProfileId/; // el vínculo a romper, verificado contra el que llama
  const archivos: string[] = [];

  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.ts')) archivos.push(full);
    }
  };
  walk(join(process.cwd(), 'app', 'actions'));
  walk(join(process.cwd(), 'app', 'api'));

  const ofensores: string[] = [];
  for (const file of archivos) {
    const src = readFileSync(file, 'utf-8');
    // Solo los bloques de esquema Zod: es ahí donde se declara lo que el
    // cliente puede mandar.
    for (const bloque of src.split('z.object(')) {
      const cuerpo = bloque.slice(0, bloque.indexOf('})') + 2);
      if (sospechoso.test(cuerpo) && !permitido.test(cuerpo)) {
        ofensores.push(`${file.replace(process.cwd(), '.')}`);
        break;
      }
    }
  }

  record(
    'C-sin-id-en-el-borde',
    'ningún esquema de entrada acepta un identificador de usuario',
    ofensores.length === 0,
    ofensores.length === 0
      ? `${archivos.length} archivos de borde revisados, 0 aceptan un id de usuario`
      : `aceptan un id de usuario: ${ofensores.join(', ')}`
  );
}

async function main(): Promise<void> {
  const sessionsDb = await import('../../src/lib/db/sessions');
  const drillDb = await import('../../src/lib/db/drill');
  const parentDb = await import('../../src/lib/db/parent');
  const simulatorDb = await import('../../src/lib/db/simulator');

  const VICTIMA = 'e2e_sim_user';
  const ATACANTE = 'e2e_free_user';

  // Una sesión REAL de la víctima y sus reactivos.
  const sesionVictima = await prisma.examSession.findFirstOrThrow({
    where: { userProfileId: VICTIMA, mode: 'FULL_SIMULATION' },
    include: { answers: { select: { questionId: true } } },
  });

  // Una sesión de práctica REAL del atacante (revela correctitud al responder).
  const drill = await drillDb.startDrillSession(ATACANTE, { kind: 'area' });
  const sesionAtacante = drill.ok ? drill.payload.sessionId : null;

  // ── G69: el reactivo del ataque tiene que ser AJENO a la práctica ────────
  //
  // Antes se tomaba `answers[0]` sin más. `selectNextAdaptiveQuestions` baraja
  // con `Math.random()` (`src/lib/adaptive/selector.ts`), así que de vez en
  // cuando ese mismo reactivo caía TAMBIÉN en la práctica del atacante — y
  // entonces responderlo es legítimo: la sonda reportaba «fuga de la clave»
  // por su propio azar, no por un agujero. Un rojo que aparece una de cada
  // varias corridas es peor que no tener la prueba, porque enseña a ignorarla.
  //
  // Ahora se elige un reactivo del simulacro de la víctima que NO esté
  // asignado a la práctica del atacante, que es exactamente lo que la prueba
  // quiere decir: «un reactivo que no es tuyo».
  const asignadosAlAtacante = sesionAtacante
    ? new Set(
        (
          await prisma.sessionAnswer.findMany({
            where: { sessionId: sesionAtacante },
            select: { questionId: true },
          })
        ).map((a) => a.questionId)
      )
    : new Set<string>();

  const questionIdVictima = (
    sesionVictima.answers.find((a) => !asignadosAlAtacante.has(a.questionId)) ??
    sesionVictima.answers[0]!
  ).questionId;

  console.log('G65 — sonda activa de autorización (capa de aplicación)\n');
  console.log(`  víctima : ${VICTIMA} (sesión ${sesionVictima.id})`);
  console.log(`  atacante: ${ATACANTE}${sesionAtacante ? ` (sesión ${sesionAtacante})` : ''}\n`);

  // ── 1. Mutar la sesión de OTRO alumno ─────────────────────────────────────
  await attempt(
    'A-submit-ajeno',
    'atacante responde en la sesión de la víctima',
    () =>
      sessionsDb.submitAnswer({
        userProfileId: ATACANTE,
        sessionId: sesionVictima.id,
        questionId: questionIdVictima,
        selectedOption: 'A',
        position: 0,
        timeSpentSecs: 1,
      }),
    () => true
  );

  await attempt(
    'A-finish-ajeno',
    'atacante cierra la sesión de la víctima',
    () =>
      sessionsDb.finishSession({
        userProfileId: ATACANTE,
        sessionId: sesionVictima.id,
      }),
    () => true
  );

  await attempt(
    'A-sync-ajeno',
    'atacante sincroniza respuestas en la sesión de la víctima',
    () =>
      simulatorDb.recordSimulatorSync({
        userProfileId: ATACANTE,
        sessionId: sesionVictima.id,
        answers: [{ questionId: questionIdVictima, selectedOption: 'A', position: 0, timeSpentSecs: 1 }],
        integrity: { tabBlurCount: 0, rightClickAttempts: 0, keyboardShortcutAttempts: 0 },
        suspicionEvents: [],
        completedFullscreen: false,
      }),
    (out) => (out as { ok: boolean }).ok === true
  );

  // ── 2. LEER resultados/repaso de otro alumno ──────────────────────────────
  await attempt(
    'A-resultado-ajeno',
    'atacante abre el resultado del simulacro de la víctima',
    () => simulatorDb.loadSimulatorResult(ATACANTE, sesionVictima.id),
    (out) => out !== null
  );

  await attempt(
    'A-repaso-ajeno',
    'atacante abre el repaso (con respuestas correctas) de la víctima',
    () => simulatorDb.loadSimulatorReview(ATACANTE, sesionVictima.id),
    (out) => out !== null
  );

  // ── 3. Panel del tutor sin vínculo ────────────────────────────────────────
  await attempt(
    'A-tutor-sin-vinculo',
    'un perfil cualquiera abre el panel del tutor de un alumno NO vinculado',
    () => parentDb.loadParentDashboardData(ATACANTE, VICTIMA),
    (out) => (out as { kind: string }).kind !== 'not_linked'
  );

  // ── 4. Vinculación parental: solo los dos lados del vínculo ───────────────
  await attempt(
    'A-desvincular-ajeno',
    'atacante rompe un vínculo tutor-alumno del que no forma parte',
    () => parentDb.unlinkParentStudent(ATACANTE, VICTIMA),
    (out) => out === true
  );

  // ── 5. Funciones cuyo dueño llega POR ARGUMENTO ───────────────────────────
  //
  // `buildUserDataExport`, `setNotificationPreference` y `updateDisplayName`
  // reciben el `userProfileId` como parámetro y NO lo re-verifican: quien las
  // llama es responsable de pasar el del guard. Llamarlas aquí con un id ajeno
  // "funciona" por construcción y no probaría nada.
  //
  // Lo que SÍ hay que verificar es el contrato del que depende esa decisión:
  // que ningún identificador de usuario cruce el borde cliente→servidor. Si
  // una Server Action o un Route Handler aceptara un `userProfileId` del
  // cuerpo, estas funciones se volverían un IDOR inmediato. Se comprueba
  // leyendo los archivos, que es donde vive la garantía.
  await assertNoUserIdAtTheEdge();

  // ── 6. FUGA DE LA RESPUESTA CORRECTA (guardrail central) ──────────────────
  if (sesionAtacante) {
    await attempt(
      'A-fuga-clave',
      'atacante responde, en SU práctica, un reactivo del simulacro de la víctima → ¿le revelan la clave?',
      () =>
        sessionsDb.submitAnswer({
          userProfileId: ATACANTE,
          sessionId: sesionAtacante,
          questionId: questionIdVictima,
          selectedOption: 'A',
          position: 0,
          timeSpentSecs: 1,
        }),
      (out) => 'correctOption' in (out as object)
    );
  }

  await attempt(
    'A-fuga-explicacion',
    'atacante pide la explicación (capa 1) de un reactivo que tiene abierto en un simulacro',
    () => drillDb.revealExplanationLayer(ATACANTE, questionIdVictima, 1),
    (out) => (out as { ok: boolean }).ok === true
  );

  // ── Reporte ───────────────────────────────────────────────────────────────
  const fallos = checks.filter((c) => !c.bloqueado);
  console.log('┌─ Resultado ──────────────────────────────────────────────────');
  for (const c of checks) {
    console.log(
      `│ ${c.bloqueado ? '✅ BLOQUEADO' : '❌ PERMITIDO'}  ${c.id.padEnd(22)} ${c.descripcion}`
    );
    console.log(`│      ↳ ${c.detalle}`);
  }
  console.log('└──────────────────────────────────────────────────────────────');
  console.log(`\n${checks.length - fallos.length}/${checks.length} intentos ilegítimos bloqueados.`);
  if (fallos.length > 0) {
    console.log(`\n⚠️  ${fallos.length} AGUJERO(S):`);
    for (const f of fallos) console.log(`   - ${f.id}: ${f.descripcion}`);
    process.exitCode = 1;
  }

  // Limpieza: la sonda BORRA la sesión de práctica que abrió, no la marca
  // como abandonada. Dejarla viva contaminaba la corrida siguiente — una
  // respuesta escrita por la sonda en una sesión abandonada cumple la regla de
  // `hasEarnedExplanation` y hacía que el chequeo de fuga de explicación
  // saliera "PERMITIDO" por su propio residuo, no por un agujero real.
  if (sesionAtacante) {
    await prisma.sessionAnswer.deleteMany({ where: { sessionId: sesionAtacante } });
    await prisma.examSession.deleteMany({ where: { id: sesionAtacante } });
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
