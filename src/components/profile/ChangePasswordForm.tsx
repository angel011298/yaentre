'use client';

import { useState, type FormEvent } from 'react';
import { changePasswordAction } from '@/app/actions/profile';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { TextField } from '@/components/ui/TextField';

/**
 * G65: el formulario pide ahora la contraseña ACTUAL además de la nueva. Sin
 * ese campo, cualquiera que se sentara frente a una sesión abierta podía
 * quedarse con la cuenta para siempre (ver `changePasswordAction`). Es un
 * campo más y sale del paso más común del ataque en este público: la laptop
 * compartida de la casa o de la prepa.
 */
export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const listo = currentPassword.length > 0 && password.length >= 8;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setSuccess(false);
    const result = await changePasswordAction({ currentPassword, password });
    setPending(false);
    if (result.ok) {
      setSuccess(true);
      setCurrentPassword('');
      setPassword('');
    } else {
      setError(result.message);
    }
  }

  return (
    <Card className="p-5">
      <p className="text-sm font-semibold text-text-primary">Cambiar contraseña</p>
      <form onSubmit={handleSubmit} className="mt-3 space-y-3">
        <TextField
          name="currentPassword"
          type="password"
          label="Contraseña actual"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          hint="La confirmamos antes de cambiarla, para que nadie más pueda hacerlo desde tu sesión."
        />
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <TextField
              name="password"
              type="password"
              label="Nueva contraseña"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              hint="Mínimo 8 caracteres."
            />
          </div>
          <Button type="submit" variant="secondary" disabled={pending || !listo}>
            {pending ? 'Guardando…' : 'Cambiar'}
          </Button>
        </div>
      </form>
      {success && <p role="status" className="mt-2 text-sm text-success">Tu contraseña se actualizó ✓</p>}
      {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
    </Card>
  );
}
