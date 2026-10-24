'use client';

import { useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { uploadTeacherCsfAction } from '@/app/actions/teachers';
import { Button } from '@/components/ui/Button';

/**
 * G103 — constancia de situación fiscal (Carril A). Botón `type="button"`, no
 * un `<form>`: un clic antes de hidratar no debe navegar (G99). El servidor
 * valida tamaño y firma del PDF; aquí solo se adelanta el mensaje.
 */
export function CsfUploadForm() {
  const id = useId();
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  async function upload() {
    const file = input.current?.files?.[0];
    if (!file) {
      setMessage({ tone: 'error', text: 'Selecciona tu constancia en PDF.' });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setMessage({ tone: 'error', text: 'El PDF debe pesar menos de 2 MB.' });
      return;
    }
    setPending(true);
    const fd = new FormData();
    fd.set('file', file);
    const r = await uploadTeacherCsfAction(fd).catch(() => null);
    setPending(false);
    if (r?.ok) {
      setMessage({ tone: 'ok', text: 'Recibimos tu constancia.' });
      router.refresh();
    } else {
      setMessage({ tone: 'error', text: r?.message ?? 'No pudimos subir el archivo. Intenta de nuevo.' });
    }
  }

  return (
    <div className="space-y-2 rounded-md border border-border-subtle p-3">
      <label htmlFor={`${id}-csf`} className="text-sm font-medium text-text-secondary">
        Constancia de situación fiscal (PDF, máx. 2 MB)
      </label>
      <input
        ref={input}
        id={`${id}-csf`}
        type="file"
        accept="application/pdf"
        className="block w-full text-sm text-text-secondary file:mr-3 file:min-h-touch file:rounded-md file:border-0 file:bg-elevated file:px-3 file:font-semibold"
      />
      <Button type="button" variant="secondary" disabled={pending} onClick={upload}>
        {pending ? 'Subiendo…' : 'Subir constancia'}
      </Button>
      {message && (
        <p role={message.tone === 'error' ? 'alert' : 'status'} className={`text-sm ${message.tone === 'ok' ? 'text-success' : 'text-danger'}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
