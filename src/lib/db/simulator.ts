import { Prisma, type InstitutionCode, type SessionStatus } from '@prisma/client';
import { prisma } from './prisma';
import { finishSession, startSessionWithQuestions } from './sessions';
import { withUserAdvisoryLock } from './locks';
import { buildDiagnosticQuestionSet, toRunnerQuestion, type RunnerQuestion } from './diagnostic';
import {
  countFullSimulationAttempts,
  isUserPaid,
} from './paywall';
import {
  computeCareerStrategy,
  computeSessionPredictionDelta,
  type CareerStrategyResponse,
} from './adaptive';
import {
  canStartFullSimulation,
  FREE_FULL_SIMULATION_LIMIT,
  simulationQuestionTarget,
  simulationTimeLimitSecs,
  type GateDecision,
  type PaywallTrigger,
} from '@/lib/paywall/gates';
import { simulatorConfigFor } from '@/lib/simulator/config';
import { orderQuestionOptions } from '@/lib/simulator/shuffle';
import { computeRemainingSecs, isTimeUp } from '@/lib/simulator/time';
import { percentileRankFromCounts } from '@/lib/simulator/percentile';
import {
  aggregateSubjectBreakdown,
  type SubjectBreakdownRow,
} from '@/lib/simulator/subject-breakdown';
import {
  integrityNeedsWrite,
  mergeIntegrityCounters,
  type IntegrityCounters,
  type SuspicionInfoEvent,
} from '@/lib/simulator/integrity';
import {
  computeElapsedSecs,
  isAnswerCorrect,
  isSessionStale,
  isTimeExceeded,
  parseQuestionOptions,
} from '@/lib/sessions/scoring';
import { reportControlFailure } from '@/lib/observability/report';

/**
 * Orquestación del simulador de examen en línea (F12). Reusa TODO el motor de
 * sesiones ya existente (F2/F6/F9): el scoring server-side, la política de
 * no-revelado por modo (`buildSubmitResponse`), el muro suave (F9) y el
 * recálculo adaptativo al terminar. Este módulo añade lo específico del
 * simulacro fiel: parámetros por examen (120/180 UNAM, 140/180 IPN), barajado
 * de opciones por institución, resiliencia (retomar con tiempo real del
 * servidor) y el payload saneado que JAMÁS incluye la respuesta correcta.
 */

const FINISHED_STATUSES: SessionStatus[] = ['COMPLETED', 'COMPLETED_BY_TIMEOUT'];

// ─────────────────────────── Contexto del examen objetivo ───────────────────────────

interface TargetContext {
  examId: string;
  examName: string;
  areaId: string;
  areaName: string;
  institutionCode: InstitutionCode;
  durationMins: number;
  totalQuestions: number;
  examActive: boolean;
}

async function resolveTargetContext(userProfileId: string): Promise<TargetContext | null> {
  const profile = await prisma.userProfile.findUnique({
    where: { id: userProfileId },
    select: {
      targetExam: {
        select: {
          id: true,
          name: true,
          durationMins: true,
          totalQuestions: true,
          isActive: true,
          level: { select: { institution: { select: { code: true } } } },
        },
      },
      targetCareer: { select: { area: { select: { id: true, name: true } } } },
    },
  });

  const exam = profile?.targetExam;
  const area = profile?.targetCareer?.area;
  if (!exam || !area) return null;

  return {
    examId: exam.id,
    examName: exam.name,
    areaId: area.id,
    areaName: area.name,
    institutionCode: exam.level.institution.code,
    durationMins: exam.durationMins,
    totalQuestions: exam.totalQuestions,
    examActive: exam.isActive,
  };
}

// ─────────────────────────────── Acceso (muro suave F9) ───────────────────────────────

export interface SimulatorAccess {
  /** ¿Puede iniciar un simulacro AHORA? (pago, o gratuito sin haberlo usado). */
  decision: GateDecision;
  isPaid: boolean;
  /** true si es un usuario gratuito estrenando su simulacro (mensaje cálido de Tino). */
  isFreeFirstTime: boolean;
}

export async function evaluateSimulatorAccess(userProfileId: string): Promise<SimulatorAccess> {
  const [isPaid, attemptsCount] = await Promise.all([
    isUserPaid(userProfileId),
    // G67: CUALQUIER intento (no solo los terminados) — ver el porqué en
    // `countFullSimulationAttempts`.
    countFullSimulationAttempts(userProfileId),
  ]);
  const decision = canStartFullSimulation({ isPaid, completedCount: attemptsCount });
  return {
    decision,
    isPaid,
    isFreeFirstTime: !isPaid && attemptsCount === 0,
  };
}

export interface SimulatorEntryMeta {
  examName: string;
  /** Reactivos que se SERVIRÁN a este usuario: 120/140 pagado, 60 en Free. */
  totalQuestions: number;
  /** Minutos que durará su simulacro (proporcional en Free). */
  durationMins: number;
  /** true si es un medio simulacro Free (para el copy del pre-flight). */
  isHalfSimulation: boolean;
}

/**
 * Metadatos del examen objetivo para la pantalla de entrada/pre-flight.
 *
 * Bloque 1: los números que se muestran dependen del plan. Un usuario Free ve
 * su MEDIO simulacro (60 reactivos y su tiempo proporcional), no el total
 * oficial que nunca se le va a servir — mostrar 120 y luego servir 60 sería
 * confuso. `isPaid` lo resuelve la página (ya lo calcula para el muro suave).
 */
export async function loadSimulatorEntryMeta(
  userProfileId: string,
  isPaid: boolean
): Promise<SimulatorEntryMeta | null> {
  const ctx = await resolveTargetContext(userProfileId);
  if (!ctx) return null;
  const servedTarget = simulationQuestionTarget({ isPaid, officialTotal: ctx.totalQuestions });
  const timeLimitSecs = simulationTimeLimitSecs({
    isPaid,
    officialTotal: ctx.totalQuestions,
    officialDurationMins: ctx.durationMins,
    servedTarget,
  });
  return {
    examName: ctx.examName,
    totalQuestions: servedTarget,
    durationMins: Math.round(timeLimitSecs / 60),
    isHalfSimulation: !isPaid && servedTarget < ctx.totalQuestions,
  };
}

// ─────────────────────────────── Payload del cliente ───────────────────────────────

export interface SimulatorPayload {
  sessionId: string;
  institutionCode: InstitutionCode;
  examName: string;
  areaName: string;
  /** Total oficial del examen (120/140) — puede exceder los reactivos servidos. */
  examTotalQuestions: number;
  /** Reactivos realmente servidos (acotados por el contenido disponible). */
  servedCount: number;
  timeLimitSecs: number;
  /** Restante calculado por el SERVIDOR al cargar — el cliente solo lo tictaquea. */
  remainingSecs: number;
  questions: RunnerQuestion[];
  initialSelections: Array<string | null>;
  integrity: IntegrityCounters;
  suspicionEvents: SuspicionInfoEvent[];
  completedFullscreen: boolean;
  /** true si se reanuda una sesión ya en curso (mostrar "retomar en pantalla completa"). */
  isResume: boolean;
}

const questionInclude = {
  question: {
    select: {
      id: true,
      stem: true,
      imageUrl: true,
      options: true,
      format: true,
      passage: { select: { id: true, title: true, content: true, sourceRef: true } },
      topic: {
        select: {
          id: true,
          name: true,
          // `sharedContentKey` (G26) es lo que permite colapsar en un solo
          // renglón las filas `Subject` que son la misma materia — ver
          // `src/lib/simulator/subject-breakdown.ts` (G71).
          subject: { select: { id: true, name: true, sharedContentKey: true } },
        },
      },
    },
  },
} satisfies Prisma.SessionAnswerInclude;

const simulatorSessionInclude = {
  answers: { orderBy: { position: 'asc' }, include: questionInclude },
} satisfies Prisma.ExamSessionInclude;

type SimulatorSessionWithAnswers = Prisma.ExamSessionGetPayload<{
  include: typeof simulatorSessionInclude;
}>;

function readIntegrity(session: SimulatorSessionWithAnswers): IntegrityCounters {
  return {
    tabBlurCount: session.tabBlurCount,
    rightClickAttempts: session.rightClickAttempts,
    keyboardShortcutAttempts: session.keyboardShortcutAttempts,
  };
}

function readSuspicionEvents(raw: unknown): SuspicionInfoEvent[] {
  return Array.isArray(raw) ? (raw as SuspicionInfoEvent[]) : [];
}

function buildPayload(
  session: SimulatorSessionWithAnswers,
  ctx: TargetContext,
  isResume: boolean,
  now: Date
): SimulatorPayload {
  const shuffleOptions = simulatorConfigFor(ctx.institutionCode).shuffleOptions;

  const questions: RunnerQuestion[] = session.answers.map((a) => {
    const base = toRunnerQuestion(a.question);
    // Barajado de opciones por institución. Solo reordena la vista: los `id`
    // (con los que se responde) se conservan y la correctitud sigue server-side.
    return {
      ...base,
      options: orderQuestionOptions(base.options, {
        enabled: shuffleOptions,
        sessionId: session.id,
        questionId: a.question.id,
      }),
    };
  });

  return {
    sessionId: session.id,
    institutionCode: ctx.institutionCode,
    examName: ctx.examName,
    areaName: ctx.areaName,
    examTotalQuestions: ctx.totalQuestions,
    servedCount: session.answers.length,
    timeLimitSecs: session.timeLimitSecs,
    remainingSecs: computeRemainingSecs(session.startedAt, session.timeLimitSecs, now),
    questions,
    initialSelections: session.answers.map((a) => a.selectedOption),
    integrity: readIntegrity(session),
    suspicionEvents: readSuspicionEvents(session.suspicionEvents),
    completedFullscreen: session.completedFullscreen,
    isResume,
  };
}

// ─────────────────────────────── Inicio del simulacro ───────────────────────────────

export type SimulatorStartError = 'NO_TARGET' | 'NO_CONTENT' | 'EXAM_NOT_AVAILABLE' | 'PAYWALL';

export type SimulatorStartResult =
  | { ok: true; payload: SimulatorPayload }
  | { ok: false; code: SimulatorStartError; trigger?: PaywallTrigger };

/**
 * Abre una sesión FULL_SIMULATION real. Parámetros según el examen objetivo
 * (UNAM 120/180, IPN 140/180) y set de reactivos repartido por peso de materia,
 * acotado al contenido servible (reusa `buildDiagnosticQuestionSet`, que ya es
 * un repartidor genérico por peso). Pre-crea las N filas `SessionAnswer` para
 * que retomar a media sesión funcione sin guardar el set en otro lado (mismo
 * patrón que el diagnóstico). El muro suave se valida antes de crear nada.
 */
export async function startSimulation(
  userProfileId: string,
  now: Date = new Date()
): Promise<SimulatorStartResult> {
  const ctx = await resolveTargetContext(userProfileId);
  if (!ctx) return { ok: false, code: 'NO_TARGET' };
  if (!ctx.examActive) return { ok: false, code: 'EXAM_NOT_AVAILABLE' };

  const access = await evaluateSimulatorAccess(userProfileId);
  if (!access.decision.allowed) {
    return { ok: false, code: 'PAYWALL', trigger: access.decision.trigger };
  }

  // Bloque 1: el simulacro Free es MEDIO (60 reactivos, tiempo proporcional),
  // una sola vez. El pagado sigue siendo el examen completo (120/140, duración
  // oficial). El tope de intentos (1) no cambia y se re-verifica bajo el lock.
  const servedTarget = simulationQuestionTarget({
    isPaid: access.isPaid,
    officialTotal: ctx.totalQuestions,
  });
  const timeLimitSecs = simulationTimeLimitSecs({
    isPaid: access.isPaid,
    officialTotal: ctx.totalQuestions,
    officialDurationMins: ctx.durationMins,
    servedTarget,
  });

  const { questionIds } = await buildDiagnosticQuestionSet(ctx.areaId, servedTarget);
  if (questionIds.length === 0) return { ok: false, code: 'NO_CONTENT' };

  // G60 — la creación va bajo el lock del usuario. Dos peticiones simultáneas
  // (dos pestañas, doble clic en "Iniciar examen") pasaban las dos el muro
  // suave de arriba —ambas ven 0 simulacros completos— y un usuario FREE se
  // llevaba DOS simulacros gratis, saltándose la regla de negocio central de
  // F9. Dentro del lock: (1) si ya hay un simulacro vivo, se RETOMA; (2) el
  // muro suave se re-verifica contra la base ya serializada; (3) sesión +
  // reactivos se crean atómicamente.
  const outcome = await withUserAdvisoryLock(userProfileId, async (tx): Promise<
    { kind: 'session'; sessionId: string; resumed: boolean } | { kind: 'paywall' }
  > => {
    const open = await tx.examSession.findFirst({
      where: { userProfileId, mode: 'FULL_SIMULATION', status: 'IN_PROGRESS' },
      orderBy: { startedAt: 'desc' },
      select: { id: true, startedAt: true, timeLimitSecs: true },
    });
    if (
      open &&
      !isSessionStale(open.startedAt, now) &&
      !isTimeUp(open.startedAt, open.timeLimitSecs, now)
    ) {
      return { kind: 'session', sessionId: open.id, resumed: true };
    }

    if (!access.isPaid) {
      // G67 🔴 — CUALQUIER intento cuenta, no solo los terminados. Llegados
      // aquí ya se descartó que haya uno RETOMABLE (arriba); cualquier fila
      // FULL_SIMULATION que quede —abandonada, agotada por tiempo, o
      // terminada— significa que a este alumno YA se le sirvió el contenido
      // completo una vez. Antes solo `COMPLETED`/`COMPLETED_BY_TIMEOUT`
      // contaban, así que arrancar-y-nunca-terminar daba un simulacro
      // completo gratis cada vez que pasaba el tiempo límite (unas horas,
      // no hay que esperar el umbral de 24h de sesión "stale") — ver
      // `countFullSimulationAttempts` para el detalle completo.
      const attempts = await tx.examSession.count({
        where: { userProfileId, mode: 'FULL_SIMULATION' },
      });
      if (attempts >= FREE_FULL_SIMULATION_LIMIT) return { kind: 'paywall' };
    }

    const created = await startSessionWithQuestions({
      userProfileId,
      examId: ctx.examId,
      mode: 'FULL_SIMULATION',
      timeLimitSecs,
      questionIds,
      client: tx,
    });
    return { kind: 'session', sessionId: created.id, resumed: false };
  });

  if (outcome.kind === 'paywall') {
    return { ok: false, code: 'PAYWALL', trigger: 'FULL_SIMULATION_LIMIT' };
  }

  const full = await prisma.examSession.findUniqueOrThrow({
    where: { id: outcome.sessionId },
    include: simulatorSessionInclude,
  });

  return { ok: true, payload: buildPayload(full, ctx, outcome.resumed, now) };
}

// ─────────────────────────────── Estado / reanudación ───────────────────────────────

export type SimulatorState =
  | { kind: 'active'; payload: SimulatorPayload }
  | { kind: 'expired'; sessionId: string }
  | { kind: 'none' };

/**
 * Resuelve la sesión de simulacro vigente del alumno (nunca confía en el
 * cliente). Cierra como ABANDONED lo que lleva >24h abierto; si el tiempo real
 * (contra `startedAt` del servidor) ya se agotó, la marca `expired` para que la
 * página la cierre y muestre resultados. Si sigue viva, arma el payload de
 * reanudación con el restante recalculado por el servidor.
 */
export async function loadSimulatorState(
  userProfileId: string,
  now: Date = new Date()
): Promise<SimulatorState> {
  const session = await prisma.examSession.findFirst({
    where: { userProfileId, mode: 'FULL_SIMULATION', status: 'IN_PROGRESS' },
    orderBy: { startedAt: 'desc' },
    include: simulatorSessionInclude,
  });

  if (!session) return { kind: 'none' };

  if (isSessionStale(session.startedAt, now)) {
    await prisma.examSession.update({
      where: { id: session.id },
      data: { status: 'ABANDONED', finishedAt: now },
    });
    return { kind: 'none' };
  }

  if (isTimeUp(session.startedAt, session.timeLimitSecs, now)) {
    return { kind: 'expired', sessionId: session.id };
  }

  const ctx = await resolveTargetContext(userProfileId);
  if (!ctx) return { kind: 'none' };

  return { kind: 'active', payload: buildPayload(session, ctx, true, now) };
}

// ─────────────────────────────── Sinc (beacon/offline) ───────────────────────────────

export interface SimulatorSyncAnswer {
  questionId: string;
  selectedOption: string | null;
  position: number;
  timeSpentSecs: number;
}

export interface SimulatorSyncInput {
  userProfileId: string;
  sessionId: string;
  answers: SimulatorSyncAnswer[];
  integrity: IntegrityCounters;
  suspicionEvents: SuspicionInfoEvent[];
  completedFullscreen: boolean;
}

export type SimulatorSyncResult =
  | { ok: true; recorded: number }
  | { ok: false; code: 'NOT_FOUND' | 'FORBIDDEN' | 'NOT_IN_PROGRESS' };

/**
 * Persiste un lote de respuestas + señales de integridad. Es el destino de:
 * (1) el flush periódico, (2) el reintento al reconectar, y (3) el
 * `navigator.sendBeacon` en `beforeunload`/`pagehide`. Idempotente: las
 * respuestas se hacen upsert por (sesión, reactivo) y los contadores se fusionan
 * al MÁXIMO. NUNCA devuelve la correctitud — solo cuántas registró.
 */
interface SyncSessionState {
  id: string;
  tabBlurCount: number;
  rightClickAttempts: number;
  keyboardShortcutAttempts: number;
  completedFullscreen: boolean;
  suspicionEvents: Prisma.JsonValue;
}

/**
 * Contadores de integridad fusionados al MÁXIMO + eventos, en una consulta.
 *
 * G69 ⚡ — y SOLO si algo cambió. Este UPDATE salía en cada lote, y un lote
 * sale cada vez que el alumno contesta: ~120-140 escrituras por simulacro que
 * en la inmensa mayoría de los casos reescribían exactamente los mismos
 * valores. Los contadores de integridad solo se mueven cuando el alumno hace
 * algo raro (cambiar de pestaña, clic derecho, atajo de teclado); en un examen
 * normal no se mueven ni una vez.
 *
 * La comparación es contra lo que ya está persistido y usa el resultado YA
 * fusionado, así que la semántica no cambia en nada: si el máximo fusionado
 * es igual a lo guardado, el UPDATE habría sido un no-op. `suspicionEvents`
 * se compara serializado porque es JSON y se escribe tal cual llega.
 */
async function persistIntegrity(
  session: SyncSessionState,
  input: SimulatorSyncInput
): Promise<void> {
  const merged = mergeIntegrityCounters(
    {
      tabBlurCount: session.tabBlurCount,
      rightClickAttempts: session.rightClickAttempts,
      keyboardShortcutAttempts: session.keyboardShortcutAttempts,
    },
    input.integrity
  );
  const completedFullscreen = session.completedFullscreen || input.completedFullscreen;

  if (!integrityNeedsWrite(session, merged, completedFullscreen, input.suspicionEvents)) {
    return;
  }

  await prisma.examSession.update({
    where: { id: session.id },
    data: {
      ...merged,
      completedFullscreen,
      suspicionEvents: input.suspicionEvents as unknown as Prisma.InputJsonValue,
    },
  });
}

/**
 * Escribe TODO el lote en un solo statement, con la misma semántica de upsert
 * por (sesión, reactivo) que tenía el bucle. El `id` de las filas nuevas lo
 * genera Postgres: en el flujo normal esta rama no corre nunca —
 * `startSimulation` pre-crea las N filas del simulacro— y solo existe como
 * defensa para que una respuesta jamás se pierda por no tener fila previa.
 */
async function upsertSessionAnswers(
  sessionId: string,
  answers: Array<SimulatorSyncAnswer & { isCorrect: boolean }>
): Promise<void> {
  const values = answers.map(
    (a) => Prisma.sql`(
      gen_random_uuid()::text,
      ${sessionId}::text,
      ${a.questionId}::text,
      ${a.selectedOption}::text,
      ${a.isCorrect}::boolean,
      ${a.timeSpentSecs}::int,
      ${a.position}::int
    )`
  );

  await prisma.$executeRaw`
    INSERT INTO "session_answers"
      ("id", "sessionId", "questionId", "selectedOption", "isCorrect", "timeSpentSecs", "position")
    VALUES ${Prisma.join(values, ', ')}
    ON CONFLICT ("sessionId", "questionId") DO UPDATE SET
      "selectedOption" = EXCLUDED."selectedOption",
      "isCorrect"      = EXCLUDED."isCorrect",
      "timeSpentSecs"  = EXCLUDED."timeSpentSecs",
      "position"       = EXCLUDED."position"
  `;
}

export async function recordSimulatorSync(input: SimulatorSyncInput): Promise<SimulatorSyncResult> {
  const session = await prisma.examSession.findUnique({
    where: { id: input.sessionId },
    select: {
      id: true,
      userProfileId: true,
      status: true,
      startedAt: true,
      timeLimitSecs: true,
      tabBlurCount: true,
      rightClickAttempts: true,
      keyboardShortcutAttempts: true,
      completedFullscreen: true,
      // G69: se lee para poder SALTARSE el UPDATE cuando nada cambió —
      // ver `persistIntegrity`.
      suspicionEvents: true,
    },
  });

  if (!session) return { ok: false, code: 'NOT_FOUND' };
  if (session.userProfileId !== input.userProfileId) return { ok: false, code: 'FORBIDDEN' };
  if (session.status !== 'IN_PROGRESS') return { ok: false, code: 'NOT_IN_PROGRESS' };

  // G67 🔴 — el tiempo real, no solo el del `SimTimer` del cliente. Este
  // endpoint (destino del `sendBeacon` periódico/`pagehide`) es el ÚNICO
  // camino por el que el simulador persiste respuestas — `SimulatorRunner`
  // nunca llama a `submitAnswer` — así que el candado de tiempo real
  // agregado ahí (`closeIfTimeExceeded`, `sessions.ts`) no cubre este flujo:
  // sin esto, alguien que congelara su reloj de sistema podía seguir
  // sincronizando respuestas del simulacro mucho después de las 3h reales del
  // examen, con el servidor sin enterarse hasta que decidiera terminar a
  // mano. Se cierra con `finishSession` de verdad (puntaje, temas débiles,
  // Entrómetro, racha) en vez de solo cambiar el `status`.
  if (isTimeExceeded(computeElapsedSecs(session.startedAt, new Date()), session.timeLimitSecs)) {
    await finishSession({
      userProfileId: session.userProfileId,
      sessionId: session.id,
      reason: 'TIMEOUT',
    });
    return { ok: false, code: 'NOT_IN_PROGRESS' };
  }

  // G59: el lote se resuelve con un número FIJO de consultas.
  //
  // La versión anterior recorría `input.answers` haciendo un `findUnique` del
  // reactivo y un `upsert` por cada respuesta: 2N+2 viajes a la base de datos.
  // Un simulacro IPN son 140 reactivos ⇒ 282 viajes secuenciales en el mismo
  // request. Este endpoint es el destino del `sendBeacon` de `pagehide`, donde
  // el navegador da unos pocos segundos antes de matar la petición: con la
  // latencia real de red esa cuenta se acerca peligrosamente al límite, y una
  // petición cortada a la mitad significa un alumno que pierde respuestas de su
  // simulacro. Ahora son 4 consultas, sin importar el tamaño del lote.
  //
  // Se conserva íntegro el aislamiento por reactivo de F19 (ver abajo) y la
  // idempotencia por (sesión, reactivo).

  // Última respuesta gana si el lote trae el mismo reactivo dos veces: un
  // `ON CONFLICT DO UPDATE` no puede tocar la misma fila dos veces en el mismo
  // statement.
  const byQuestion = new Map<string, SimulatorSyncAnswer>();
  for (const answer of input.answers) byQuestion.set(answer.questionId, answer);
  const batch = [...byQuestion.values()];

  if (batch.length === 0) {
    await persistIntegrity(session, input);
    return { ok: true, recorded: 0 };
  }

  // G65: SOLO los reactivos que de verdad se le asignaron a esta sesión. El
  // lote llega por `sendBeacon` desde el cliente, así que sin este filtro un
  // usuario podía sembrar respuestas de reactivos que nunca vio — su propio
  // score subía y, con él, el percentil que se calcula contra TODAS las
  // sesiones del examen (`loadSimulatorResult`), es decir, contaminaba también
  // el resultado que ven los demás. Mismo criterio que `submitAnswer`: las
  // filas ya existen porque `startSimulation` las pre-crea.
  //
  // G69 ⚡ — "qué se te asignó" y "cuáles son sus opciones" se resuelven en UNA
  // consulta con JOIN, no en dos. Eran dos operaciones de Prisma (ocho viajes
  // al pooler con `?pgbouncer=true`) por cada lote, y sale un lote por cada
  // respuesta del alumno. El JOIN lo hace Postgres, que es donde cuesta
  // microsegundos. El filtro de pertenencia NO se relaja: sigue siendo el
  // `WHERE sa."sessionId" = …` el que decide qué reactivos entran — un
  // reactivo sin fila en esta sesión simplemente no aparece en el resultado.
  const asignados = await prisma.$queryRaw<Array<{ questionId: string; options: Prisma.JsonValue }>>`
    SELECT sa."questionId", q."options"
      FROM "session_answers" sa
      JOIN "questions" q ON q."id" = sa."questionId"
     WHERE sa."sessionId" = ${session.id}
       AND sa."questionId" IN (${Prisma.join(batch.map((a) => a.questionId))})
  `;
  const optionsByQuestion = new Map(asignados.map((a) => [a.questionId, a.options]));

  const scored: Array<SimulatorSyncAnswer & { isCorrect: boolean }> = [];
  for (const answer of batch) {
    const rawOptions = optionsByQuestion.get(answer.questionId);
    // No está en el mapa ⇒ o no se le asignó a esta sesión, o el reactivo ya
    // no existe. En ambos casos se ignora, igual que antes.
    if (rawOptions === undefined) continue;

    // F19 (bug real corregido): `parseQuestionOptions`/`isAnswerCorrect` LANZAN
    // ante un reactivo corrupto (options malformadas, o 0/≥2 opciones marcadas
    // como correctas). Antes ese throw escapaba del bucle y tumbaba TODO el
    // lote: un solo reactivo dañado hacía que el beacon devolviera 500 y el
    // alumno perdiera las otras 119 respuestas de su simulacro. Ahora el fallo
    // se aísla al reactivo culpable — se registra y se salta, el resto del
    // lote se persiste igual. Nunca se marca "correcta" a la fuerza: si no se
    // puede puntuar con certeza, esa respuesta simplemente no se guarda.
    try {
      const options = parseQuestionOptions(rawOptions);
      // Opción inexistente ⇒ se ignora (defensa; la UI solo manda ids válidos).
      if (answer.selectedOption !== null && !options.some((o) => o.id === answer.selectedOption)) {
        continue;
      }
      // Correctitud SIEMPRE server-side (guardrail CLAUDE.md).
      scored.push({ ...answer, isCorrect: isAnswerCorrect(options, answer.selectedOption) });
    } catch (err) {
      // G73b: omitir un reactivo del lote cambia el RESULTADO del examen del
      // alumno sin avisarle ni a él ni a nadie. Es un fallo de puntuación, no
      // ruido de sincronización.
      reportControlFailure('simulator_scoring', 'degraded', err, {
        sessionId: session.id,
        questionId: answer.questionId,
      });
    }
  }

  if (scored.length > 0) {
    await upsertSessionAnswers(session.id, scored);
  }
  const recorded = scored.length;

  await persistIntegrity(session, input);

  return { ok: true, recorded };
}

// ─────────────────────────────── Resultados ───────────────────────────────

/**
 * Carga la sesión con el guard de F13 tarea 1: SOLO el dueño, y SOLO si ya
 * terminó. Único punto de esta verificación — lo comparten `loadSimulatorResult`
 * y `loadSimulatorReview` para que ninguno pueda quedar desalineado del otro.
 */
async function loadOwnedFinishedSession(
  userProfileId: string,
  sessionId: string
): Promise<SimulatorSessionWithAnswers | null> {
  const session = await prisma.examSession.findUnique({
    where: { id: sessionId },
    include: simulatorSessionInclude,
  });
  if (!session || session.userProfileId !== userProfileId) return null;
  if (!FINISHED_STATUSES.includes(session.status)) return null;
  return session;
}

/** Renglón del desglose por materia — ver `simulator/subject-breakdown.ts`. */
export type SubjectResult = SubjectBreakdownRow;

export interface SimulatorResultData {
  sessionId: string;
  examId: string;
  score: number;
  servedCount: number;
  examTotalQuestions: number;
  elapsedSecs: number;
  timeLimitSecs: number;
  status: SessionStatus;
  avgSecsPerQuestion: number;
  subjects: SubjectResult[];
  integrity: IntegrityCounters;
  suspicionEvents: SuspicionInfoEvent[];
  strategy: CareerStrategyResponse | null;
  /** Cambio del Entrómetro causado por ESTA sesión. `null` sin línea base (F13 tarea 5). */
  predictionDelta: number | null;
  /** Percentil vs. otros usuarios del mismo examen. `null` con muestra chica (F13 tarea 6). */
  percentile: number | null;
}

/**
 * Los dos números que necesita el percentil: cuántas OTRAS sesiones terminadas
 * del mismo examen hay, y cuántas quedaron estrictamente por debajo de `score`.
 * Un solo renglón de vuelta, sin importar cuántos alumnos haya en la
 * plataforma.
 */
async function countPercentilePeers(
  examId: string,
  excludeSessionId: string,
  score: number
): Promise<{ total: number; beaten: number }> {
  const rows = await prisma.$queryRaw<{ total: number; beaten: number }[]>`
    SELECT count(*)::int                                  AS "total",
           count(*) FILTER (WHERE s."score" < ${score})::int AS "beaten"
      FROM "exam_sessions" s
     WHERE s."examId" = ${examId}
       AND s."mode" = 'FULL_SIMULATION'
       AND s."status" IN ('COMPLETED', 'COMPLETED_BY_TIMEOUT')
       AND s."id" <> ${excludeSessionId}
       AND s."score" IS NOT NULL
  `;
  return rows[0] ?? { total: 0, beaten: 0 };
}

/** Sesión terminada del usuario, con desglose por materia (para resultados). */
export async function loadSimulatorResult(
  userProfileId: string,
  sessionId: string
): Promise<SimulatorResultData | null> {
  const session = await loadOwnedFinishedSession(userProfileId, sessionId);
  if (!session) return null;

  const score = session.score ?? 0;

  const [exam, strategy, predictionDelta, percentileCounts] = await Promise.all([
    prisma.exam.findUnique({
      where: { id: session.examId },
      select: { totalQuestions: true },
    }),
    computeCareerStrategy(userProfileId),
    computeSessionPredictionDelta(userProfileId, sessionId),
    // Percentil (F13 tarea 6): otras sesiones COMPLETADAS del MISMO examen
    // (mismo examId ⇒ misma institución+nivel+año, "mismo ciclo"), excluyendo
    // esta sesión. Cualquier alumno, no solo este usuario — es una comparación
    // contra la comunidad.
    //
    // G59: se cuentan en Postgres. La versión anterior traía el score de CADA
    // sesión terminada del examen a memoria de Node para filtrarlas ahí; esa
    // lista crece con la base de usuarios completa (no con la del alumno), así
    // que era la consulta del producto que peor escalaba con el éxito
    // comercial. El resultado es idéntico: `percentileRankFromCounts` aplica
    // exactamente la misma regla, ahora sobre los dos números que importan.
    countPercentilePeers(session.examId, sessionId, score),
  ]);

  const subjects = aggregateSubjectBreakdown(
    session.answers.map((a) => ({ isCorrect: a.isCorrect, subject: a.question.topic.subject }))
  );

  const elapsedSecs = session.finishedAt
    ? computeElapsedSecs(session.startedAt, session.finishedAt)
    : session.timeLimitSecs;
  const servedCount = session.answers.length;

  const percentile = percentileRankFromCounts(percentileCounts.beaten, percentileCounts.total);

  return {
    sessionId: session.id,
    examId: session.examId,
    score,
    servedCount,
    examTotalQuestions: exam?.totalQuestions ?? servedCount,
    elapsedSecs,
    timeLimitSecs: session.timeLimitSecs,
    status: session.status,
    avgSecsPerQuestion: servedCount > 0 ? Math.round(elapsedSecs / servedCount) : 0,
    subjects,
    integrity: readIntegrity(session),
    suspicionEvents: readSuspicionEvents(session.suspicionEvents),
    strategy,
    predictionDelta,
    percentile,
  };
}

// ─────────────────────────────── Revisión de preguntas falladas ───────────────────────────────

export interface RevealedOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface RevealedQuestion {
  id: string;
  stem: string;
  imageUrl: string | null;
  subjectName: string;
  topicName: string;
  options: RevealedOption[];
  selectedOption: string | null;
  /** Capa 1 de explicación (siempre gratis — F9) si el reactivo la tiene generada. */
  explanation: { title: string; content: string } | null;
}

/**
 * Preguntas FALLADAS de una sesión terminada, con la respuesta correcta ya
 * revelada (F13 tareas 8 y 9 — legítimo solo porque `loadOwnedFinishedSession`
 * ya confirmó que la sesión es del dueño Y ya terminó). Trae la Capa 1 de
 * explicación (siempre gratis, F9 `canViewExplanationLayer`) si existe; capas
 * 2+ son alcance de F14 (drill + capas de profundidad), no de esta pantalla.
 */
export async function loadSimulatorReview(
  userProfileId: string,
  sessionId: string
): Promise<RevealedQuestion[] | null> {
  const session = await loadOwnedFinishedSession(userProfileId, sessionId);
  if (!session) return null;

  const failed = session.answers.filter((a) => !a.isCorrect);
  const questionIds = failed.map((a) => a.question.id);
  const explanations = await prisma.explanationLayer.findMany({
    where: { questionId: { in: questionIds }, layer: 1 },
    select: { questionId: true, title: true, content: true },
  });
  const explanationByQuestion = new Map(explanations.map((e) => [e.questionId, e]));

  return failed.map((a) => {
    const options = parseQuestionOptions(a.question.options);
    const explanation = explanationByQuestion.get(a.question.id);
    return {
      id: a.question.id,
      stem: a.question.stem,
      imageUrl: a.question.imageUrl,
      subjectName: a.question.topic.subject.name,
      topicName: a.question.topic.name,
      options: options.map((o) => ({ id: o.id, text: o.text, isCorrect: o.isCorrect })),
      selectedOption: a.selectedOption,
      explanation: explanation ? { title: explanation.title, content: explanation.content } : null,
    };
  });
}
