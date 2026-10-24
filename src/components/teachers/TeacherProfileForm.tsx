'use client';

import { useId, useState } from 'react';
import { updateTeacherProfileAction } from '@/app/actions/teachers';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';

/** G103 — nombre visible y semblanza del directorio (texto plano; nunca HTML). */
export function TeacherProfileForm({ initialDisplayName, initialBio }: { initialDisplayName: string; initialBio: string }) {
  const id = useId();
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [bio, setBio] = useState(initialBio);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  async function save() {
    setPending(true);
    const r = await updateTeacherProfileAction({ displayName, bio }).catch(() => null);
    setPending(false);
    setMessage(r?.ok ? { tone: 'ok', text: 'Guardado.' } : { tone: 'error', text: r?.message ?? 'No pudimos guardar.' });
  }

  return (
    <div className="space-y-3">
      <TextField
        label="Cómo apareces en el directorio"
        name="displayName"
        value={displayName}
        maxLength={40}
        onChange={(e) => setDisplayName(e.target.value)}
      />
      <div className="space-y-1.5">
        <label htmlFor={`${id}-bio`} className="text-sm font-medium text-text-secondary">
          Semblanza (opcional)
        </label>
        <textarea
          id={`${id}-bio`}
          value={bio}
          maxLength={600}
          rows={4}
          onChange={(e) => setBio(e.target.value)}
          className="w-full rounded-md border border-border-subtle bg-input p-3 text-text-primary placeholder:text-text-muted"
          placeholder="Tu experiencia y cómo das clase."
        />
        <p className="text-xs text-text-muted">{bio.length}/600</p>
      </div>
      <Button type="button" variant="secondary" disabled={pending || displayName.trim().length < 3} onClick={save}>
        {pending ? 'Guardando…' : 'Guardar perfil'}
      </Button>
      {message && (
        <p role={message.tone === 'error' ? 'alert' : 'status'} className={`text-sm ${message.tone === 'ok' ? 'text-success' : 'text-danger'}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
