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

  // Programa de referidos (Bloque 3). Solo datos DE ESTA PERSONA: su código, su
  // crédito y las fechas y montos de sus propias ventas. Nada del comprador
  // —ni nombre, ni correo, ni id— y nada de las marcas de antifraude.
  const ownCode = await prisma.referralCode.findUnique({
    where: { userProfileId_type: { userProfileId, type: 'REFERIDO' } },
    select: { id: true, code: true, active: true, createdAt: true },
  });
  const [creditLots, referralSales, referredBy] = await Promise.all([
    prisma.referralCreditLot.findMany({
      where: { userProfileId },
      orderBy: { accruedAt: 'asc' },
      select: { amountCents: true, remainingCents: true, accruedAt: true, expiresAt: true, revokedAt: true },
    }),
    ownCode
      ? prisma.referralSale.findMany({
          where: { referralCodeId: ownCode.id },
          orderBy: { createdAt: 'asc' },
          select: { createdAt: true, commissionAmount: true, status: true, accruedAt: true, reversedAt: true },
        })
      : Promise.resolve([]),
    prisma.userProfile.findUnique({ where: { id: userProfileId }, select: { referredByCodeId: true } }),
  ]);

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
    programaDeReferidos: {
      codigo: ownCode ? { valor: ownCode.code, activo: ownCode.active, creadoEl: ownCode.createdAt } : null,
      llegasteConUnCodigoDeReferido: referredBy?.referredByCodeId != null,
      credito: creditLots.map((l) => ({
        montoCentavos: l.amountCents,
        saldoCentavos: l.remainingCents,
        acreditadoEl: l.accruedAt,
        venceEl: l.expiresAt,
        revocado: l.revokedAt !== null,
      })),
      ventasAtribuidas: referralSales.map((v) => ({
        fecha: v.createdAt,
        comisionCentavos: v.commissionAmount,
        estado: v.status,
        acreditadaEl: v.accruedAt,
        revertidaEl: v.reversedAt,
      })),
    },
  };
}

export type DeleteAccountResult = 'OK' | 'NOT_FOUND' | 'HAS_TEACHER_PROFILE' | 'HAS_LIVE_CLASSES';

/** Estados de una clase que todavía compromete a alguien (dinero cobrado o una hora reservada). */
const LIVE_CLASS_STATUSES = ['PENDING_PAYMENT', 'BOOKED', 'CONFIRMED', 'IN_PROGRESS'] as const;

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

  // Bloque 2 — la eliminación NO procede si dejaría algo a medias. Va DENTRO de
  // esta función (y no solo en la acción) para que ningún otro llamador pueda
  // anonimizar por encima de estas dos condiciones:
  //  · un PROFESOR conserva CURP, CLABE y RFC, y sus liquidaciones/CFDI tienen
  //    plazo de conservación fiscal: cerrar ese perfil es un proceso manual con
  //    soporte, no un botón;
  //  · un alumno con clases vivas tiene dinero cobrado y una hora reservada de
  //    otra persona: primero se cancelan (con su reembolso).
  const [teacher, liveClasses] = await Promise.all([
    prisma.teacher.findUnique({ where: { userProfileId }, select: { id: true } }),
    prisma.classSession.count({
      where: { studentProfileId: userProfileId, status: { in: [...LIVE_CLASS_STATUSES] } },
    }),
  ]);
  if (teacher) return 'HAS_TEACHER_PROFILE';
  if (liveClasses > 0) return 'HAS_LIVE_CLASSES';

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
    // Programa de referidos (Bloque 3): el código deja de atribuir y el crédito
    // que quedaba se pierde con la cuenta (es un descuento, no dinero: no hay a
    // quién devolverlo). Las FILAS de venta se conservan —registran lo que pasó
    // y no llevan datos personales del comprador— y `referredByCodeId` se borra
    // porque «a quién le debo mi registro» sí es un dato de la persona.
    prisma.referralCode.updateMany({ where: { userProfileId }, data: { active: false } }),
    prisma.referralCreditLot.updateMany({
      where: { userProfileId, revokedAt: null, remainingCents: { gt: 0 } },
      data: { revokedAt: new Date(), remainingCents: 0 },
    }),
    prisma.userProfile.update({
      where: { id: userProfileId },
      data: {
        displayName: null,
        avatarUrl: null,
        targetExamId: null,
        targetCareerId: null,
        badges: [],
        referredByCodeId: null,
      },
    }),
  ]);

  return 'OK';
}
