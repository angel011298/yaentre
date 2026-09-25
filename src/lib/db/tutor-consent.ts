import crypto from 'node:crypto';
import type { OptionalTutorConsentKey } from '@/lib/legal/consent-texts';
import { prisma } from './prisma';

/**
 * Capa de datos de la confirmación del tutor para menores (Bloque 1, handoff
 * §3.1). Un solo `TutorConsent` por alumno (studentProfileId @unique).
 *
 * Seguridad del token de la liga:
 *   · se genera con `crypto.randomBytes` (32 bytes ⇒ 256 bits), NUNCA
 *     `Math.random` (guardrail G65 — xorshift128+ es reconstruible);
 *   · en la base se guarda SOLO el SHA-256 del token; la liga lleva el token en
 *     claro y el servidor lo hashea para buscar. Una fuga de la base no permite
 *     fabricar ligas válidas.
 */

/** Vigencia de la liga de confirmación: 7 días naturales (el tutor puede tardar). */
export const TUTOR_CONSENT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

/** Consentimientos opcionales que puede otorgar el tutor (item 4). */
export type OptionalConsents = Record<OptionalTutorConsentKey, boolean>;

/**
 * Crea o REGENERA la liga de confirmación del tutor para un alumno. Devuelve el
 * token EN CLARO (solo aquí; en la base vive su hash) para construir la URL del
 * correo. Reenviar invalida la liga anterior (nuevo token) sin borrar un
 * consentimiento ya otorgado.
 *
 * El dueño (`studentProfileId`) SIEMPRE sale del guard del llamador, nunca del
 * input del cliente (guardrail CLAUDE.md).
 */
export async function issueTutorConsentToken(input: {
  studentProfileId: string;
  tutorEmail: string;
  now?: Date;
}): Promise<{ rawToken: string; tokenExpiresAt: Date }> {
  const now = input.now ?? new Date();
  const rawToken = crypto.randomBytes(32).toString('base64url');
  const tokenHash = hashToken(rawToken);
  const tokenExpiresAt = new Date(now.getTime() + TUTOR_CONSENT_TTL_MS);

  await prisma.tutorConsent.upsert({
    where: { studentProfileId: input.studentProfileId },
    create: {
      studentProfileId: input.studentProfileId,
      tutorEmail: input.tutorEmail,
      tokenHash,
      tokenExpiresAt,
      requestedAt: now,
    },
    update: {
      tutorEmail: input.tutorEmail,
      tokenHash,
      tokenExpiresAt,
      requestedAt: now,
    },
  });

  return { rawToken, tokenExpiresAt };
}

export interface TutorConsentView {
  studentDisplayName: string | null;
  tutorEmail: string;
  alreadyConfirmed: boolean;
}

/**
 * Resuelve una liga por su token EN CLARO, para pintar la página del tutor.
 * Devuelve `null` si el token no existe o ya expiró. No revela nada del alumno
 * salvo su nombre visible (para que el tutor sepa a quién autoriza).
 */
export async function loadTutorConsentByToken(
  rawToken: string,
  now: Date = new Date()
): Promise<TutorConsentView | null> {
  const row = await prisma.tutorConsent.findUnique({
    where: { tokenHash: hashToken(rawToken) },
    select: {
      tutorEmail: true,
      tokenExpiresAt: true,
      confirmedAt: true,
      studentProfile: { select: { displayName: true } },
    },
  });
  if (!row) return null;
  if (row.tokenExpiresAt.getTime() < now.getTime()) return null;

  return {
    studentDisplayName: row.studentProfile.displayName,
    tutorEmail: row.tutorEmail,
    alreadyConfirmed: row.confirmedAt !== null,
  };
}

export type ConfirmTutorConsentResult =
  | { ok: true }
  | { ok: false; code: 'INVALID_TOKEN' | 'EXPIRED' | 'DATA_CONSENT_REQUIRED' };

/**
 * El tutor confirma desde la liga. Registra los consentimientos granulares y
 * sella `confirmedAt` + la versión del texto. El consentimiento de DATOS es
 * obligatorio (sin él no hay ni tratamiento de datos ni ratificación del
 * contrato, así que la confirmación no procede). Autorizado por el TOKEN, no por
 * sesión: el tutor no tiene cuenta.
 */
export async function confirmTutorConsent(input: {
  rawToken: string;
  dataConsent: boolean;
  optional: OptionalConsents;
  tutorName?: string | null;
  relationship?: string | null;
  consentVersion: string;
  confirmedIp?: string | null;
  now?: Date;
}): Promise<ConfirmTutorConsentResult> {
  const now = input.now ?? new Date();

  if (!input.dataConsent) return { ok: false, code: 'DATA_CONSENT_REQUIRED' };

  const row = await prisma.tutorConsent.findUnique({
    where: { tokenHash: hashToken(input.rawToken) },
    select: { id: true, tokenExpiresAt: true },
  });
  if (!row) return { ok: false, code: 'INVALID_TOKEN' };
  if (row.tokenExpiresAt.getTime() < now.getTime()) return { ok: false, code: 'EXPIRED' };

  await prisma.tutorConsent.update({
    where: { id: row.id },
    data: {
      dataConsent: true,
      marketingConsent: input.optional.marketing,
      analyticsConsent: input.optional.analytics,
      recordingConsent: input.optional.recording,
      consentVersion: input.consentVersion,
      tutorName: input.tutorName ?? undefined,
      relationship: input.relationship ?? undefined,
      confirmedAt: now,
      confirmedIp: input.confirmedIp ?? undefined,
    },
  });

  return { ok: true };
}

export interface StudentTutorConsentStatus {
  exists: boolean;
  confirmed: boolean;
  tutorEmail: string | null;
  requestedAt: Date | null;
}

/** Estado de la confirmación del tutor para el alumno (para su página y el gate). */
export async function getTutorConsentStatus(
  studentProfileId: string
): Promise<StudentTutorConsentStatus> {
  const row = await prisma.tutorConsent.findUnique({
    where: { studentProfileId },
    select: { confirmedAt: true, dataConsent: true, tutorEmail: true, requestedAt: true },
  });
  if (!row) {
    return { exists: false, confirmed: false, tutorEmail: null, requestedAt: null };
  }
  return {
    exists: true,
    // Confirmado SOLO si el tutor otorgó el consentimiento de DATOS y selló la
    // confirmación — un token creado pero no confirmado NO habilita la compra.
    confirmed: row.confirmedAt !== null && row.dataConsent,
    tutorEmail: row.tutorEmail,
    requestedAt: row.requestedAt,
  };
}

/** ¿El menor ya tiene la confirmación del tutor que habilita la compra? */
export async function hasConfirmedTutorConsent(studentProfileId: string): Promise<boolean> {
  return (await getTutorConsentStatus(studentProfileId)).confirmed;
}
