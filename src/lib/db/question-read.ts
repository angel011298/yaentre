import { prisma } from './prisma';
import type { DifficultyLevel } from '@prisma/client';

/**
 * Capa de lectura de preguntas con guardrail SERVABLE.
 *
 * REGLA DURA: toda lectura de reactivos para usuarios finales debe filtrar
 * `usage = SERVABLE`. Los reactivos con `usage = CALIBRATION_ONLY` nunca
 * deben llegar al cliente o formar parte de una sesión de usuario.
 *
 * Esta módulo garantiza eso en el nivel de DB, de modo que los callers
 * no tienen que acordarse de agreguar el filtro.
 */

/**
 * Carga reactivos con garantía: solo SERVABLE + verificados (si aplica
 * según el contexto).
 */
export async function loadServableQuestionsByTopic(topicId: string, limit = 50) {
  return prisma.question.findMany({
    where: {
      topicId,
      usage: 'SERVABLE', // ← GUARDRAIL: nunca mostrar CALIBRATION_ONLY a usuarios
      isVerified: true,
    },
    include: {
      topic: {
        include: {
          subject: {
            include: {
              area: {
                include: {
                  exam: {
                    include: {
                      level: {
                        include: {
                          institution: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      explanations: { orderBy: { layer: 'asc' as const } },
    },
    take: limit,
  });
}

/**
 * Carga un reactivo único para validación en sesión. Siempre filtra SERVABLE.
 */
export async function loadServableQuestionForSession(questionId: string) {
  return prisma.question.findFirst({
    where: {
      id: questionId,
      usage: 'SERVABLE', // ← GUARDRAIL: solo servibles en sesiones
      isVerified: true,
    },
    include: {
      topic: true,
      explanations: { orderBy: { layer: 'asc' as const } },
    },
  });
}

/**
 * Carga reactivos por dificultad para adaptativo (solo SERVABLE).
 */
export async function loadServableQuestionsByDifficulty(
  topicId: string,
  difficulty: DifficultyLevel,
) {
  return prisma.question.findMany({
    where: {
      topicId,
      difficulty,
      usage: 'SERVABLE', // ← GUARDRAIL
      isVerified: true,
    },
    take: 10,
  });
}

/**
 * Chequeo de integridad: verifica que CALIBRATION_ONLY nunca aparezca
 * en contextos de usuario. Usado en tests.
 */
export async function assertNoCalibrationOnlyInSessions() {
  // Buscar si hay SessionAnswer que referencie a un Question con CALIBRATION_ONLY
  const problematic = await prisma.sessionAnswer.findFirst({
    where: {
      question: {
        usage: 'CALIBRATION_ONLY',
      },
    },
  });

  if (problematic) {
    throw new Error(
      `VIOLATION: Found CALIBRATION_ONLY question in session. ` +
        `SessionAnswer ID: ${problematic.id}, QuestionID: ${problematic.questionId}`,
    );
  }
}
