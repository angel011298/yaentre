'use client';

import { useState, type FormEvent } from 'react';
import { changePasswordAction } from '@/app/actions/profile';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { TextField } from '@/components/ui/TextField';

export function ChangePasswordForm() {
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setSuccess(false);
    const result = await changePasswordAction({ password });
    setPending(false);
    if (result.ok) {
      setSuccess(true);
      setPassword('');
    } else {
      setError(result.message);
    }
  }

  return (
    <Card className="p-5">
      <p className="text-sm font-semibold text-text-primary">Cambiar contraseña</p>
      <form onSubmit={handleSubmit} className="mt-3 flex items-end gap-2">
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
        <Button type="submit" variant="secondary" disabled={pending || password.length < 8}>
          {pending ? 'Guardando…' : 'Cambiar'}
        </Button>
      </form>
      {success && <p role="status" className="mt-2 text-sm text-success">Tu contraseña se actualizó ✓</p>}
      {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
    </Card>
  );
}
