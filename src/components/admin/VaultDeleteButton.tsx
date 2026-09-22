'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { deleteVaultFileAction } from '@/app/actions/admin-vault';

/**
 * Borrado de un archivo de la bóveda. Solo se pinta para el admin maestro —
 * pero eso NO es la protección: `deleteVaultFileAction` vuelve a comprobar rol
 * y compuerta de maestro por su cuenta, porque una Server Action se invoca con
 * un `fetch` sin pasar por ningún botón.
 *
 * Pide motivo y confirmación explícita: el borrado quita el objeto del bucket,
 * y eso no se deshace.
 */
export function VaultDeleteButton({ fileId, name }: { fileId: string; name: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <Button type="button" variant="danger" onClick={() => setOpen(true)}>
        Borrar
      </Button>
    );
  }

  return (
    <div className="flex w-full flex-wrap items-center gap-2 rounded-md border border-danger/40 p-2">
      <p className="w-full text-xs text-text-secondary">
        Vas a borrar <strong className="text-text-primary">{name}</strong>. El archivo se quita
        del almacenamiento y no se puede recuperar.
      </p>
      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Motivo (mínimo 8 caracteres)"
        aria-label="Motivo del borrado"
        className="min-h-touch min-w-0 flex-1 rounded-md border border-border-subtle bg-input px-3 text-sm text-text-primary placeholder:text-text-muted"
      />
      <Button
        type="button"
        variant="danger"
        disabled={isPending || reason.trim().length < 8}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await deleteVaultFileAction({ fileId, reason });
            if (!result.ok) {
              setError(result.message);
              return;
            }
            setOpen(false);
            router.refresh();
          });
        }}
      >
        {isPending ? 'Borrando…' : 'Confirmar'}
      </Button>
      <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={isPending}>
        Cancelar
      </Button>
      {error && (
        <p role="alert" className="w-full text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
