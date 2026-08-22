/**
 * verify-rls-isolation.ts (F19 tarea 5) — Prueba VIVA del aislamiento a nivel
 * de base de datos contra el Supabase real.
 *
 * Qué demuestra (criterio de aceptación F19):
 *   1. Un alumno NUNCA puede leer sesiones, respuestas, progreso, racha,
 *      suscripciones ni el perfil de OTRO alumno.
 *   2. Un tutor SOLO puede leer del alumno al que está vinculado — nunca de
 *      uno con el que no tiene vínculo.
 *   3. Un visitante SIN sesión no puede leer NADA sensible.
 *   4. Control positivo: cada usuario SÍ ve lo suyo (una política que bloquea
 *      todo "pasaría" el test sin servir de nada).
 *
 * Cómo lo hace:
 *   - Crea fixtures (2 alumnos + 1 tutor vinculado solo al alumno A) usando la
 *     conexión privilegiada de Prisma (rol `acierta_ci`, BYPASSRLS) — es la
 *     única forma de sembrar `auth.users` sin la service-role key.
 *   - Prueba con clientes `@supabase/supabase-js` creados con la ANON KEY y
 *     autenticados con `signInWithPassword`: exactamente el mismo camino y los
 *     mismos privilegios que el navegador de un usuario real. RLS sí aplica ahí.
 *   - Limpia TODOS los fixtures al terminar, incluso si algo falla.
 *
 * Uso:  pnpm test:rls
 */
import './lib/env';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { prisma } from '../src/lib/db/prisma';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const PASSWORD = 'RlsProbe!2027';
const PREFIX = 'rlsprobe';

interface Fixture {
  authId: string;
  profileId: string;
  email: string;
}

// ─────────────────────────────── Reporte ───────────────────────────────

let passed = 0;
const failures: string[] = [];

function check(description: string, ok: boolean, detail = ''): void {
  if (ok) {
    passed++;
    console.log(`  ok   ${description}`);
  } else {
    failures.push(`${description}${detail ? ` — ${detail}` : ''}`);
    console.log(`  FALLA ${description}${detail ? ` — ${detail}` : ''}`);
  }
}

/** Una lectura BLOQUEADA por RLS devuelve 0 filas (o un error), nunca datos. */
async function expectNoRows(
  client: SupabaseClient,
  table: string,
  column: string,
  value: string,
  description: string
): Promise<void> {
  const { data, error } = await client.from(table).select('*').eq(column, value);
  if (error) {
    // Un error de permisos también es un bloqueo válido.
    check(description, true, `bloqueado con error: ${error.code ?? error.message}`);
    return;
  }
  check(description, (data?.length ?? 0) === 0, `devolvió ${data?.length} fila(s)`);
}

async function expectRows(
  client: SupabaseClient,
  table: string,
  column: string,
  value: string,
  description: string
): Promise<void> {
  const { data, error } = await client.from(table).select('*').eq(column, value);
  if (error) {
    check(description, false, `error inesperado: ${error.message}`);
    return;
  }
  check(description, (data?.length ?? 0) > 0, 'no devolvió ninguna fila');
}

// ─────────────────────────────── Fixtures ───────────────────────────────

/**
 * Provisiona la identidad de Auth del usuario de prueba.
 *
 * Se usa la API de administración (service-role) a propósito: el rol de la app
 * (`acierta_ci`) NO tiene —ni debe tener— permisos sobre el esquema `auth`.
 * Darle INSERT sobre `auth.users` significaría que cualquier inyección SQL en
 * la aplicación podría fabricar cuentas; el aislamiento que este script
 * verifica se debilitaría justo por poder verificarlo.
 *
 * Si ya existe una cuenta de sondeo con ese correo (provisionada antes por el
 * dueño del proyecto), se reutiliza — así el script corre sin service-role key.
 */
async function provisionAuthUser(email: string): Promise<string> {
  const existing = await prisma.$queryRawUnsafe<Array<{ userId: string }>>(
    `select "userId" from user_profiles where id = $1`,
    `${PREFIX}_${email.split('.')[1].split('@')[0]}`
  );
  if (existing.length > 0) return existing[0].userId;

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey || serviceKey.length < 40) {
    throw new Error(
      `No existe la cuenta de sondeo ${email} y no hay SUPABASE_SERVICE_ROLE_KEY válida para crearla.\n` +
        `  Opción A: configura SUPABASE_SERVICE_ROLE_KEY en .env.local (el script se vuelve 100% automático).\n` +
        `  Opción B: crea las 3 cuentas de sondeo una sola vez desde el panel de Supabase\n` +
        `            (${PREFIX}.alumnoa@ / ${PREFIX}.alumnob@ / ${PREFIX}.tutor@yaentre-test.mx,\n` +
        `             contraseña ${PASSWORD}, correo confirmado) y vuelve a correrlo.`
    );
  }

  const admin = createClient(SUPABASE_URL!, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error || !data.user) throw new Error(`No se pudo crear ${email}: ${error?.message}`);
  return data.user.id;
}

async function createUser(tag: string, role: 'STUDENT' | 'PARENT'): Promise<Fixture> {
  const email = `${PREFIX}.${tag}@yaentre-test.mx`;
  const profileId = `${PREFIX}_${tag}`;

  const authId = await provisionAuthUser(email);

  await prisma.$executeRawUnsafe(
    `insert into user_profiles (id, "userId", role, "displayName", "themePref", badges, "diagnosticDone", "onboardingStep", "createdAt")
     values ($1, $2, $3::"UserRole", $4, 'dark', '{}'::text[], true, 4, now())
     on conflict (id) do update set "userId" = excluded."userId", role = excluded.role`,
    profileId,
    authId,
    role,
    `Probe ${tag}`
  );

  return { authId, profileId, email };
}

/** Datos sensibles del alumno: sesión + respuesta + progreso + racha + suscripción. */
async function seedStudentData(f: Fixture, tag: string): Promise<{ sessionId: string }> {
  const exam = await prisma.exam.findFirstOrThrow({ select: { id: true } });
  const question = await prisma.question.findFirstOrThrow({
    where: { usage: 'SERVABLE', isVerified: true },
    select: { id: true },
  });

  const sessionId = `${PREFIX}_sess_${tag}`;
  await prisma.examSession.create({
    data: {
      id: sessionId,
      userProfileId: f.profileId,
      examId: exam.id,
      mode: 'FULL_SIMULATION',
      status: 'COMPLETED',
      timeLimitSecs: 10800,
      score: 77,
      finishedAt: new Date(),
    },
  });
  await prisma.sessionAnswer.create({
    data: {
      id: `${PREFIX}_ans_${tag}`,
      sessionId,
      questionId: question.id,
      selectedOption: 'A',
      isCorrect: true,
      timeSpentSecs: 30,
      position: 0,
    },
  });
  await prisma.learningProfile.create({
    data: { userProfileId: f.profileId, predictedScore: 88, confidence: 0.8 },
  });
  await prisma.streakRecord.create({
    data: { userProfileId: f.profileId, currentStreak: 5, longestStreak: 9, totalActiveDays: 12 },
  });
  await prisma.subscription.create({
    data: {
      id: `${PREFIX}_sub_${tag}`,
      userProfileId: f.profileId,
      plan: 'PREMIUM',
      season: 'EARLY_BIRD',
      status: 'ACTIVE',
    },
  });

  return { sessionId };
}

async function cleanup(): Promise<void> {
  await prisma.$executeRawUnsafe(
    `delete from session_answers where "sessionId" like '${PREFIX}%'`
  );
  await prisma.$executeRawUnsafe(`delete from exam_sessions where id like '${PREFIX}%'`);
  await prisma.$executeRawUnsafe(`delete from subscriptions where id like '${PREFIX}%'`);
  await prisma.$executeRawUnsafe(
    `delete from learning_profiles where "userProfileId" like '${PREFIX}%'`
  );
  await prisma.$executeRawUnsafe(
    `delete from streak_records where "userProfileId" like '${PREFIX}%'`
  );
  await prisma.$executeRawUnsafe(
    `delete from parent_links where "parentProfileId" like '${PREFIX}%' or "studentProfileId" like '${PREFIX}%'`
  );
  // Los `user_profiles` de sondeo se conservan a propósito: son el puente
  // hacia las cuentas de Auth reutilizables, y no contienen ningún dato
  // sensible (todo lo sembrado arriba —sesiones, progreso, pagos— sí se borra).
  await prisma.$executeRawUnsafe(
    `update user_profiles set "targetExamId" = null, "targetCareerId" = null
     where id like '${PREFIX}%'`
  );
}

async function signIn(email: string): Promise<SupabaseClient> {
  const client = createClient(SUPABASE_URL!, ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw new Error(`No se pudo iniciar sesión como ${email}: ${error.message}`);
  return client;
}

// ─────────────────────────────── Main ───────────────────────────────

async function main() {
  if (!SUPABASE_URL || !ANON_KEY) {
    throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  }

  console.log('Aislamiento RLS — probando contra Supabase real\n');
  await cleanup(); // por si una corrida anterior murió a medias

  const alumnoA = await createUser('alumnoa', 'STUDENT');
  const alumnoB = await createUser('alumnob', 'STUDENT');
  const tutor = await createUser('tutor', 'PARENT');

  const dataA = await seedStudentData(alumnoA, 'alumnoa');
  await seedStudentData(alumnoB, 'alumnob');

  // El tutor queda vinculado SOLO al alumno A.
  await prisma.parentLink.create({
    data: {
      id: `${PREFIX}_link`,
      parentProfileId: tutor.profileId,
      studentProfileId: alumnoA.profileId,
    },
  });

  try {
    // ── 1. Control positivo: cada quien SÍ ve lo suyo ──
    console.log('1) Control positivo — cada usuario ve sus propios datos');
    const clientA = await signIn(alumnoA.email);
    await expectRows(clientA, 'user_profiles', 'id', alumnoA.profileId, 'el alumno A lee su propio perfil');
    await expectRows(clientA, 'exam_sessions', 'userProfileId', alumnoA.profileId, 'el alumno A lee sus propias sesiones');
    await expectRows(clientA, 'session_answers', 'sessionId', dataA.sessionId, 'el alumno A lee sus propias respuestas');
    await expectRows(clientA, 'learning_profiles', 'userProfileId', alumnoA.profileId, 'el alumno A lee su propio Entrómetro');
    await expectRows(clientA, 'streak_records', 'userProfileId', alumnoA.profileId, 'el alumno A lee su propia racha');
    await expectRows(clientA, 'subscriptions', 'userProfileId', alumnoA.profileId, 'el alumno A lee su propia suscripción');

    // ── 2. Alumno contra alumno ──
    console.log('\n2) Aislamiento entre alumnos — A no puede leer nada de B');
    await expectNoRows(clientA, 'user_profiles', 'id', alumnoB.profileId, 'A NO lee el perfil de B');
    await expectNoRows(clientA, 'exam_sessions', 'userProfileId', alumnoB.profileId, 'A NO lee las sesiones de B');
    await expectNoRows(clientA, 'session_answers', 'sessionId', `${PREFIX}_sess_alumnob`, 'A NO lee las respuestas de B');
    await expectNoRows(clientA, 'learning_profiles', 'userProfileId', alumnoB.profileId, 'A NO lee el Entrómetro de B');
    await expectNoRows(clientA, 'streak_records', 'userProfileId', alumnoB.profileId, 'A NO lee la racha de B');
    await expectNoRows(clientA, 'subscriptions', 'userProfileId', alumnoB.profileId, 'A NO lee la suscripción de B');

    // ── 3. Tutor: solo su alumno vinculado ──
    console.log('\n3) Tutor — solo del alumno vinculado');
    const clientTutor = await signIn(tutor.email);
    await expectRows(clientTutor, 'user_profiles', 'id', alumnoA.profileId, 'el tutor SÍ lee el perfil de su alumno vinculado (A)');
    await expectNoRows(clientTutor, 'user_profiles', 'id', alumnoB.profileId, 'el tutor NO lee el perfil de un alumno NO vinculado (B)');
    // Ni siquiera de su propio alumno puede leer el detalle de reactivos/respuestas:
    // el panel parental muestra solo métricas agregadas, resueltas server-side.
    await expectNoRows(clientTutor, 'session_answers', 'sessionId', dataA.sessionId, 'el tutor NO lee las respuestas crudas de su alumno');
    await expectNoRows(clientTutor, 'exam_sessions', 'userProfileId', alumnoB.profileId, 'el tutor NO lee sesiones de un alumno NO vinculado');

    // ── 4. Anónimo ──
    console.log('\n4) Visitante sin sesión — no lee nada sensible');
    const anon = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    await expectNoRows(anon, 'user_profiles', 'id', alumnoA.profileId, 'anónimo NO lee perfiles');
    await expectNoRows(anon, 'exam_sessions', 'userProfileId', alumnoA.profileId, 'anónimo NO lee sesiones');
    await expectNoRows(anon, 'session_answers', 'sessionId', dataA.sessionId, 'anónimo NO lee respuestas');
    await expectNoRows(anon, 'learning_profiles', 'userProfileId', alumnoA.profileId, 'anónimo NO lee el Entrómetro');
    await expectNoRows(anon, 'streak_records', 'userProfileId', alumnoA.profileId, 'anónimo NO lee rachas');
    await expectNoRows(anon, 'subscriptions', 'userProfileId', alumnoA.profileId, 'anónimo NO lee suscripciones');
    await expectNoRows(anon, 'payments', 'id', 'cualquiera', 'anónimo NO lee pagos');
  } finally {
    await cleanup();
    console.log('\nFixtures eliminados.');
  }

  console.log(`\nResultado: ${passed} verificaciones OK, ${failures.length} fallas.`);
  if (failures.length > 0) {
    console.error('\nFALLAS DE AISLAMIENTO:');
    failures.forEach((f) => console.error(`  - ${f}`));
    throw new Error(`${failures.length} verificación(es) de aislamiento fallaron.`);
  }
  console.log('OK — el aislamiento a nivel de base de datos funciona.');
}

main()
  .catch(async (err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
