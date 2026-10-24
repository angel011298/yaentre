import { randomBytes } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import { isValidClabe } from '../../../src/lib/teachers/onboarding';
import { PERSONAS, type PersonaName } from './personas';
import { localServerEnv, readStackFile } from './stack-env';

const DAY = 86_400_000;

/** CLABE de prueba con dígito verificador correcto (algoritmo de Banxico). */
function testClabe(): string {
  const base = '01218001581234567';
  for (let d = 0; d <= 9; d++) if (isValidClabe(`${base}${d}`)) return `${base}${d}`;
  throw new Error('sin CLABE');
}

/**
 * G103 — prepara la pila LOCAL antes de cada corrida: borra lo que dejó la
 * anterior, crea las cuentas de prueba en el Auth local con contraseñas
 * nuevas y arma sus perfiles. Antes de escribir NADA comprueba que la base es
 * la local (tabla-marcador que solo existe ahí); el cliente de Prisma recibe
 * la URL explícita, sin depender de ningún `.env`.
 */
export default async function globalSetup() {
  const stack = readStackFile();
  Object.assign(process.env, localServerEnv(stack));

  const prisma = new PrismaClient({ datasources: { db: { url: stack.DB_URL } } });
  try {
    const marker = await prisma.$queryRawUnsafe<Array<{ n: number }>>(
      `select count(*)::int as n from information_schema.tables where table_schema='public' and table_name='__e2e_local_marker'`
    );
    if (marker[0]?.n !== 1) throw new Error('La base NO es la pila local de e2e (falta __e2e_local_marker). Abortando.');

    await prisma.$executeRawUnsafe(
      'TRUNCATE public.user_profiles, public.processed_stripe_events, public.admin_audit_log, public.admin_files, public.admin_notes CASCADE'
    );
    await prisma.$executeRawUnsafe('TRUNCATE app_security.rate_limit_hits');

    const supabase = createClient(stack.API_URL, stack.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const { data: list, error: listErr } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    if (listErr) throw listErr;
    for (const u of list.users) await supabase.auth.admin.deleteUser(u.id);
    for (const bucket of ['course-videos', 'teacher-documents']) await supabase.storage.emptyBucket(bucket);

    const exam = await prisma.exam.findFirstOrThrow({
      where: { level: { institution: { code: 'UNAM' }, type: 'SUPERIOR' } },
      orderBy: { year: 'desc' },
      include: { areas: { orderBy: { code: 'asc' }, take: 1, include: { careers: { take: 1 } } } },
    });
    const career = exam.areas[0]?.careers[0];
    if (!career) throw new Error('La pila local no tiene carreras: corre la siembra (README).');

    const now = Date.now();
    const ids: Partial<Record<PersonaName, string>> = {};
    for (const [name, p] of Object.entries(PERSONAS) as Array<[PersonaName, (typeof PERSONAS)[PersonaName]]>) {
      const password = randomBytes(18).toString('base64url');
      const { data, error } = await supabase.auth.admin.createUser({ email: p.email, password, email_confirm: true });
      if (error || !data.user) throw error ?? new Error(`No se creó ${p.email}`);
      process.env[`E2E_PW_${name.toUpperCase()}`] = password;
      const profile = await prisma.userProfile.create({
        data: {
          userId: data.user.id,
          role: p.role,
          displayName: name === 'profe' ? 'Profa. Ana' : name,
          onboardingStep: 3,
          diagnosticDone: true,
          targetExamId: exam.id,
          targetCareerId: career.id,
        },
      });
      ids[name] = profile.id;
    }

    const activeUntil = (days: number) => new Date(now + days * DAY);
    await prisma.subscription.create({
      data: {
        userProfileId: ids.premium!,
        plan: 'PREMIUM',
        status: 'ACTIVE',
        season: 'EARLY_BIRD',
        hasGuarantee: true,
        startedAt: new Date(now - 10 * DAY),
        expiresAt: activeUntil(355),
        graceEndsAt: activeUntil(362),
      },
    });
    await prisma.subscription.create({
      data: {
        userProfileId: ids.vence!,
        plan: 'PREMIUM',
        status: 'ACTIVE',
        season: 'EARLY_BIRD',
        hasGuarantee: true,
        startedAt: new Date(now - 360 * DAY),
        expiresAt: activeUntil(5),
        graceEndsAt: activeUntil(12),
      },
    });

    await prisma.teacher.create({
      data: {
        userProfileId: ids.profe!,
        displayName: 'Profa. Ana',
        bio: 'Profesora independiente verificada en YaEntre. Matemáticas para admisión y regularización.',
        fullName: 'Ana Pérez García',
        curp: 'PEGA800101MDFRRN09',
        phone: '5512345678',
        clabe: testClabe(),
        bankName: 'BBVA',
        paymentRail: 'ASIMILADOS',
        status: 'ACTIVE',
        onboardedAt: new Date(now - 30 * DAY),
        contractAcceptedAt: new Date(now - 30 * DAY),
        contractVersion: 'e2e-local',
        ndaAcceptedAt: new Date(now - 30 * DAY),
        recordingPolicyAcceptedAt: new Date(now - 30 * DAY),
        subjects: {
          create: [
            { subjectKey: 'matematicas', track: 'ADMISION' },
            { subjectKey: 'reg_matematicas', track: 'REGULARIZACION' },
          ],
        },
      },
    });

    // Progreso previo de «vence»: tiene que sobrevivir a la expiración.
    await prisma.streakRecord.create({
      data: { userProfileId: ids.vence!, currentStreak: 4, longestStreak: 9, totalActiveDays: 12, lastActivityDate: new Date(now - DAY) },
    });

    process.env.E2E_PROFILE_IDS = JSON.stringify(ids);
  } finally {
    await prisma.$disconnect();
  }
}
