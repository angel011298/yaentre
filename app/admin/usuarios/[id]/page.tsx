import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { UserAdminActions } from '@/components/admin/UserAdminActions';
import { getUserDetail } from '@/lib/db/admin-users';
import { isMasterAdminEmail } from '@/lib/admin/master';
import { requireRole } from '@/lib/auth/guards';

export const metadata = { title: 'Cuenta' };

function fmt(d: Date | null | undefined): string {
  return d ? d.toISOString().slice(0, 16).replace('T', ' ') : '—';
}

/**
 * G99 — detalle de una cuenta y sus acciones de administración.
 *
 * La página vuelve a llamar a `requireRole('ADMIN')` aunque el layout ya lo
 * haga: el layout evita renderizar, pero quien decide qué botones se pintan es
 * esta página, y la decisión depende de si el actor es admin MAESTRO.
 *
 * ⚠️ Que un botón no se pinte NO es una protección — G98 lo dejó por escrito:
 * una Server Action se invoca con un `fetch` a su ruta sin pasar por ninguna
 * interfaz. `isMaster` aquí es solo para no ofrecer lo que se va a rechazar;
 * el candado real está en la primera línea de cada acción.
 *
 * 🔒 No se muestra ni se consulta material de contraseñas.
 */
export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { authUser, profile } = await requireRole('ADMIN');
  const detail = await getUserDetail(id);
  if (!detail) notFound();

  const isMaster = isMasterAdminEmail(authUser.email, process.env.MASTER_ADMIN_EMAILS);
  const isSelf = profile.id === detail.id;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/usuarios" className="text-sm text-brand hover:underline">
          ← Usuarios
        </Link>
        <h1 className="mt-2 font-display text-2xl font-bold">
          {detail.displayName || '(sin nombre)'}
        </h1>
        <p className="text-text-secondary">{detail.email ?? '(sin correo resoluble)'}</p>
      </div>

      <Card className="p-4">
        <h2 className="font-display text-lg font-semibold">Cuenta</h2>
        <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <div className="flex justify-between gap-4">
            <dt className="text-text-secondary">Rol</dt>
            <dd className="font-medium">{detail.role}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-text-secondary">Correo verificado</dt>
            <dd className="font-medium">{detail.emailVerified ? 'Sí' : 'No'}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-text-secondary">Alta</dt>
            <dd className="font-medium">{fmt(detail.createdAt)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-text-secondary">Último acceso</dt>
            <dd className="font-medium">{fmt(detail.lastSignInAt)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-text-secondary">Onboarding</dt>
            <dd className="font-medium">
              {detail.onboardingComplete ? 'Completo' : 'Pendiente'}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-text-secondary">Diagnóstico</dt>
            <dd className="font-medium">{detail.diagnosticDone ? 'Hecho' : 'Pendiente'}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-text-secondary">Examen objetivo</dt>
            <dd className="font-medium">{detail.targetExamLabel ?? '—'}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-text-secondary">Racha actual</dt>
            <dd className="font-medium">🔥 {detail.currentStreak}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-text-secondary">Última sesión de estudio</dt>
            <dd className="font-medium">{fmt(detail.lastSessionAt)}</dd>
          </div>
        </dl>
        <p className="mt-4 border-t border-border-subtle pt-3 text-xs text-text-muted">
          Las contraseñas no se muestran aquí ni existen en ninguna pantalla: Supabase Auth
          guarda un hash y el panel no lo lee. Para ayudar a alguien que perdió su acceso, usa
          «Forzar restablecimiento».
        </p>
      </Card>

      <Card className="p-4">
        <h2 className="font-display text-lg font-semibold">Planes y pagos</h2>
        {detail.subscriptions.length === 0 ? (
          <p className="mt-2 text-sm text-text-secondary">Sin suscripciones.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {detail.subscriptions.map((s) => (
              <li key={s.id} className="rounded-lg border border-border-subtle p-3 text-sm">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-medium">{s.plan}</span>
                  <span className="rounded-md bg-elevated px-2 py-0.5 text-xs">{s.status}</span>
                  <span className="text-xs text-text-secondary">{s.season}</span>
                  {s.isComp && (
                    <span className="rounded-md bg-info/15 px-2 py-0.5 text-xs font-medium text-info">
                      cortesía
                    </span>
                  )}
                  {s.hasGuarantee && <span className="text-xs text-text-secondary">con garantía</span>}
                </div>
                <p className="mt-1 text-xs text-text-muted">
                  inicio {fmt(s.startedAt)} · vence {fmt(s.expiresAt)}
                </p>
                {s.payments.length > 0 && (
                  <ul className="mt-2 space-y-1 text-xs text-text-secondary">
                    {s.payments.map((p) => (
                      <li key={p.id}>
                        {p.status} · {p.method} · ${(p.amountMxn / 100).toFixed(2)} MXN ·{' '}
                        {fmt(p.createdAt)}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <UserAdminActions
        userProfileId={detail.id}
        currentRole={detail.role}
        isMaster={isMaster}
        isSelf={isSelf}
        activeSubscriptions={detail.subscriptions
          .filter((s) => s.status !== 'CANCELED')
          .map((s) => ({ id: s.id, label: `${s.plan} · ${s.status}${s.isComp ? ' · cortesía' : ''}` }))}
      />
    </div>
  );
}
