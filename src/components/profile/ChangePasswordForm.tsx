'use client';

import { useState, type KeyboardEvent } from 'react';
import { changePasswordAction } from '@/app/actions/profile';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';

/**
 * G65: pide la contraseña ACTUAL además de la nueva — sin ese campo, quien se
 * sentara frente a una sesión abierta podía quedarse con la cuenta.
 *
 * G100: dos cambios.
 *  - SIN `<form>`. El anterior era un `<form onSubmit>` sin `method`: un clic
 *    antes de hidratar disparaba el GET nativo y las DOS contraseñas acababan
 *    en la URL (historial, registros del servidor, Referer). Misma carrera que
 *    obligó a reescribir la subida de la bóveda (CLAUDE.md, G99): contenedor
 *    sin semántica de formulario y botón `type="button"`. Enter sigue
 *    funcionando desde los campos.
 *  - Una cuenta que solo entra con Google no tiene contraseña actual: para
 *    ella el formulario es «Crear contraseña» y el servidor no la pide.
 */
export function ChangePasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const listo = (!hasPassword || currentPassword.length > 0) && password.length >= 8;

  async function submit() {
    if (!listo || pending) return;
    setPending(true);
    setError(null);
    setSuccess(false);
    const result = await changePasswordAction({ currentPassword: hasPassword ? currentPassword : undefined, password });
    setPending(false);
    if (result.ok) {
      setSuccess(true);
      setCurrentPassword('');
      setPassword('');
    } else {
      setError(result.message);
    }
  }

  function onEnter(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      void submit();
    }
  }

  return (
    <div>
      <p className="text-sm font-semibold text-text-primary">
        {hasPassword ? 'Cambiar contraseña' : 'Crear contraseña'}
      </p>
      {!hasPassword && (
        <p className="mt-0.5 text-xs text-text-muted">
          Hoy entras con Google. Con una contraseña también podrás entrar con tu correo.
        </p>
      )}
      <div className="mt-3 space-y-3">
        {hasPassword && (
          <TextField
            name="currentPassword"
            type="password"
            label="Contraseña actual"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            onKeyDown={onEnter}
            hint="La confirmamos antes de cambiarla, para que nadie más pueda hacerlo desde tu sesión."
          />
        )}
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <TextField
              name="password"
              type="password"
              label="Nueva contraseña"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={onEnter}
              hint="Mínimo 8 caracteres."
            />
          </div>
          <Button type="button" variant="secondary" disabled={pending || !listo} onClick={() => void submit()}>
            {pending ? 'Guardando…' : hasPassword ? 'Cambiar' : 'Crear'}
          </Button>
        </div>
      </div>
      {success && <p role="status" className="mt-2 text-sm text-success">Tu contraseña se guardó ✓</p>}
      {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
