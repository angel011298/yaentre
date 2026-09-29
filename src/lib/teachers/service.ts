import { ZodError } from 'zod';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { getSiteUrl } from '@/lib/auth/site-url';
import { trackServerEvent } from '@/lib/analytics/server';
import { MarketplaceError } from '@/lib/classes/errors';
import { createTeacherApplication, updateOwnTeacher } from '@/lib/db/teachers';
import { sendEmail } from '@/lib/email/client';
import { teacherClabeChangedEmail } from '@/lib/email/templates';
import {
  TEACHER_APPLICATIONS_CLOSED_MESSAGE,
  TEACHER_CONTRACT_VERSION,
  TEACHER_NDA_VERSION,
  TEACHER_RECORDING_POLICY_VERSION,
  teacherLegalTextsFinal,
} from '@/lib/legal/teacher-texts';
import { reportSilentDegradation } from '@/lib/observability/report';
import { consumeRateLimit } from '@/lib/rate-limit/store';
import {
  CSF_BUCKET,
  CSF_REJECTION_MESSAGES,
  buildCsfPath,
  csfPathBelongsTo,
  validateCsfFile,
} from './csf';
import { maskClabe } from './identity';
import {
  buildTeacherApplicationSchema,
  buildTeacherUpdateSchema,
  type TeacherApplication,
  type TeacherUpdateData,
} from './onboarding';

/**
 * Servicio del profesor — Bloque 2. Lo llaman las Server Actions (formularios)
 * y los Route Handlers (`/api/teachers/*`, spec §11), para que las reglas no
 * diverjan entre las dos superficies.
 *
 * El actor SIEMPRE sale del guard del llamador: ninguna función de aquí recibe
 * un identificador de persona desde un cuerpo de petición (guardrail de
 * CLAUDE.md).
 */

export interface TeacherActor {
  userProfileId: string;
  /** UID de Supabase Auth: es la carpeta del bucket de constancias. */
  authUserId: string;
  email: string | null | undefined;
}

// ─────────────────────────────── Validación ───────────────────────────────

export type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string; fieldErrors: Record<string, string[]> };

function fail(err: ZodError): { ok: false; message: string; fieldErrors: Record<string, string[]> } {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of err.issues) {
    const key = String(issue.path[0] ?? '_');
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return { ok: false, message: err.issues[0]?.message ?? 'Datos inválidos.', fieldErrors };
}

export function parseTeacherApplication(raw: unknown, now: Date): ParseResult<TeacherApplication> {
  const parsed = buildTeacherApplicationSchema(now).safeParse(raw);
  return parsed.success ? { ok: true, data: parsed.data } : fail(parsed.error);
}

export function parseTeacherUpdate(raw: unknown): ParseResult<TeacherUpdateData> {
  const parsed = buildTeacherUpdateSchema().safeParse(raw);
  return parsed.success ? { ok: true, data: parsed.data } : fail(parsed.error);
}

// ─────────────────────────────── Constancia (CSF) ───────────────────────────────

/**
 * Sube la Constancia de Situación Fiscal al bucket privado y devuelve su ruta.
 * La ruta la arma el SERVIDOR (`<uid>/<uuid>.pdf`): el nombre del archivo que
 * mandó el cliente no participa en nada.
 */
export async function uploadCsf(actor: TeacherActor, file: File): Promise<{ path: string }> {
  const gate = await consumeRateLimit('TEACHER_CSF_UPLOAD', actor.userProfileId);
  if (!gate.allowed) {
    throw new MarketplaceError('RATE_LIMIT', 'Subiste varias constancias seguidas. Espera un momento y vuelve a intentar.');
  }

  const head = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  const verdict = validateCsfFile({ sizeBytes: file.size, declaredType: file.type, head });
  if (!verdict.ok) throw new MarketplaceError('VALIDATION', CSF_REJECTION_MESSAGES[verdict.reason]);

  const path = buildCsfPath(actor.authUserId, crypto.randomUUID());
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.storage.from(CSF_BUCKET).upload(path, file, {
    contentType: 'application/pdf',
    upsert: false,
  });
  if (error) {
    reportSilentDegradation('marketplace_api', error, { stage: 'csf_upload' });
    throw new MarketplaceError('UPSTREAM', 'No pudimos guardar tu constancia. Intenta de nuevo en un momento.');
  }
  return { path };
}

/** ¿Existe de verdad el objeto que la solicitud dice haber subido? Se comprueba en Storage, no se cree. */
async function csfObjectExists(actor: TeacherActor, path: string): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const fileName = path.slice(path.indexOf('/') + 1);
  const { data, error } = await supabase.storage.from(CSF_BUCKET).list(actor.authUserId, { search: fileName });
  if (error) {
    reportSilentDegradation('marketplace_api', error, { stage: 'csf_exists' });
    throw new MarketplaceError('UPSTREAM', 'No pudimos verificar tu constancia. Intenta de nuevo en un momento.');
  }
  return (data ?? []).some((o) => o.name === fileName);
}

// ─────────────────────────────── Solicitud ───────────────────────────────

/**
 * Envía la solicitud de onboarding. `application` ya viene validada y con el
 * carril decidido por `determinePaymentRail` — este servicio NO acepta un carril
 * del cliente.
 */
export async function submitTeacherApplication(
  actor: TeacherActor,
  application: TeacherApplication,
  now: Date = new Date()
): Promise<{ teacherId: string }> {
  // Sin los textos legales definitivos no se firma nada (ver `teacherLegalTextsFinal`).
  if (!teacherLegalTextsFinal()) {
    throw new MarketplaceError('MARKETPLACE_CLOSED', TEACHER_APPLICATIONS_CLOSED_MESSAGE);
  }

  const gate = await consumeRateLimit('TEACHER_APPLY', actor.userProfileId);
  if (!gate.allowed) {
    throw new MarketplaceError('RATE_LIMIT', 'Enviaste varias solicitudes seguidas. Espera un momento y vuelve a intentar.');
  }

  if (application.csfDocumentPath) {
    // La constancia tiene que ser DE ESTA PERSONA y existir. Sin lo primero, un
    // profesor podría declarar como suya la CSF de otro; sin lo segundo, el
    // Carril A quedaría respaldado por un archivo que nadie subió.
    if (!csfPathBelongsTo(application.csfDocumentPath, actor.authUserId)) {
      throw new MarketplaceError('VALIDATION', 'La constancia no es válida. Vuelve a subirla.');
    }
    if (!(await csfObjectExists(actor, application.csfDocumentPath))) {
      throw new MarketplaceError('VALIDATION', 'No encontramos tu constancia. Vuelve a subirla.');
    }
  }

  const { teacherId } = await createTeacherApplication({
    userProfileId: actor.userProfileId,
    application,
    versions: {
      contract: TEACHER_CONTRACT_VERSION,
      nda: TEACHER_NDA_VERSION,
      recording: TEACHER_RECORDING_POLICY_VERSION,
    },
    now,
  });

  await trackServerEvent(actor.userProfileId, 'teacher_applied', {
    paymentRail: application.paymentRail,
    subjects: application.subjects.length,
  });

  return { teacherId };
}

// ─────────────────────────────── Actualización ───────────────────────────────

/**
 * Aplica un cambio a los datos del PROPIO profesor. Si cambia la CLABE avisa por
 * correo al titular de la cuenta: cambiar el destino de las liquidaciones es la
 * primera cosa que haría alguien que tomara la sesión.
 */
export async function patchOwnTeacher(
  actor: TeacherActor,
  teacher: { id: string; bankName: string },
  patch: TeacherUpdateData,
  now: Date = new Date()
): Promise<{ clabeChanged: boolean }> {
  const gate = await consumeRateLimit('TEACHER_UPDATE', actor.userProfileId);
  if (!gate.allowed) {
    throw new MarketplaceError('RATE_LIMIT', 'Hiciste varios cambios seguidos. Espera un momento y vuelve a intentar.');
  }

  const { clabeChanged } = await updateOwnTeacher(teacher.id, patch, now);

  if (clabeChanged && patch.clabe && actor.email) {
    await sendEmail({
      to: actor.email,
      ...teacherClabeChangedEmail({
        bankName: patch.bankName ?? teacher.bankName,
        clabeMasked: maskClabe(patch.clabe),
      }),
    });
  }
  return { clabeChanged };
}

/** URL de la pantalla del profesor, para los correos. */
export function teacherDashboardUrl(): string {
  return `${getSiteUrl()}/profesor`;
}
