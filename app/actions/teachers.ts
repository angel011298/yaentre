'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { AuthError } from '@/lib/auth/errors';
import { requireVerifiedForPurchase } from '@/lib/auth/guards';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import {
  recordTeacherCsf,
  submitTeacherApplication,
  TeacherError,
  updateTeacherPublicProfile,
} from '@/lib/db/teachers';
import { evaluateLegalGate, LEGAL_PENDING_MESSAGE } from '@/lib/marketplace/legal-gate';
import { readMarketplaceFlags, regularizacionClassesOn } from '@/lib/marketplace/flags';
import { reportControlFailure } from '@/lib/observability/report';
import { consumeRateLimit } from '@/lib/rate-limit/store';
import type { ActionResult } from '@/lib/sessions/schemas';
import { requireTeacher } from '@/lib/teachers/guard';
import { TEACHER_LEGAL_VERSIONS } from '@/lib/teachers/onboarding';
import { teacherApplicationSchema, teacherPublicProfileSchema, type TeacherApplicationRaw } from '@/lib/teachers/schemas';
import { isPdf, TEACHER_DOCS_BUCKET, CSF_MAX_BYTES } from '@/lib/teachers/documents';

/**
 * G103 — acciones del profesor: solicitud de alta, constancia fiscal y perfil
 * público. El dueño sale SIEMPRE del guard; ningún esquema acepta un id de
 * usuario. CLABE, CURP y RFC NUNCA se escriben en un log ni en Sentry: los
 * errores se reportan sin el cuerpo de la solicitud.
 */

function fail(code: string, message: string): ActionResult<never> {
  return { ok: false, code, message };
}

export async function applyAsTeacherAction(raw: TeacherApplicationRaw): Promise<ActionResult<{ status: string }>> {
  const flags = readMarketplaceFlags();
  if (!flags.liveClasses) return fail('NOT_FOUND', 'Esta sección no está disponible.');

  let profileId: string;
  try {
    // Correo verificado: es el canal por el que se le avisará de su revisión
    // y de sus liquidaciones.
    profileId = (await requireVerifiedForPurchase()).profile.id;
  } catch (err) {
    if (err instanceof AuthError) return fail(err.code, err.message);
    throw err;
  }

  const legal = evaluateLegalGate(Object.values(TEACHER_LEGAL_VERSIONS), process.env.VERCEL_ENV);
  if (!legal.ok) {
    reportControlFailure('legal_text_pending', 'fail-closed', new Error('Alta de profesor con textos TODO-CLO'), {
      pending: legal.pending,
    });
    return fail('LEGAL_PENDING', LEGAL_PENDING_MESSAGE);
  }

  const limit = await consumeRateLimit('TEACHER_APPLY', profileId);
  if (!limit.allowed) return fail('RATE_LIMIT', 'Ya enviaste varias solicitudes hoy. Intenta mañana.');

  const parsed = teacherApplicationSchema.safeParse(raw);
  if (!parsed.success) return fail('VALIDATION', parsed.error.issues[0]?.message ?? 'Revisa los datos.');
  const data = parsed.data;

  if (!regularizacionClassesOn(flags) && data.subjects.some((s) => s.track === 'REGULARIZACION')) {
    return fail('VALIDATION', 'Las clases de regularización todavía no están disponibles.');
  }

  try {
    const teacher = await submitTeacherApplication(
      profileId,
      {
        displayName: data.displayName,
        bio: data.bio ?? null,
        fullName: data.fullName,
        curp: data.curp,
        phone: data.phone,
        clabe: data.clabe,
        bankName: data.bankName,
        canInvoice: data.canInvoice,
        rfc: data.rfc ?? null,
        subjects: data.subjects,
      },
      new Date()
    );
    revalidatePath('/profesor');
    return { ok: true, data: { status: teacher.status } };
  } catch (err) {
    if (err instanceof TeacherError) return fail(err.code, err.message);
    // Sin el cuerpo de la solicitud: lleva CLABE, CURP y RFC.
    console.error('[teachers] No se pudo guardar la solicitud', err instanceof Error ? err.message : 'error');
    return fail('DB', 'No pudimos guardar tu solicitud. Intenta de nuevo.');
  }
}

/**
 * Constancia de situación fiscal (solo Carril A). PDF de hasta 2 MB, validado
 * por su FIRMA (`%PDF-`), no por la extensión ni por el tipo que declara el
 * navegador. Path generado por el servidor: nunca el nombre del archivo.
 */
export async function uploadTeacherCsfAction(formData: FormData): Promise<ActionResult<{ uploaded: true }>> {
  if (!readMarketplaceFlags().liveClasses) return fail('NOT_FOUND', 'Esta sección no está disponible.');

  let teacherId: string;
  let profileId: string;
  try {
    const ctx = await requireTeacher();
    teacherId = ctx.teacher.id;
    profileId = ctx.profile.id;
  } catch (err) {
    if (err instanceof AuthError) return fail(err.code, err.message);
    throw err;
  }

  const limit = await consumeRateLimit('TEACHER_UPLOAD', profileId);
  if (!limit.allowed) return fail('RATE_LIMIT', 'Espera un momento antes de volver a subir el archivo.');

  const file = formData.get('file');
  if (!(file instanceof File)) return fail('VALIDATION', 'Selecciona tu constancia en PDF.');
  if (file.size === 0 || file.size > CSF_MAX_BYTES) return fail('VALIDATION', 'El PDF debe pesar menos de 2 MB.');

  const bytes = Buffer.from(await file.arrayBuffer());
  if (!isPdf(bytes)) return fail('VALIDATION', 'El archivo no es un PDF válido.');

  const path = `teachers/${teacherId}/csf-${randomUUID()}.pdf`;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.storage
    .from(TEACHER_DOCS_BUCKET)
    .upload(path, bytes, { contentType: 'application/pdf', upsert: false });
  if (error) {
    reportControlFailure('marketplace_storage', 'fail-closed', error, { operation: 'csf_upload' });
    return fail('STORAGE', 'No pudimos guardar tu constancia. Intenta de nuevo.');
  }

  await recordTeacherCsf(teacherId, path);
  revalidatePath('/profesor');
  return { ok: true, data: { uploaded: true } };
}

export async function updateTeacherProfileAction(raw: unknown): Promise<ActionResult<{ saved: true }>> {
  if (!readMarketplaceFlags().liveClasses) return fail('NOT_FOUND', 'Esta sección no está disponible.');
  let teacherId: string;
  let profileId: string;
  try {
    const ctx = await requireTeacher();
    teacherId = ctx.teacher.id;
    profileId = ctx.profile.id;
  } catch (err) {
    if (err instanceof AuthError) return fail(err.code, err.message);
    throw err;
  }
  const limit = await consumeRateLimit('TEACHER_WRITE', profileId);
  if (!limit.allowed) return fail('RATE_LIMIT', 'Demasiados cambios seguidos. Espera un momento.');
  const parsed = teacherPublicProfileSchema.safeParse(raw);
  if (!parsed.success) return fail('VALIDATION', parsed.error.issues[0]?.message ?? 'Revisa los datos.');
  await updateTeacherPublicProfile(teacherId, { displayName: parsed.data.displayName, bio: parsed.data.bio ?? null });
  revalidatePath('/profesor');
  return { ok: true, data: { saved: true } };
}
