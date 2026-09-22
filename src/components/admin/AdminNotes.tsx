'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { createNoteAction, deleteNoteAction } from '@/app/actions/admin-notes';

export interface NoteItem {
  id: string;
  content: string;
  authorEmail: string | null;
  /** Ya formateada por el servidor (mismo formato que el resto del panel). */
  createdAtLabel: string;
}

const MAX_NOTE_LENGTH = 5000;

/**
 * Notas del panel — apartado dentro de /admin/boveda.
 *
 * Sin `<form onSubmit>`: mismo motivo que `VaultUploadForm` — un botón
 * `type="submit"` dentro de un `<form>` hace un submit GET nativo si se
 * pulsa antes de que React hidrate. Botón `type="button"` con `onClick`.
 *
 * 🔒 El contenido de cada nota se pinta con `{note.content}`, JSX normal que
 * React escapa por construcción — nunca `dangerouslySetInnerHTML`. Pegar
 * HTML o `<script>` en una nota no ejecuta nada, mismo criterio que el resto
 * de la bóveda.
 */
export function AdminNotes({ notes }: { notes: NoteItem[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function handleCreate() {
    setError(null);
    startTransition(async () => {
      const result = await createNoteAction({ content });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setContent('');
      router.refresh();
    });
  }

  function handleDelete(id: string) {
    setError(null);
    setDeletingId(id);
    startTransition(async () => {
      const result = await deleteNoteAction({ noteId: id });
      if (!result.ok) {
        setDeletingId(null);
        setError(result.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label htmlFor="admin-note-content" className="sr-only">
          Nueva nota
        </label>
        <textarea
          id="admin-note-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Escribe una nota…"
          rows={3}
          maxLength={MAX_NOTE_LENGTH}
          className="min-h-[80px] w-full rounded-md border border-border-subtle bg-input px-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
        />
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-text-muted">
            {content.length}/{MAX_NOTE_LENGTH}
          </p>
          <Button
            type="button"
            onClick={handleCreate}
            disabled={isPending || content.trim().length === 0}
          >
            {isPending && deletingId === null ? 'Guardando…' : 'Guardar nota'}
          </Button>
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      )}

      {notes.length === 0 ? (
        <p className="text-sm text-text-secondary">Sin notas todavía.</p>
      ) : (
        <ul className="space-y-2">
          {notes.map((note) => (
            <li key={note.id} className="rounded-lg border border-border-subtle p-3">
              <p className="whitespace-pre-wrap break-words text-sm text-text-primary">
                {note.content}
              </p>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-text-muted">
                <span>
                  {note.authorEmail ?? '(cuenta eliminada)'} · {note.createdAtLabel}
                </span>
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => handleDelete(note.id)}
                  disabled={isPending}
                >
                  {deletingId === note.id ? 'Borrando…' : 'Borrar'}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
