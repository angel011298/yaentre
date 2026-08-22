import { prisma } from './prisma';

/**
 * Cumplimiento de derechos de datos (F17 tarea 3): exportar y eliminar.
 */

export async function buildUserDataExport(
  userProfileId: string,
  authEmail: string | null
): Promise<Record<string, unknown> | null> {
  const profile = await prisma.userProfile.findUnique({
    where: { id: userProfileId },
    include: {
      learningProfile: true,
      streak: true,
      weakTopics: {
        include: { topic: { select: { name: true, subject: { select: { name: true } } } } },
      },
      sessions: { include: { answers: true } },
      subscriptions: { include: { payments: true } },
      notificationPrefs: true,
      asParentLinks: true,
      asStudentLinks: true,
      targetExam: { select: { name: true } },
      targetCareer: { select: { name: true } },
    },
  });
  if (!profile) return null;

  return {
    exportedAt: new Date().toISOString(),
    cuenta: {
      correo: authEmail,
      nombre: profile.displayName,
      rol: profile.role,
      creadaEl: profile.createdAt,
      insignias: profile.badges,
    },
    metaAcademica: {
      examen: profile.targetExam?.name ?? null,
      carrera: profile.targetCareer?.name ?? null,
      diagnosticoCompletado: profile.diagnosticDone,
    },
    entrometro: profile.learningProfile
      ? {
          prediccion: profile.learningProfile.predictedScore,
          confianza: profile.learningProfile.confidence,
          totalPreguntas: profile.learningProfile.totalQuestions,
          respuestasCorrectas: profile.learningProfile.correctAnswers,
        }
      : null,
    racha: profile.streak
      ? {
          actual: profile.streak.currentStreak,
          maxima: profile.streak.longestStreak,
          ultimaActividad: profile.streak.lastActivityDate,
          diasActivos: profile.streak.totalActiveDays,
        }
      : null,
    temasDebiles: profile.weakTopics.map((w) => ({
      tema: w.topic.name,
      materia: w.topic.subject.name,
      tasaAcierto: w.hitRate,
      intentos: w.attempts,
    })),
    sesiones: profile.sessions.map((s) => ({
      id: s.id,
      modo: s.mode,
      estado: s.status,
      iniciada: s.startedAt,
      terminada: s.finishedAt,
      score: s.score,
      percentil: s.percentile,
      respuestas: s.answers.map((a) => ({
        preguntaId: a.questionId,
        opcionSeleccionada: a.selectedOption,
        correcta: a.isCorrect,
        segundos: a.timeSpentSecs,
        posicion: a.position,
      })),
    })),
    pagos: profile.subscriptions.map((sub) => ({
      plan: sub.plan,
      estado: sub.status,
      temporada: sub.season,
      iniciada: sub.startedAt,
      vigenteHasta: sub.expiresAt,
      transacciones: sub.payments.map((p) => ({
        montoMxnCentavos: p.amountMxn,
        metodo: p.method,
        estado: p.status,
        fecha: p.createdAt,
      })),
    })),
    preferenciasNotificacion: profile.notificationPrefs.map((n) => ({
      tipo: n.type,
      activo: n.enabled,
    })),
    vinculacionParental: {
      tutoresVinculados: profile.asStudentLinks.length,
      alumnosVinculados: profile.asParentLinks.length,
    },
  };
}

export type DeleteAccountResult = 'OK' | 'NOT_FOUND';

/**
 * Borra en cascada los datos PERSONALES/de comportamiento; el `UserProfile`
 * en sí NO se borra — se ANONIMIZA en su lugar (tarea 3, criterio explícito:
 * "anonimice en vez de borrar cualquier registro de pagos que deba
 * conservarse"). `Subscription`/`Payment` tienen `onDelete: Cascade` desde
 * `UserProfile` en el schema — borrar la fila del perfil destruiría el
 * historial de pagos junto con todo lo demás. Dejar el perfil vivo (sin
 * nombre, sin foto, sin meta) como ancla estable para esas filas es lo que
 * las anonimiza: ya no hay ningún nombre/correo/foto al que asociarlas — el
 * correo real se borra aparte, del lado de Supabase Auth (ver
 * `deleteAccountAction`, que llama a `supabase-admin`).
 */
export async function anonymizeAndDeletePersonalData(
  userProfileId: string
): Promise<DeleteAccountResult> {
  const profile = await prisma.userProfile.findUnique({
    where: { id: userProfileId },
    select: { id: true },
  });
  if (!profile) return 'NOT_FOUND';

  await prisma.$transaction([
    prisma.examSession.deleteMany({ where: { userProfileId } }),
    prisma.weakTopic.deleteMany({ where: { userProfileId } }),
    prisma.streakRecord.deleteMany({ where: { userProfileId } }),
    prisma.learningProfile.deleteMany({ where: { userProfileId } }),
    prisma.notificationPreference.deleteMany({ where: { userProfileId } }),
    prisma.parentLinkCode.deleteMany({ where: { studentProfileId: userProfileId } }),
    prisma.parentLink.deleteMany({
      where: { OR: [{ parentProfileId: userProfileId }, { studentProfileId: userProfileId }] },
    }),
    prisma.userProfile.update({
      where: { id: userProfileId },
      data: {
        displayName: null,
        avatarUrl: null,
        targetExamId: null,
        targetCareerId: null,
        badges: [],
      },
    }),
  ]);

  return 'OK';
}
