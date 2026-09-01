import { Prisma } from '@prisma/client';
import { prisma } from './prisma';

/**
 * Historial de respuestas del alumno, resuelto en UNA sola consulta (G59).
 *
 * ── Por qué existe este módulo ──
 * El motor adaptativo, el Entrómetro, la pantalla de progreso y la gamificación
 * necesitan siempre lo mismo: "cada respuesta del alumno en sesiones
 * finalizadas, con el tema y la materia del reactivo". Escrito con `select`
 * anidado de Prisma —`{ isCorrect, question: { topicId, topic: { subjectId } } }`—
 * eso NO es un JOIN: Prisma lo resuelve con TRES consultas (respuestas →
 * reactivos por id → temas por id) y arma el resultado en memoria. Medido en
 * G59, cada llamada costaba 3 viajes de red, y el flujo de cierre de sesión la
 * invocaba tres veces (temas débiles, tiers, predicción) = 9 viajes.
 *
 * Aquí se hace el JOIN en Postgres, que es donde viven las llaves: 1 consulta.
 * El costo en el servidor es el mismo plan que ya usaba Prisma para el primer
 * salto (índice por sesión) más dos búsquedas por PK; lo que se ahorra es la
 * latencia de red multiplicada por tres y el ir y venir de listas de ids.
 *
 * Sesiones que cuentan como historial: solo las FINALIZADAS (COMPLETED /
 * COMPLETED_BY_TIMEOUT) — misma regla que antes. IN_PROGRESS y ABANDONED no
 * aportan a las stats acumuladas.
 */

/** Una respuesta histórica con su procedencia taxonómica ya resuelta. */
export interface AnswerHistoryRow {
  isCorrect: boolean;
  topicId: string;
  subjectId: string;
}

export interface AnswerHistoryFilter {
  /** Solo respuestas de sesiones iniciadas ANTES de esta fecha (delta semanal). */
  startedBefore?: Date;
  /** Excluye una sesión concreta (delta "qué aportó ESTA sesión"). */
  excludeSessionId?: string;
  /** Solo reactivos realmente contestados (omitidos no son evidencia de dominio). */
  answeredOnly?: boolean;
  /** Acota a un conjunto de materias (pantalla de progreso). */
  subjectIds?: readonly string[];
}

/**
 * Todas las respuestas del alumno en sesiones finalizadas, con `topicId` y
 * `subjectId` resueltos. Devuelve `[]` si no hay historial.
 */
export async function loadAnswerHistory(
  userProfileId: string,
  filter: AnswerHistoryFilter = {}
): Promise<AnswerHistoryRow[]> {
  const conditions: Prisma.Sql[] = [
    Prisma.sql`s."userProfileId" = ${userProfileId}`,
    Prisma.sql`s."status" IN ('COMPLETED', 'COMPLETED_BY_TIMEOUT')`,
  ];

  if (filter.startedBefore) conditions.push(Prisma.sql`s."startedAt" < ${filter.startedBefore}`);
  if (filter.excludeSessionId) conditions.push(Prisma.sql`s."id" <> ${filter.excludeSessionId}`);
  if (filter.answeredOnly) conditions.push(Prisma.sql`sa."selectedOption" IS NOT NULL`);
  if (filter.subjectIds) {
    // Lista vacía ⇒ ninguna materia elegible; `IN ()` no es SQL válido.
    if (filter.subjectIds.length === 0) return [];
    conditions.push(Prisma.sql`t."subjectId" IN (${Prisma.join([...filter.subjectIds])})`);
  }

  return prisma.$queryRaw<AnswerHistoryRow[]>`
    SELECT sa."isCorrect", q."topicId", t."subjectId"
      FROM "session_answers" sa
      JOIN "exam_sessions" s ON s."id" = sa."sessionId"
      JOIN "questions"     q ON q."id" = sa."questionId"
      JOIN "topics"        t ON t."id" = q."topicId"
     WHERE ${Prisma.join(conditions, ' AND ')}
  `;
}

/**
 * Ids de reactivos que el alumno respondió en las últimas `hours` horas.
 * `SessionAnswer` no tiene timestamp propio: se usa el `startedAt` de su
 * sesión, la misma convención del resto del motor. A diferencia del historial
 * de arriba, aquí SÍ cuentan las sesiones en curso — un reactivo que acaba de
 * salir no debe repetirse aunque la sesión siga abierta.
 */
export async function loadRecentlyAnsweredQuestionIds(
  userProfileId: string,
  hours: number,
  now: Date = new Date()
): Promise<Set<string>> {
  const cutoff = new Date(now.getTime() - hours * 3600 * 1000);
  const rows = await prisma.$queryRaw<{ questionId: string }[]>`
    SELECT DISTINCT sa."questionId"
      FROM "session_answers" sa
      JOIN "exam_sessions" s ON s."id" = sa."sessionId"
     WHERE s."userProfileId" = ${userProfileId}
       AND s."startedAt" >= ${cutoff}
  `;
  return new Set(rows.map((r) => r.questionId));
}
