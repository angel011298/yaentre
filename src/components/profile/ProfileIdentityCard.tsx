'use client';

import { useState, type ChangeEvent, type FormEvent } from 'react';
import { updateAvatarAction, updateDisplayNameAction } from '@/app/actions/profile';
import { createSupabaseBrowserClient } from '@/lib/auth/supabase-browser';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { TextField } from '@/components/ui/TextField';

/**
 * Nombre visible + foto de perfil (F17 tarea 2). La foto sube DIRECTO desde
 * el navegador al bucket "avatars" de Supabase Storage (RLS: cada quien solo
 * escribe en su propia carpeta, `auth.uid()`, F17 migración 0008) — el
 * servidor solo valida y persiste la URL resultante, nunca ve el archivo.
 */
export function ProfileIdentityCard({
  authUserId,
  initialDisplayName,
  initialAvatarUrl,
}: {
  authUserId: string;
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
      const supabase = createSupabaseBrowserClient();
      const ext = file.name.split('.').pop() ?? 'jpg';
      const path = `${authUserId}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, cacheControl: '3600' });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      // Cache-bust: el nombre de archivo no cambia entre subidas (siempre
      // "avatar.<ext>"), así que sin esto el navegador seguiría mostrando la
      // foto vieja desde su propia caché.
      const publicUrl = `${data.publicUrl}?v=${Date.now()}`;

      const result = await updateAvatarAction({ avatarUrl: publicUrl });
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
            // eslint-disable-next-line @next/next/no-img-element -- URL dinámica de Storage, no un asset del build
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            (displayName || '?').trim().charAt(0).toUpperCase()
          )}
        </div>
        <label className="cursor-pointer text-sm font-semibold text-brand hover:underline">
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
      {nameSaved && <p className="text-sm text-success">Guardado ✓</p>}
      {error && <p className="text-sm text-danger">{error}</p>}
    </Card>
  );
}
