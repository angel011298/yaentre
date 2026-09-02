'use client';

import Image from 'next/image';
import { useState, type ChangeEvent, type FormEvent } from 'react';
import { updateDisplayNameAction, uploadAvatarAction } from '@/app/actions/profile';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { TextField } from '@/components/ui/TextField';

/**
 * Nombre visible + foto de perfil (F17 tarea 2).
 *
 * G65: la foto ya NO sube directo del navegador a Supabase Storage. Ese camino
 * exigía que la cookie de sesión fuera legible por JavaScript (`httpOnly:
 * false`), y era el único motivo por el que lo era — un precio altísimo para
 * una foto de perfil. Ahora el archivo va por `uploadAvatarAction`, que lo
 * sube con la sesión del usuario desde el servidor y aplica lista blanca de
 * tipo y tope de tamaño. Las políticas del bucket (carpeta = `auth.uid()`,
 * migración 0008) siguen siendo las que autorizan.
 */
const ACCEPTED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

export function ProfileIdentityCard({
  initialDisplayName,
  initialAvatarUrl,
}: {
  initialDisplayName: string | null;
  initialAvatarUrl: string | null;
}) {
  const [displayName, setDisplayName] = useState(initialDisplayName ?? '');
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [savingName, setSavingName] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleNameSubmit(e: FormEvent) {
    e.preventDefault();
    setSavingName(true);
    setError(null);
    setNameSaved(false);
    const result = await updateDisplayNameAction({ displayName });
    setSavingName(false);
    if (result.ok) {
      setNameSaved(true);
    } else {
      setError(result.message);
    }
  }

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setUploadingAvatar(true);
    setError(null);
    try {
      // Se comprueba también en el cliente para dar el error al instante; la
      // comprobación que MANDA es la del Server Action.
      if (!ACCEPTED_AVATAR_TYPES.includes(file.type)) {
        setError('Usa una imagen JPG, PNG o WebP.');
        return;
      }
      if (file.size > MAX_AVATAR_BYTES) {
        setError('La imagen debe pesar menos de 2 MB.');
        return;
      }

      const formData = new FormData();
      formData.append('file', file);

      const result = await uploadAvatarAction(formData);
      if (result.ok) {
        setAvatarUrl(result.data.avatarUrl);
      } else {
        setError(result.message);
      }
    } catch {
      setError('No pudimos subir tu foto. Intenta de nuevo.');
    } finally {
      setUploadingAvatar(false);
    }
  }

  return (
    <Card className="space-y-4 p-5">
      <p className="text-sm font-semibold text-text-primary">Tu perfil</p>

      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-tint text-xl font-bold text-brand">
          {avatarUrl ? (
            <Image src={avatarUrl} alt="" width={64} height={64} className="h-full w-full object-cover" />
          ) : (
            (displayName || '?').trim().charAt(0).toUpperCase()
          )}
        </div>
        <label className="cursor-pointer text-sm font-semibold text-brand-soft hover:underline">
          {uploadingAvatar ? 'Subiendo…' : 'Cambiar foto'}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleFileChange}
            disabled={uploadingAvatar}
          />
        </label>
      </div>

      <form onSubmit={handleNameSubmit} className="flex items-end gap-2">
        <div className="flex-1">
          <TextField
            name="displayName"
            label="Nombre visible"
            value={displayName}
            onChange={(e) => {
              setDisplayName(e.target.value);
              setNameSaved(false);
            }}
            maxLength={60}
          />
        </div>
        <Button type="submit" variant="secondary" disabled={savingName}>
          {savingName ? 'Guardando…' : 'Guardar'}
        </Button>
      </form>
      {nameSaved && <p role="status" className="text-sm text-success">Guardado ✓</p>}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </Card>
  );
}
