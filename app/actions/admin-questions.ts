'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { AuthError } from '@/lib/auth/errors';
import { requireRole } from '@/lib/auth/guards';
import { AdminError } from '@/lib/admin/errors';
import { logAdminAction } from '@/lib/admin/audit-log';
import {
  questionIdSchema,
  updateQuestionInputSchema,
  type ActionResult,
} from '@/lib/admin/schemas';
import * as adminDb from '@/lib/db/admin-questions';
import { validateDraft } from '../../scripts/lib/question-draft-schema';

/**
 * Server Actions del panel admin (CC-06). Cada una: (1) exige rol ADMIN,
 * (2) valida el input, (3) delega en la capa DB, (4) registra auditoría
 * mínima (quién + cuándo, vía log — ver src/lib/admin/audit-log.ts, el schema
 * no se tocó), (5) revalida las rutas afectadas.
 */

function toError(err: unknown): { code: string; message: string } {
  if (err instanceof z.ZodError) {
    return { code: 'VALIDATION', message: 'Datos inválidos.' };
  }
  if (err instanceof AdminError || err instanceof AuthError) {
    return { code: err.code, message: err.message };
  }
  return { code: 'UNKNOWN', message: 'Algo salió mal. Intenta de nuevo.' };
}

export async function approveQuestionAction(
  input: z.input<typeof questionIdSchema>,
): Promise<ActionResult<{ questionId: string }>> {
  try {
    const { profile, authUser } = await requireRole('ADMIN');
    const { questionId } = questionIdSchema.parse(input);

    await adminDb.approveQuestion(questionId);

    logAdminAction(
      'question.approved',
      { userProfileId: profile.id, email: authUser.email },
      { questionId },
    );

    revalidatePath('/admin/questions/queue');
    revalidatePath(`/admin/questions/${questionId}`);
    revalidatePath('/admin/coverage');
    return { ok: true, data: { questionId } };
  } catch (err) {
    return { ok: false, ...toError(err) };
  }
}

export async function rejectQuestionAction(
  input: z.input<typeof questionIdSchema>,
): Promise<ActionResult<{ questionId: string }>> {
  try {
    const { profile, authUser } = await requireRole('ADMIN');
    const { questionId } = questionIdSchema.parse(input);

    const snapshot = await adminDb.rejectQuestion(questionId);

    logAdminAction(
      'question.rejected',
      { userProfileId: profile.id, email: authUser.email },
      { questionId, snapshot },
    );

    revalidatePath('/admin/questions/queue');
    revalidatePath('/admin/coverage');
    return { ok: true, data: { questionId } };
  } catch (err) {
    return { ok: false, ...toError(err) };
  }
}

export async function updateQuestionAction(
  input: z.input<typeof updateQuestionInputSchema>,
): Promise<ActionResult<{ questionId: string }>> {
  try {
    const { profile, authUser } = await requireRole('ADMIN');
    const { questionId, draft } = updateQuestionInputSchema.parse(input);

    const validated = validateDraft(draft);
    if (!validated.ok) {
      return { ok: false, code: 'VALIDATION', message: validated.errors.join(' · ') };
    }

    await adminDb.updateQuestion(questionId, validated.draft);

    logAdminAction(
      'question.updated',
      { userProfileId: profile.id, email: authUser.email },
      { questionId },
    );

    revalidatePath(`/admin/questions/${questionId}`);
    revalidatePath('/admin/questions/queue');
    return { ok: true, data: { questionId } };
  } catch (err) {
    return { ok: false, ...toError(err) };
  }
}

export async function resolveReportsAction(
  input: z.input<typeof questionIdSchema>,
): Promise<ActionResult<{ questionId: string; resolvedCount: number }>> {
  try {
    const { profile, authUser } = await requireRole('ADMIN');
    const { questionId } = questionIdSchema.parse(input);

    const resolvedCount = await adminDb.resolveReportsForQuestion(questionId);

    logAdminAction(
      'question.reports_resolved',
      { userProfileId: profile.id, email: authUser.email },
      { questionId, resolvedCount },
    );

    revalidatePath('/admin/reports');
    return { ok: true, data: { questionId, resolvedCount } };
  } catch (err) {
    return { ok: false, ...toError(err) };
  }
}
