'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  cancelPlanAction,
  changeRoleAction,
  forcePasswordResetAction,
  grantCompAction,
  revokeSessionsAction,
} from '@/app/actions/admin-users';

/**
 * G99 — acciones de administración sobre una cuenta.
 *
 * ⚠️ Esta interfaz NO es una capa de seguridad. Esconder un botón no cierra
 * nada: una Server Action se invoca con un `fetch` a su ruta (G98 lo verificó
 * en producción). `isMaster` sirve para no OFRECER lo que el servidor va a
 * rechazar; la autorización real vive en la primera línea de cada acción.
 *
 * Todas exigen MOTIVO: es lo único que hace útil la bitácora meses después.
 */

type ActionName = 'comp' | 'cancel' | 'reset' | 'sessions' | 'role';

interface Props {
  userProfileId: string;
  currentRole: string;
  isMaster: boolean;
  isSelf: boolean;
  activeSubscriptions: Array<{ id: string; label: string }>;
}

export function UserAdminActions({
  userProfileId,
  currentRole,
  isMaster,
  isSelf,
  activeSubscriptions,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [running, setRunning] = useState<ActionName | null>(null);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  const [reason, setReason] = useState('');
  const [plan, setPlan] = useState<'MONTHLY' | 'SEASON_PASS' | 'PREMIUM'>('PREMIUM');
  const [season, setSeason] = useState<'EARLY_BIRD' | 'HIGH_SEASON' | 'LAST_MINUTE'>('HIGH_SEASON');
  const [subscriptionId, setSubscriptionId] = useState(activeSubscriptions[0]?.id ?? '');
  const [role, setRole] = useState(currentRole);

  function run(name: ActionName, fn: () => Promise<{ ok: boolean; message?: string }>) {
    setMessage(null);
    setRunning(name);
    startTransition(async () => {
      const result = await fn();
      setRunning(null);
      if (!result.ok) {
        setMessage({ tone: 'error', text: result.message ?? 'No se pudo completar.' });
        return;
      }
      setMessage({ tone: 'ok', text: 'Listo. Quedó registrado en la bitácora.' });
      setReason('');
      router.refresh();
    });
  }

  const disabled = isPending || reason.trim().length < 8;

  if (!isMaster) {
    return (
      <Card className="p-4">
        <h2 className="font-display text-lg font-semibold">Acciones</h2>
        <p className="mt-2 text-sm text-text-secondary">
          Las acciones sobre esta cuenta (cortesías, bajas, restablecimiento, cierre de sesiones
          y cambio de rol) están reservadas al administrador maestro.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <h2 className="font-display text-lg font-semibold">Acciones</h2>
      <p className="mt-1 text-sm text-text-secondary">
        Todas quedan registradas en la bitácora con tu nombre, la fecha y el motivo.
      </p>

      <div className="mt-4 space-y-1.5">
        <label htmlFor="admin-reason" className="text-sm font-medium text-text-secondary">
          Motivo (obligatorio)
        </label>
        <input
          id="admin-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Por qué haces este cambio"
          className="min-h-touch w-full rounded-md border border-border-subtle bg-input px-3 text-text-primary placeholder:text-text-muted"
        />
        <p className="text-xs text-text-muted">Mínimo 8 caracteres.</p>
      </div>

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

      {/* ── Cortesía ─────────────────────────────────────────────────────── */}
      <section className="mt-6 border-t border-border-subtle pt-4">
        <h3 className="text-sm font-semibold text-text-primary">Otorgar plan de cortesía</h3>
        <p className="mt-1 text-xs text-text-muted">
          Queda idéntico a un plan comprado (misma vigencia, misma insignia) pero no genera pago
          y no descuenta licencias Early Bird.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <select
            aria-label="Plan"
            value={plan}
            onChange={(e) => setPlan(e.target.value as typeof plan)}
            className="min-h-touch rounded-md border border-border-subtle bg-input px-3 text-sm text-text-primary"
          >
            <option value="PREMIUM">PREMIUM</option>
            <option value="SEASON_PASS">SEASON_PASS</option>
            <option value="MONTHLY">MONTHLY</option>
          </select>
          <select
            aria-label="Temporada"
            value={season}
            onChange={(e) => setSeason(e.target.value as typeof season)}
            className="min-h-touch rounded-md border border-border-subtle bg-input px-3 text-sm text-text-primary"
          >
            <option value="HIGH_SEASON">HIGH_SEASON</option>
            <option value="EARLY_BIRD">EARLY_BIRD</option>
            <option value="LAST_MINUTE">LAST_MINUTE</option>
          </select>
          <Button
            type="button"
            disabled={disabled}
            onClick={() =>
              run('comp', () => grantCompAction({ userProfileId, reason, plan, season }))
            }
          >
            {running === 'comp' ? 'Otorgando…' : 'Otorgar cortesía'}
          </Button>
        </div>
      </section>

      {/* ── Baja de plan ─────────────────────────────────────────────────── */}
      <section className="mt-6 border-t border-border-subtle pt-4">
        <h3 className="text-sm font-semibold text-text-primary">Dar de baja un plan</h3>
        {activeSubscriptions.length === 0 ? (
          <p className="mt-1 text-xs text-text-muted">Esta cuenta no tiene planes vigentes.</p>
        ) : (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <select
              aria-label="Plan a dar de baja"
              value={subscriptionId}
              onChange={(e) => setSubscriptionId(e.target.value)}
              className="min-h-touch rounded-md border border-border-subtle bg-input px-3 text-sm text-text-primary"
            >
              {activeSubscriptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            <Button
              type="button"
              variant="danger"
              disabled={disabled || !subscriptionId}
              onClick={() =>
                run('cancel', () => cancelPlanAction({ userProfileId, reason, subscriptionId }))
              }
            >
              {running === 'cancel' ? 'Dando de baja…' : 'Dar de baja'}
            </Button>
          </div>
        )}
      </section>

      {/* ── Acceso ───────────────────────────────────────────────────────── */}
      <section className="mt-6 border-t border-border-subtle pt-4">
        <h3 className="text-sm font-semibold text-text-primary">Acceso</h3>
        <p className="mt-1 text-xs text-text-muted">
          «Forzar restablecimiento» envía a esa persona el mismo correo de recuperación que
          obtendría desde «olvidé mi contraseña»; nadie ve la contraseña, ni antes ni después.
          «Cerrar sesiones» invalida sus tokens de renovación de inmediato; una sesión ya abierta
          puede seguir viva hasta 1 hora, que es lo que tarda en expirar su token de acceso.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            disabled={disabled}
            onClick={() => run('reset', () => forcePasswordResetAction({ userProfileId, reason }))}
          >
            {running === 'reset' ? 'Enviando…' : 'Forzar restablecimiento'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={disabled}
            onClick={() => run('sessions', () => revokeSessionsAction({ userProfileId, reason }))}
          >
            {running === 'sessions' ? 'Cerrando…' : 'Cerrar todas las sesiones'}
          </Button>
        </div>
      </section>

      {/* ── Rol ──────────────────────────────────────────────────────────── */}
      <section className="mt-6 border-t border-border-subtle pt-4">
        <h3 className="text-sm font-semibold text-text-primary">Rol</h3>
        {isSelf ? (
          <p className="mt-1 text-xs text-text-muted">
            No puedes cambiar tu propio rol. Es la salvaguarda que impide que el producto se quede
            sin administrador por un clic.
          </p>
        ) : (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <select
              aria-label="Rol"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="min-h-touch rounded-md border border-border-subtle bg-input px-3 text-sm text-text-primary"
            >
              <option value="STUDENT">STUDENT</option>
              <option value="PARENT">PARENT</option>
              <option value="ADMIN">ADMIN</option>
            </select>
            <Button
              type="button"
              variant="danger"
              disabled={disabled || role === currentRole}
              onClick={() =>
                run('role', () =>
                  changeRoleAction({ userProfileId, reason, role: role as 'STUDENT' })
                )
              }
            >
              {running === 'role' ? 'Cambiando…' : 'Cambiar rol'}
            </Button>
          </div>
        )}
      </section>
    </Card>
  );
}
