'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { AuthError } from '@/lib/auth/errors';
import { requireRole } from '@/lib/auth/guards';
import { logAdminAction } from '@/lib/admin/audit-log';
import { createNoteSchema, deleteNoteSchema, type ActionResult } from '@/lib/admin/schemas';
import * as notesDb from '@/lib/db/admin-notes';
import { consumeRateLimit } from '@/lib/rate-limit/store';

/**
 * Server Actions de las Notas del panel (apartado dentro de /admin/boveda).
 *
 * ⚠️ Cada acción verifica el rol POR SU CUENTA — `app/admin/layout.tsx` no
 * protege un endpoint, es defensa en profundidad; una Server Action se
 * alcanza con un `fetch` a su ruta sin renderizar ningún layout (verificado
 * en producción para el resto del panel — ver CLAUDE.md).
 *
 * Cualquier ADMIN puede crear, ver y borrar notas — no se exige admin
 * maestro. Son apuntes internos de bajo riesgo, a diferencia de una cortesía,
 * una baja de plan o un cambio de rol, que sí mueven dinero o acceso.
 *
 * 🔒 El contenido se guarda y se sirve como TEXTO PLANO. El componente que lo
 * pinta lo hace con `{content}` de React, que escapa por construcción, nunca
 * con `dangerouslySetInnerHTML` — pegar `<script>` en una nota no debe
 * ejecutar nada, mismo criterio que el resto de la bóveda (ver
 * `src/lib/admin/vault.ts`).
 */

function toError(err: unknown): { code: string; message: string } {
  if (err instanceof z.ZodError) {
    return { code: 'VALIDATION', message: err.issues[0]?.message ?? 'Datos inválidos.' };
  }
  if (err instanceof AuthError) return { code: err.code, message: err.message };
  return { code: 'UNKNOWN', message: 'Algo salió mal. Intenta de nuevo.' };
}

function revalidateVaultPages(): void {
  revalidatePath('/admin/boveda');
  revalidatePath('/admin/bitacora');
}

export async function createNoteAction(input: unknown): Promise<ActionResult<{ noteId: string }>> {
  try {
    const { profile, authUser } = await requireRole('ADMIN');
    const actor = { userProfileId: profile.id, email: authUser.email };

    const parsed = createNoteSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        code: 'VALIDATION',
        message: parsed.error.issues[0]?.message ?? 'Escribe algo antes de guardar.',
      };
    }

    const limit = await consumeRateLimit('ADMIN_NOTE_ACTION', profile.id);
    if (!limit.allowed) {
      return {
        ok: false,
        code: 'RATE_LIMIT',
        message: `Demasiadas notas seguidas. Intenta en ${Math.ceil(limit.retryAfterSecs / 60)} min.`,
      };
    }

    const note = await notesDb.createNote({
      content: parsed.data.content,
      authorId: profile.id,
      authorEmail: authUser.email ?? null,
    });

    await logAdminAction('note.created', actor, {
      targetKind: 'note',
      metadata: { noteId: note.id, length: note.content.length },
    });

    revalidateVaultPages();
    return { ok: true, data: { noteId: note.id } };
  } catch (err) {
    return { ok: false, ...toError(err) };
  }
}

export async function deleteNoteAction(input: unknown): Promise<ActionResult<{ noteId: string }>> {
  try {
    const { profile, authUser } = await requireRole('ADMIN');
    const actor = { userProfileId: profile.id, email: authUser.email };

    const parsed = deleteNoteSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, code: 'VALIDATION', message: 'Identificador de nota inválido.' };
    }

    const limit = await consumeRateLimit('ADMIN_NOTE_ACTION', profile.id);
    if (!limit.allowed) {
      return {
        ok: false,
        code: 'RATE_LIMIT',
        message: `Demasiadas acciones seguidas. Intenta en ${Math.ceil(limit.retryAfterSecs / 60)} min.`,
      };
    }

    const deleted = await notesDb.deleteNote(parsed.data.noteId);
    if (!deleted) {
      return { ok: false, code: 'NOT_FOUND', message: 'Esa nota ya no existe.' };
    }

    await logAdminAction('note.deleted', actor, {
      targetKind: 'note',
      metadata: {
        noteId: deleted.id,
        authorEmail: deleted.authorEmail,
        length: deleted.content.length,
      },
    });

    revalidateVaultPages();
    return { ok: true, data: { noteId: deleted.id } };
  } catch (err) {
    return { ok: false, ...toError(err) };
  }
}
