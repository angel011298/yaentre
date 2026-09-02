import { prisma } from './prisma';
import { computeWeekOverWeekDelta } from './adaptive';
import {
  loadExamCountdown,
  loadHeatmapData,
  loadRecentSimulations,
  type ExamCountdown,
  type HeatmapDay,
  type RecentSimulation,
} from './dashboard';
import { getStreak } from './streak';
import { evaluateParentDashboardGate } from './paywall';
import {
  computeLinkCodeExpiry,
  generateLinkCode,
  isLinkCodeRedeemable,
} from '@/lib/parent/link-code';
import { isInactiveStudent } from '@/lib/parent/inactivity';
import type { GateDecision, PaywallTrigger } from '@/lib/paywall/gates';

/**
 * Orquestación del panel parental (F16). GUARDRAIL central de privacidad
 * (tarea 4): este módulo NUNCA hace `select`/`include` sobre `Question` ni
 * sobre `SessionAnswer.selectedOption`/`isCorrect` — solo reusa loaders ya
 * existentes que agregan (score total, nivel de actividad por día, conteo)
 * y nunca devuelven contenido de examen. La defensa en profundidad a nivel
 * de base de datos ya existe desde F1 (`prisma/migrations/0001_enable_rls.sql`):
 * `exam_sessions`/`session_answers`/`weak_topics`/`streak_records`/
 * `learning_profiles` restringen TODO acceso de fila a `userProfileId =
 * current_profile_id()` — ni siquiera con el rol vinculado hay una excepción
 * de "padre" en esas políticas (a propósito: el padre no debe poder leerlas
 * ni agregadas, vía un cliente Supabase directo con el JWT del padre). Estas
 * funciones solo funcionan porque corren en el servidor con Prisma
 * (`acierta_ci`, BYPASSRLS) — el mismo patrón de acceso que usa toda la app.
 */

const LINK_CODE_GENERATION_ATTEMPTS = 5;

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: string }).code === 'P2002'
  );
}

export interface GeneratedLinkCode {
  code: string;
  expiresAt: Date;
}

/**
 * Genera un código de 6 dígitos para que el alumno lo comparta con su tutor
 * (F16 tarea 1). Invalida cualquier código anterior sin usar de este mismo
 * alumno (vence en el acto) para que solo el más reciente sea válido — evita
 * confusión de "¿cuál código es el de ahora?" si el alumno genera varios.
 */
export async function generateParentLinkCode(
  studentProfileId: string,
  now: Date = new Date()
): Promise<GeneratedLinkCode> {
  await prisma.parentLinkCode.updateMany({
    where: { studentProfileId, usedAt: null, expiresAt: { gt: now } },
    data: { expiresAt: now },
  });

  const expiresAt = computeLinkCodeExpiry(now);

  for (let attempt = 0; attempt < LINK_CODE_GENERATION_ATTEMPTS; attempt++) {
    const code = generateLinkCode();
    try {
      await prisma.parentLinkCode.create({ data: { code, studentProfileId, expiresAt } });
      return { code, expiresAt };
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
      // Colisión (1 en un millón): reintenta con otro código aleatorio.
    }
  }
  throw new Error('No se pudo generar un código de vinculación único. Intenta de nuevo.');
}

export type RedeemLinkCodeResult = 'OK' | 'INVALID_CODE';

/**
 * Canjea un código (F16 tarea 2). Atómico vía `updateMany` con la condición
 * de vigencia en el propio WHERE: si dos peticiones canjean el mismo código
 * a la vez, como mucho una actualiza una fila (`count === 1`); la otra ve
 * `count === 0` y recibe INVALID_CODE — sin necesitar un lock manual.
 */
export async function redeemParentLinkCode(
  parentProfileId: string,
  code: string,
  now: Date = new Date()
): Promise<RedeemLinkCodeResult> {
  const existing = await prisma.parentLinkCode.findUnique({ where: { code } });
  if (!existing || !isLinkCodeRedeemable(existing, now)) return 'INVALID_CODE';

  // G60 — canje + creación del vínculo en UNA transacción. Antes eran dos
  // escrituras sueltas: si `parentLink.upsert` fallaba tras marcar el código
  // como usado, el código quedaba quemado sin vínculo creado y el tutor tenía
  // que pedir otro sin saber por qué. Ahora, o pasan las dos o ninguna.
  return prisma.$transaction(async (tx) => {
    const claimed = await tx.parentLinkCode.updateMany({
      where: { code, usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    });
    if (claimed.count === 0) return 'INVALID_CODE';

    await tx.parentLink.upsert({
      where: {
        parentProfileId_studentProfileId: {
          parentProfileId,
          studentProfileId: existing.studentProfileId,
        },
      },
      create: { parentProfileId, studentProfileId: existing.studentProfileId },
      update: {},
    });

    return 'OK';
  });
}

/**
 * G65 — Rompe el vínculo tutor ↔ alumno. Lo puede pedir CUALQUIERA de los dos
 * lados, y solo sobre sus propios vínculos: el `deleteMany` exige que el
 * perfil que llama aparezca en la fila, en el lado que le corresponde. Un
 * `counterpartProfileId` manipulado que apunte a un vínculo ajeno simplemente
 * no casa con ninguna fila y devuelve `false`.
 *
 * Se borra la fila en vez de marcarla: `ParentLink` no tiene columna de estado
 * (no se toca `prisma/schema.prisma`) y, sobre todo, conservar el vínculo
 * "revocado" sería seguir guardando una relación que el titular pidió
 * eliminar — justo lo contrario del derecho de cancelación.
 */
export async function unlinkParentStudent(
  requesterProfileId: string,
  counterpartProfileId: string
): Promise<boolean> {
  const { count } = await prisma.parentLink.deleteMany({
    where: {
      OR: [
        { parentProfileId: requesterProfileId, studentProfileId: counterpartProfileId },
        { parentProfileId: counterpartProfileId, studentProfileId: requesterProfileId },
      ],
    },
  });
  return count > 0;
}

export interface LinkedStudent {
  studentProfileId: string;
  displayName: string;
  examName: string | null;
}

export interface LinkedParent {
  parentProfileId: string;
  linkedAt: Date;
}

/** G65: tutores vinculados a un alumno — para que el alumno pueda revocarlos. */
export async function loadLinkedParents(studentProfileId: string): Promise<LinkedParent[]> {
  const links = await prisma.parentLink.findMany({
    where: { studentProfileId },
    orderBy: { createdAt: 'asc' },
    select: { parentProfileId: true, createdAt: true },
  });
  return links.map((l) => ({ parentProfileId: l.parentProfileId, linkedAt: l.createdAt }));
}

/** Alumnos vinculados a un tutor (F16 tarea 6: selector multi-hijo). */
export async function loadLinkedStudents(parentProfileId: string): Promise<LinkedStudent[]> {
  const links = await prisma.parentLink.findMany({
    where: { parentProfileId },
    orderBy: { createdAt: 'asc' },
    select: {
      studentProfileId: true,
      studentProfile: { select: { displayName: true, targetExam: { select: { name: true } } } },
    },
  });

  return links.map((l) => ({
    studentProfileId: l.studentProfileId,
    displayName: l.studentProfile.displayName ?? 'Tu hijo/a',
    examName: l.studentProfile.targetExam?.name ?? null,
  }));
}

export type ParentDashboardResult =
  | { kind: 'not_linked' }
  | { kind: 'locked'; studentName: string; trigger: PaywallTrigger }
  | { kind: 'unlocked'; data: ParentDashboardData };

export interface ParentDashboardData {
  studentName: string;
  currentStreak: number;
  isInactive: boolean;
  predictedScore: number | null;
  weekDelta: number | null;
  countdown: ExamCountdown | null;
  recentSimulations: RecentSimulation[];
  weekActivity: HeatmapDay[];
}

/**
 * Data completa del panel para UN alumno vinculado (F16 tareas 3-5). Reusa
 * los mismos loaders del dashboard del alumno (F11) — todos ya agregan,
 * ninguno toca `Question`/`SessionAnswer` de contenido — así que no hay
 * lógica nueva que auditar para la regla de privacidad, solo composición.
 */
export async function loadParentDashboardData(
  parentProfileId: string,
  studentProfileId: string,
  now: Date = new Date()
): Promise<ParentDashboardResult> {
  const link = await prisma.parentLink.findUnique({
    where: { parentProfileId_studentProfileId: { parentProfileId, studentProfileId } },
    select: { studentProfile: { select: { displayName: true } } },
  });
  if (!link) return { kind: 'not_linked' };

  const studentName = link.studentProfile.displayName ?? 'Tu hijo/a';

  const gate: GateDecision = await evaluateParentDashboardGate(studentProfileId);
  if (!gate.allowed) {
    return { kind: 'locked', studentName, trigger: gate.trigger };
  }

  const [streak, learningProfile, weekDelta, countdown, recentSimulations, weekActivity] =
    await Promise.all([
      getStreak(studentProfileId),
      prisma.learningProfile.findUnique({
        where: { userProfileId: studentProfileId },
        select: { predictedScore: true },
      }),
      computeWeekOverWeekDelta(studentProfileId, now),
      loadExamCountdown(studentProfileId, now),
      loadRecentSimulations(studentProfileId, 3),
      loadHeatmapData(studentProfileId, now, 7),
    ]);

  return {
    kind: 'unlocked',
    data: {
      studentName,
      currentStreak: streak?.currentStreak ?? 0,
      isInactive: isInactiveStudent(streak?.lastActivityDate ?? null, now),
      predictedScore: learningProfile?.predictedScore ?? null,
      weekDelta,
      countdown,
      recentSimulations,
      weekActivity,
    },
  };
}
