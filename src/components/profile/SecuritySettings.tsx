'use client';

import Image from 'next/image';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  changeEmailAction,
  confirmTotpEnrollmentAction,
  disableTotpAction,
  startTotpEnrollmentAction,
  unlinkGoogleAction,
} from '@/app/actions/security';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';

/**
 * G100 — cuenta y seguridad: correo, verificación en dos pasos (TOTP) y
 * Google. Sin `<form onSubmit>` (G99/G100): todo es botón `type="button"`,
 * así que un clic antes de hidratar no hace nada en vez de mandar datos por
 * la URL. Vincular Google y cerrar sesiones sí son `<form action>` de Server
 * Action (POST real), y viven en la página.
 */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2 border-t border-border-subtle pt-4 first:border-t-0 first:pt-0">
      <p className="text-sm font-semibold text-text-primary">{title}</p>
      {children}
    </div>
  );
}

function EmailChange({ email, hasPassword }: { email: string; hasPassword: boolean }) {
  const [open, setOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function submit() {
    setPending(true);
    setError(null);
    const r = await changeEmailAction({ newEmail, currentPassword: hasPassword ? password : undefined });
    setPending(false);
    if (r.ok) {
      setSentTo(r.data.pendingEmail);
      setOpen(false);
      setPassword('');
    } else setError(r.message);
  }

  return (
    <Section title="Correo">
      <p className="text-sm text-text-secondary">{email}</p>
      {sentTo && (
        <p role="status" className="rounded-md bg-info/10 px-3 py-2 text-sm text-info">
          Te enviamos un enlace a <strong>{sentTo}</strong> y otro a tu correo actual. El cambio se
          aplica cuando confirmes los dos.
        </p>
      )}
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="min-h-touch text-sm font-semibold text-brand-soft hover:underline"
        >
          Cambiar correo
        </button>
      ) : (
        <div className="space-y-3">
          <TextField
            name="newEmail"
            type="email"
            label="Correo nuevo"
            autoComplete="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
          />
          {hasPassword && (
            <TextField
              name="emailChangePassword"
              type="password"
              label="Contraseña actual"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={pending || newEmail.length < 5 || (hasPassword && password.length === 0)}
              onClick={() => void submit()}
            >
              {pending ? 'Enviando…' : 'Enviar enlace'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </Section>
  );
}

function TwoFactor({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [enrollment, setEnrollment] = useState<{ factorId: string; qrCode: string; secret: string } | null>(null);
  const [code, setCode] = useState('');
  const [disabling, setDisabling] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function begin() {
    setPending(true);
    setError(null);
    const r = await startTotpEnrollmentAction();
    setPending(false);
    if (r.ok) setEnrollment(r.data);
    else setError(r.message);
  }

  async function confirm() {
    if (!enrollment) return;
    setPending(true);
    setError(null);
    const r = await confirmTotpEnrollmentAction({ factorId: enrollment.factorId, code });
    setPending(false);
    if (r.ok) {
      setEnrollment(null);
      setCode('');
      router.refresh();
    } else setError(r.message);
  }

  async function disable() {
    setPending(true);
    setError(null);
    const r = await disableTotpAction({ code });
    setPending(false);
    if (r.ok) {
      setDisabling(false);
      setCode('');
      router.refresh();
    } else setError(r.message);
  }

  const codeField = (
    <TextField
      name="totpCode"
      label="Código de 6 dígitos"
      inputMode="numeric"
      autoComplete="one-time-code"
      maxLength={7}
      value={code}
      onChange={(e) => setCode(e.target.value)}
    />
  );

  return (
    <Section title="Verificación en dos pasos">
      <p className="text-sm text-text-secondary">
        {enabled ? (
          <>
            <span className="font-semibold text-success">✓ Activada.</span> Al iniciar sesión te pedimos
            un código de tu app de autenticación.
          </>
        ) : (
          'Opcional. Además de tu contraseña, te pediremos un código de una app como Google Authenticator, Microsoft Authenticator o 1Password.'
        )}
      </p>

      {!enabled && !enrollment && (
        <Button type="button" variant="secondary" disabled={pending} onClick={() => void begin()}>
          {pending ? 'Preparando…' : 'Activar'}
        </Button>
      )}

      {!enabled && enrollment && (
        <div className="space-y-3 rounded-md border border-border-subtle p-3">
          <p className="text-sm text-text-primary">1. Escanea este código con tu app de autenticación:</p>
          <div className="w-fit rounded-md bg-white p-2">
            {/* data: URI SVG generado por Supabase Auth — no es un recurso remoto. */}
            <Image src={enrollment.qrCode} alt="Código QR para tu app de autenticación" width={176} height={176} unoptimized />
          </div>
          <p className="text-xs text-text-muted">
            ¿No puedes escanear? Escribe esta clave en la app:{' '}
            <code className="break-all font-mono text-text-secondary">{enrollment.secret}</code>
          </p>
          <p className="text-sm text-text-primary">2. Escribe el código que aparece:</p>
          {codeField}
          <div className="flex gap-2">
            <Button type="button" disabled={pending || code.replace(/\s/g, '').length !== 6} onClick={() => void confirm()}>
              {pending ? 'Verificando…' : 'Confirmar y activar'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setEnrollment(null)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {enabled && !disabling && (
        <button
          type="button"
          onClick={() => setDisabling(true)}
          className="min-h-touch text-sm font-semibold text-danger hover:underline"
        >
          Desactivar
        </button>
      )}

      {enabled && disabling && (
        <div className="space-y-3 rounded-md border border-border-subtle p-3">
          <p className="text-sm text-text-primary">Para desactivarla, confirma con un código vigente:</p>
          {codeField}
          <div className="flex gap-2">
            <Button type="button" variant="secondary" disabled={pending} onClick={() => void disable()}>
              {pending ? 'Desactivando…' : 'Desactivar'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setDisabling(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </Section>
  );
}

function GoogleUnlink() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function unlink() {
    setPending(true);
    setError(null);
    const r = await unlinkGoogleAction();
    setPending(false);
    if (r.ok) router.refresh();
    else setError(r.message);
  }
  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() => void unlink()}
        className="min-h-touch text-sm font-semibold text-text-secondary hover:underline disabled:opacity-50"
      >
        {pending ? 'Desvinculando…' : 'Desvincular'}
      </button>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </>
  );
}

export function SecuritySettings({
  email,
  hasPassword,
  totpEnabled,
  googleEnabled,
  googleLinked,
  linkGoogleSlot,
}: {
  email: string;
  hasPassword: boolean;
  totpEnabled: boolean;
  googleEnabled: boolean;
  googleLinked: boolean;
  /** `<form action={linkGoogleAction}>` renderizado por el Server Component. */
  linkGoogleSlot: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <EmailChange email={email} hasPassword={hasPassword} />
      <TwoFactor enabled={totpEnabled} />
      {googleEnabled && (
        <Section title="Google">
          <p className="text-sm text-text-secondary">
            {googleLinked
              ? '✓ Vinculado. Puedes entrar con «Continuar con Google».'
              : 'Vincúlalo para entrar con un toque, sin escribir tu contraseña.'}
          </p>
          {googleLinked ? <GoogleUnlink /> : linkGoogleSlot}
        </Section>
      )}
    </div>
  );
}
