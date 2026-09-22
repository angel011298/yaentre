'use server';

import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { AuthError } from '@/lib/auth/errors';
import { requireRole } from '@/lib/auth/guards';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { logAdminAction } from '@/lib/admin/audit-log';
import { MASTER_ADMIN_DENIED_MESSAGE, requireMasterAdmin } from '@/lib/admin/master';
import { deleteVaultFileSchema, type ActionResult } from '@/lib/admin/schemas';
import { validateVaultUpload, VAULT_BUCKET } from '@/lib/admin/vault';
import * as vaultDb from '@/lib/db/admin-vault';
import { consumeRateLimit } from '@/lib/rate-limit/store';
import { reportControlFailure } from '@/lib/observability/report';

/**
 * G99 — Server Actions de la bóveda.
 *
 * ⚠️ Cada acción verifica el rol POR SU CUENTA (`app/admin/layout.tsx` no
 * protege un endpoint). Subir exige ADMIN; BORRAR exige además admin maestro.
 *
 * 🔒 Requisito explícito del dueño: los archivos se guardan hasta que el admin
 * maestro los elimine. Aquí no hay nada que caduque ni que limpie: el único
 * camino que marca `deletedAt` es `deleteVaultFileAction`.
 */

function toError(err: unknown): { code: string; message: string } {
  if (err instanceof z.ZodError) {
    return { code: 'VALIDATION', message: err.issues[0]?.message ?? 'Datos inválidos.' };
  }
  if (err instanceof AuthError) return { code: err.code, message: err.message };
  return { code: 'UNKNOWN', message: 'Algo salió mal. Intenta de nuevo.' };
}

// ═══════════════════════════════════════════════════════════════════════════
// Subida
// ═══════════════════════════════════════════════════════════════════════════

export async function uploadVaultFileAction(
  formData: FormData
): Promise<ActionResult<{ fileId: string }>> {
  try {
    const { profile, authUser } = await requireRole('ADMIN');
    const actor = { userProfileId: profile.id, email: authUser.email };

    const limit = await consumeRateLimit('ADMIN_VAULT_UPLOAD', profile.id);
    if (!limit.allowed) {
      await logAdminAction('vault.uploaded', actor, {
        targetKind: 'file',
        metadata: { denied: 'RATE_LIMIT' },
        outcome: 'rejected',
      });
      return { ok: false, code: 'RATE_LIMIT', message: 'Demasiadas subidas seguidas.' };
    }

    const file = formData.get('file');
    if (!(file instanceof File)) {
      await logAdminAction('vault.uploaded', actor, {
        targetKind: 'file',
        metadata: { denied: 'NO_FILE' },
        outcome: 'rejected',
      });
      return { ok: false, code: 'VALIDATION', message: 'No recibimos ningún archivo.' };
    }

    // Tipo y tamaño se validan con la función PURA, la misma que enumeran las
    // pruebas. `file.type` es lo DECLARADO por el cliente: por eso la
    // extensión sale de la tabla de tipos y el `Content-Type` con el que se
    // sirve después es el que guardamos, con `nosniff`.
    const validation = validateVaultUpload({ mimeType: file.type, sizeBytes: file.size });
    if (!validation.ok) {
      await logAdminAction('vault.uploaded', actor, {
        targetKind: 'file',
        metadata: { denied: 'VALIDATION', mimeType: file.type, sizeBytes: file.size },
        outcome: 'rejected',
      });
      return { ok: false, code: 'VALIDATION', message: validation.message };
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const sha256 = createHash('sha256').update(bytes).digest('hex');

    // 🔒 El path NO contiene nada que haya mandado el cliente: identificador
    // aleatorio de `crypto` (nunca `Math.random`, que es reconstruible — G65)
    // + la extensión derivada del TIPO. El nombre original se guarda solo como
    // metadato en la base.
    const path = `${randomUUID()}.${validation.ext}`;

    const supabase = await createSupabaseServerClient();
    const { error: uploadError } = await supabase.storage
      .from(VAULT_BUCKET)
      .upload(path, bytes, { contentType: file.type, upsert: false });

    if (uploadError) {
      // Una subida que falla y responde "ok" sería material que el dueño cree
      // guardado y no está (G73b).
      reportControlFailure('admin_vault_storage', 'fail-closed', uploadError, {
        operation: 'upload',
        sizeBytes: file.size,
      });
      await logAdminAction('vault.uploaded', actor, {
        targetKind: 'file',
        metadata: { denied: 'STORAGE', message: uploadError.message },
        outcome: 'rejected',
      });
      return { ok: false, code: 'STORAGE', message: 'No pudimos guardar el archivo.' };
    }

    const created = await vaultDb.recordVaultFile({
      path,
      originalName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      sha256,
      uploadedById: profile.id,
      uploadedByEmail: authUser.email ?? null,
    });

    await logAdminAction('vault.uploaded', actor, {
      targetKind: 'file',
      metadata: {
        fileId: created.id,
        originalName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        sha256,
      },
    });

    revalidatePath('/admin/boveda');
    revalidatePath('/admin/bitacora');
    return { ok: true, data: { fileId: created.id } };
  } catch (err) {
    return { ok: false, ...toError(err) };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Borrado — SOLO admin maestro
// ═══════════════════════════════════════════════════════════════════════════

export async function deleteVaultFileAction(
  input: unknown
): Promise<ActionResult<{ fileId: string }>> {
  try {
    const { profile, authUser } = await requireRole('ADMIN');
    const actor = { userProfileId: profile.id, email: authUser.email };

    const verdict = requireMasterAdmin(authUser.email);
    if (!verdict.ok) {
      await logAdminAction('vault.deleted', actor, {
        targetKind: 'file',
        metadata: { denied: verdict.reason },
        outcome: 'rejected',
      });
      return { ok: false, code: 'FORBIDDEN', message: MASTER_ADMIN_DENIED_MESSAGE };
    }

    const parsed = deleteVaultFileSchema.safeParse(input);
    if (!parsed.success) {
      await logAdminAction('vault.deleted', actor, {
        targetKind: 'file',
        metadata: { denied: 'VALIDATION' },
        outcome: 'rejected',
      });
      return {
        ok: false,
        code: 'VALIDATION',
        message: parsed.error.issues[0]?.message ?? 'Datos inválidos.',
      };
    }

    const limit = await consumeRateLimit('ADMIN_USER_ACTION', profile.id);
    if (!limit.allowed) {
      await logAdminAction('vault.deleted', actor, {
        targetKind: 'file',
        reason: parsed.data.reason,
        metadata: { denied: 'RATE_LIMIT', fileId: parsed.data.fileId },
        outcome: 'rejected',
      });
      return { ok: false, code: 'RATE_LIMIT', message: 'Demasiadas acciones seguidas.' };
    }

    const existing = await vaultDb.getVaultFile(parsed.data.fileId);
    if (!existing) {
      await logAdminAction('vault.deleted', actor, {
        targetKind: 'file',
        reason: parsed.data.reason,
        metadata: { denied: 'NOT_FOUND', fileId: parsed.data.fileId },
        outcome: 'rejected',
      });
      return { ok: false, code: 'NOT_FOUND', message: 'Ese archivo ya no está en la bóveda.' };
    }

    // 1. Borrado LÓGICO primero, condicionado: si dos admins pulsan a la vez,
    //    solo uno gana y solo uno borra el objeto.
    const claimed = await vaultDb.softDeleteFile(existing.id);
    if (!claimed) {
      return { ok: false, code: 'NOT_FOUND', message: 'Ese archivo ya se había borrado.' };
    }

    // 2. Y luego el objeto del bucket.
    const supabase = await createSupabaseServerClient();
    const { error: removeError } = await supabase.storage
      .from(VAULT_BUCKET)
      .remove([existing.path]);

    if (removeError) {
      // Se REVIERTE el borrado lógico: si el objeto sigue en el bucket y la
      // fila dijera que no, el archivo quedaría fuera del listado pero vivo en
      // Storage — invisible, incontable en la cuota y no vuelto a borrar
      // nunca. El listado tiene que decir la verdad.
      await vaultDb.undoSoftDelete(existing.id);
      reportControlFailure('admin_vault_storage', 'fail-closed', removeError, {
        operation: 'remove',
        fileId: existing.id,
      });
      await logAdminAction('vault.deleted', actor, {
        targetKind: 'file',
        reason: parsed.data.reason,
        metadata: { denied: 'STORAGE', fileId: existing.id, message: removeError.message },
        outcome: 'rejected',
      });
      return {
        ok: false,
        code: 'STORAGE',
        message: 'No pudimos borrar el archivo del almacenamiento. No se cambió nada.',
      };
    }

    await logAdminAction('vault.deleted', actor, {
      targetKind: 'file',
      reason: parsed.data.reason,
      metadata: {
        fileId: existing.id,
        originalName: existing.originalName,
        sizeBytes: existing.sizeBytes,
        sha256: existing.sha256,
      },
    });

    revalidatePath('/admin/boveda');
    revalidatePath('/admin/bitacora');
    return { ok: true, data: { fileId: existing.id } };
  } catch (err) {
    return { ok: false, ...toError(err) };
  }
}
