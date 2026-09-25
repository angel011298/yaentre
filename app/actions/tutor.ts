'use server';

import { z } from 'zod';
import { AuthError } from '@/lib/auth/errors';
import { requireUser } from '@/lib/auth/guards';
import { getSiteUrl } from '@/lib/auth/site-url';
import type { ActionState } from '@/lib/auth/types';
import { requiresTutorConsent } from '@/lib/legal/age';
import { TUTOR_CONSENT_VERSION } from '@/lib/legal/consent-texts';
import { confirmTutorConsent, issueTutorConsentToken } from '@/lib/db/tutor-consent';
import { tutorConsentEmail } from '@/lib/email/templates';
import { sendEmail } from '@/lib/email/client';
import { consumeRateLimit } from '@/lib/rate-limit/store';
import { currentClientIp } from '@/lib/rate-limit/request';

/**
 * Confirmación del tutor para menores (Bloque 1, handoff §3.1). Dos acciones:
 *
 *  · `requestTutorConsentAction` — el ALUMNO menor solicita (o reenvía) la liga
 *    a su tutor. El dueño sale SIEMPRE del guard, nunca del input (guardrail
 *    CLAUDE.md): la acción no acepta ningún id de perfil. Solo recibe el correo
 *    del tutor.
 *
 *  · `confirmTutorConsentAction` — el TUTOR confirma desde la liga. NO tiene
 *    sesión: la autorización es el TOKEN de un solo uso (como el flujo de
 *    recuperación de contraseña), no una cuenta. Se limita por IP.
 */

const tutorEmailSchema = z.object({
  tutorEmail: z
    .string()
    .trim()
    .toLowerCase()
    .max(254, 'Ese correo es demasiado largo.')
    .email('Ingresa un correo válido.'),
});

export async function requestTutorConsentAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  let profileId: string;
  let birthDate: Date | null;
  let displayName: string | null;
  try {
    const { profile } = await requireUser();
    profileId = profile.id;
    birthDate = profile.birthDate;
    displayName = profile.displayName;
  } catch (err) {
    if (err instanceof AuthError) return { status: 'error', message: err.message };
    throw err;
  }

  // Solo tiene sentido para un MENOR con fecha de nacimiento declarada. Un
  // adulto no necesita tutor; sin fecha, no podemos saberlo.
  if (!birthDate) {
    return {
      status: 'error',
      message: 'Falta tu fecha de nacimiento. Complétala antes de solicitar la confirmación.',
    };
  }
  if (!requiresTutorConsent(birthDate, new Date())) {
    return {
      status: 'error',
      message: 'Ya eres mayor de edad: no necesitas la confirmación de un tutor.',
    };
  }

  const parsed = tutorEmailSchema.safeParse({ tutorEmail: formData.get('tutorEmail') });
  if (!parsed.success) {
    return { status: 'error', fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const gate = await consumeRateLimit('TUTOR_CONSENT_REQUEST', profileId);
  if (!gate.allowed) {
    const min = Math.max(1, Math.ceil(gate.retryAfterSecs / 60));
    return {
      status: 'error',
      message: `Enviaste varias solicitudes seguidas. Espera ${min} minuto${min === 1 ? '' : 's'} y vuelve a intentar.`,
    };
  }

  const { rawToken } = await issueTutorConsentToken({
    studentProfileId: profileId,
    tutorEmail: parsed.data.tutorEmail,
  });

  const confirmUrl = `${getSiteUrl()}/confirmar-tutor?token=${encodeURIComponent(rawToken)}`;
  await sendEmail({
    to: parsed.data.tutorEmail,
    ...tutorConsentEmail({ studentName: displayName, confirmUrl }),
  });

  return {
    status: 'success',
    message: `Le enviamos la liga de confirmación a ${parsed.data.tutorEmail}. Pídele que revise su correo (y la carpeta de spam).`,
  };
}

const confirmSchema = z.object({
  token: z.string().min(1).max(512),
  dataConsent: z.string().optional(),
  marketingConsent: z.string().optional(),
  analyticsConsent: z.string().optional(),
  recordingConsent: z.string().optional(),
  tutorName: z.string().trim().max(120).optional(),
  relationship: z.string().trim().max(60).optional(),
});

export async function confirmTutorConsentAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = confirmSchema.safeParse({
    token: formData.get('token'),
    dataConsent: formData.get('dataConsent') ?? undefined,
    marketingConsent: formData.get('marketingConsent') ?? undefined,
    analyticsConsent: formData.get('analyticsConsent') ?? undefined,
    recordingConsent: formData.get('recordingConsent') ?? undefined,
    tutorName: formData.get('tutorName') ?? undefined,
    relationship: formData.get('relationship') ?? undefined,
  });
  if (!parsed.success) {
    return { status: 'error', message: 'No pudimos procesar la confirmación. Recarga la página.' };
  }

  const gate = await consumeRateLimit('TUTOR_CONSENT_CONFIRM_IP', `ip:${await currentClientIp()}`);
  if (!gate.allowed) {
    return { status: 'error', message: 'Demasiados intentos. Espera un momento y vuelve a intentar.' };
  }

  if (parsed.data.dataConsent !== 'on') {
    return {
      status: 'error',
      message:
        'Para confirmar la inscripción necesitas autorizar el tratamiento de datos (la primera casilla).',
    };
  }

  const result = await confirmTutorConsent({
    rawToken: parsed.data.token,
    dataConsent: true,
    optional: {
      marketing: parsed.data.marketingConsent === 'on',
      analytics: parsed.data.analyticsConsent === 'on',
      recording: parsed.data.recordingConsent === 'on',
    },
    tutorName: parsed.data.tutorName || null,
    relationship: parsed.data.relationship || null,
    consentVersion: TUTOR_CONSENT_VERSION,
    confirmedIp: await currentClientIp(),
  });

  if (!result.ok) {
    const message =
      result.code === 'EXPIRED'
        ? 'Esta liga ya caducó. Pídele a tu hijo(a) que te envíe una nueva desde su cuenta.'
        : result.code === 'DATA_CONSENT_REQUIRED'
          ? 'Para confirmar necesitas autorizar el tratamiento de datos.'
          : 'La liga no es válida. Revisa que hayas abierto el enlace más reciente.';
    return { status: 'error', message };
  }

  return {
    status: 'success',
    message: 'Listo. Confirmaste la inscripción. Tu hijo(a) ya puede contratar un plan cuando quiera.',
  };
}
