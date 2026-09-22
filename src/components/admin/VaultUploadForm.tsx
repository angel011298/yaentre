'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { uploadVaultFileAction } from '@/app/actions/admin-vault';
import { formatBytes, MAX_VAULT_BYTES } from '@/lib/admin/vault';

/**
 * Subida a la bóveda. El archivo viaja por la Server Action (mismo patrón que
 * `uploadAvatarAction`, G65): el navegador nunca habla con Storage
 * directamente, así que no hace falta que la cookie de sesión sea legible
 * desde JavaScript.
 */
export function VaultUploadForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  function handleSubmit() {
    const file = inputRef.current?.files?.[0];
    if (!file) {
      setMessage({ tone: 'error', text: 'Elige un archivo primero.' });
      return;
    }
    setMessage(null);
    const data = new FormData();
    data.set('file', file);
    startTransition(async () => {
      const result = await uploadVaultFileAction(data);
      if (!result.ok) {
        setMessage({ tone: 'error', text: result.message });
        return;
      }
      setMessage({ tone: 'ok', text: 'Archivo guardado en la bóveda.' });
      if (inputRef.current) inputRef.current.value = '';
      router.refresh();
    });
  }

  return (
    <Card className="p-4">
      <h2 className="font-display text-lg font-semibold">Subir archivo</h2>
      {/*
        Sin `<form onSubmit>` a propósito. Este componente NECESITA JavaScript
        (el archivo viaja por una Server Action), y un `<form>` con un botón
        `type="submit"` hace una navegación GET nativa si se pulsa ANTES de que
        React hidrate: la página se recargaba con `?` al final y la subida no
        ocurría nunca, sin un solo mensaje de error. Medido en producción con
        la sonda de cabeceras.

        Un `<div>` con un botón `type="button"` no tiene comportamiento nativo
        que anular: antes de hidratar el clic simplemente no hace nada, que es
        honesto, y después hace lo correcto.
      */}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          aria-label="Archivo"
          accept=".pdf,.png,.jpg,.jpeg,.webp,.csv,.txt,.md,.html,.xlsx,.docx,.pptx"
          className="min-h-touch flex-1 rounded-md border border-border-subtle bg-input px-3 py-2 text-sm text-text-primary file:mr-3 file:rounded-md file:border-0 file:bg-elevated file:px-3 file:py-1.5 file:text-sm file:text-text-primary"
        />
        <Button type="button" onClick={handleSubmit} disabled={isPending}>
          {isPending ? 'Subiendo…' : 'Subir'}
        </Button>
      </div>
      <p className="mt-2 text-xs text-text-muted">
        PDF, PNG, JPG, WebP, CSV, TXT, Markdown, HTML, XLSX, DOCX y PPTX. Máximo{' '}
        {formatBytes(MAX_VAULT_BYTES)} por archivo. Un .html se puede ver como código fuente o
        descargar, pero nunca se ejecuta dentro de la app.
      </p>
      {message && (
        <p
          role="alert"
          className={`mt-3 text-sm font-medium ${
            message.tone === 'ok' ? 'text-success' : 'text-danger'
          }`}
        >
          {message.text}
        </p>
      )}
    </Card>
  );
}
