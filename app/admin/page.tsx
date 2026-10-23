import Link from 'next/link';
import { SignOutButton } from '@/components/auth/SignOutButton';
import { Card } from '@/components/ui/Card';
import { getAdminContext } from '@/lib/admin/context';
import { currentSessionEndsAt } from '@/lib/auth/session-info';
import { SESSION_PERSISTENCE } from '@/lib/auth/session-policy';
import { Icon } from '@/components/ui/Icon';

export const metadata = { title: 'Panel de administración' };

/** Lo que SOLO el maestro puede hacer. El candado real está en cada acción
 *  (`requireMasterAdmin`); esta lista es para que el panel lo diga. */
const MASTER_POWERS = [
  'Otorgar planes de cortesía y darlos de baja',
  'Forzar el restablecimiento de contraseña de una cuenta',
  'Cerrar todas las sesiones de una cuenta',
  'Cambiar el rol de una cuenta',
  'Borrar archivos de la bóveda',
];

const SECTIONS: Array<{ href: string; label: string; desc: string; master?: string }> = [
  { href: '/admin/questions/queue', label: 'Revisión', desc: 'Reactivos pendientes de verificar.' },
  { href: '/admin/reports', label: 'Reportes', desc: 'Reactivos que los alumnos reportaron.' },
  { href: '/admin/coverage', label: 'Cobertura', desc: 'Qué áreas tienen contenido suficiente.' },
  {
    href: '/admin/usuarios',
    label: 'Usuarios',
    desc: 'Cuentas, planes y pagos.',
    master: 'Planes, restablecimientos, sesiones y roles',
  },
  { href: '/admin/bitacora', label: 'Bitácora', desc: 'Todo lo que se hizo desde este panel.' },
  {
    href: '/admin/boveda',
    label: 'Bóveda',
    desc: 'Archivos y notas privados del equipo.',
    master: 'Borrar archivos',
  },
];

const SESSION_END_FORMAT = new Intl.DateTimeFormat('es-MX', {
  timeZone: 'America/Mexico_City',
  dateStyle: 'medium',
  timeStyle: 'short',
});

/**
 * G100 — inicio del panel. Hasta G99 `/admin` redirigía a la cola de revisión
 * y nada en pantalla decía con qué nivel de acceso se había entrado. Aquí se
 * ve, en cualquier dispositivo: quién eres, qué te toca, y qué pasa con esta
 * sesión en el equipo donde la abriste.
 */
export default async function AdminHomePage() {
  const { isMaster } = await getAdminContext();
  const endsAt = await currentSessionEndsAt();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">
          {isMaster ? 'Panel del administrador maestro' : 'Panel de administración'}
        </h1>
        <p className="text-text-secondary">
          {isMaster
            ? 'Tienes acceso completo, incluidas las acciones que cambian cuentas o borran archivos.'
            : 'Tienes acceso de administrador. Las acciones que cambian cuentas o borran archivos son del administrador maestro.'}
        </p>
      </div>

      <Card className="p-4" data-testid="admin-access-card">
        <h2 className="font-display text-lg font-semibold">
          {isMaster ? 'Solo tú puedes' : 'Reservado al administrador maestro'}
        </h2>
        <ul className="mt-3 space-y-1 text-sm">
          {MASTER_POWERS.map((power) => (
            <li key={power} className="flex gap-2">
              <Icon
                name={isMaster ? 'check' : 'lock'}
                className={`mt-0.5 h-4 w-4 ${isMaster ? 'text-success' : 'text-text-muted'}`}
              />
              <span className={isMaster ? '' : 'text-text-secondary'}>{power}</span>
            </li>
          ))}
        </ul>
      </Card>

      <section aria-labelledby="secciones">
        <h2 id="secciones" className="mb-3 font-display text-lg font-semibold">
          Secciones
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {SECTIONS.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="block rounded-lg border border-border-subtle bg-surface p-4 transition-all hover:shadow-md"
            >
              <p className="font-semibold">{s.label}</p>
              <p className="text-sm text-text-secondary">{s.desc}</p>
              {s.master && (
                <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-text-muted">
                  <Icon name={isMaster ? 'star' : 'lock'} className="h-3.5 w-3.5" />
                  {s.master}: {isMaster ? 'disponible para ti' : 'solo administrador maestro'}
                </p>
              )}
            </Link>
          ))}
        </div>
      </section>

      <Card className="p-4" data-testid="admin-session-card">
        <h2 className="font-display text-lg font-semibold">Sesión en este dispositivo</h2>
        {SESSION_PERSISTENCE === 'ephemeral' ? (
          <div className="mt-2 space-y-2 text-sm text-text-secondary">
            <p>
              Esta sesión no se guarda en el dispositivo: se borra al cerrar el navegador
              {endsAt ? (
                <>
                  {' '}
                  y, como máximo, se cierra sola el{' '}
                  <strong className="text-text-primary">{SESSION_END_FORMAT.format(endsAt)}</strong>{' '}
                  (hora del centro de México)
                </>
              ) : null}
              .
            </p>
            <p>
              Al cerrar sesión se borra todo lo que YaEntre guardó en este navegador. Tus otros
              dispositivos no se cierran.
            </p>
          </div>
        ) : (
          <p className="mt-2 text-sm text-text-secondary">
            Esta sesión se recuerda en este dispositivo hasta que cierres sesión.
          </p>
        )}
        <div className="mt-3">
          <SignOutButton
            label="Cerrar sesión en este dispositivo"
            className="inline-flex min-h-touch items-center rounded-md bg-brand px-4 text-sm font-semibold text-on-brand hover:bg-brand-hover"
          />
        </div>
      </Card>
    </div>
  );
}
