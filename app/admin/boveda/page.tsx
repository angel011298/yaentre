import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { VaultUploadForm } from '@/components/admin/VaultUploadForm';
import { VaultDeleteButton } from '@/components/admin/VaultDeleteButton';
import { AdminNotes, type NoteItem } from '@/components/admin/AdminNotes';
import { listVaultFiles, vaultUsedBytes } from '@/lib/db/admin-vault';
import { listNotes } from '@/lib/db/admin-notes';
import { formatBytes, previewKindFor, VAULT_QUOTA_BYTES } from '@/lib/admin/vault';
import { isMasterAdminEmail } from '@/lib/admin/master';
import { requireRole } from '@/lib/auth/guards';

export const metadata = { title: 'Bóveda' };

/**
 * G99 — bóveda de archivos del administrador.
 *
 * 🔒 Requisito explícito del dueño: los archivos subidos se guardan HASTA que
 * el admin maestro los elimine. No hay caducidad, ni limpieza automática, ni
 * job que toque este bucket; el único camino de borrado es el botón de abajo,
 * que exige admin maestro y deja fila en la bitácora.
 */
export default async function AdminVaultPage() {
  const { authUser } = await requireRole('ADMIN');
  const isMaster = isMasterAdminEmail(authUser.email, process.env.MASTER_ADMIN_EMAILS);

  const [files, used, notes] = await Promise.all([listVaultFiles(), vaultUsedBytes(), listNotes()]);
  const pct = Math.min(100, (used / VAULT_QUOTA_BYTES) * 100);
  const noteItems: NoteItem[] = notes.map((n) => ({
    id: n.id,
    content: n.content,
    authorEmail: n.authorEmail,
    createdAtLabel: n.createdAt.toISOString().slice(0, 16).replace('T', ' '),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Bóveda</h1>
        <p className="text-text-secondary">
          Archivos privados del administrador. Se guardan aquí hasta que el administrador maestro
          los elimine: nada caduca ni se borra solo.
        </p>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-lg font-semibold">Espacio usado</h2>
          <p className="font-mono text-sm tabular-nums text-text-secondary">
            {formatBytes(used)} de {formatBytes(VAULT_QUOTA_BYTES)}
          </p>
        </div>
        <div
          className="mt-3 h-2 w-full overflow-hidden rounded-full bg-elevated"
          role="progressbar"
          aria-valuenow={Math.round(pct)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Espacio usado de la bóveda"
        >
          <div className="h-full rounded-full bg-brand" style={{ width: `${Math.max(pct, 1)}%` }} />
        </div>
        <p className="mt-2 text-xs text-text-muted">
          El límite de 1 GB y el máximo de 40 MB por archivo vienen del plan gratuito de Supabase.
        </p>
      </Card>

      {/* ── Notas: persistidas en Postgres, no en localStorage — así son las
          mismas sin importar en qué dispositivo o sesión se abra el panel. ── */}
      <Card className="p-4">
        <h2 className="font-display text-lg font-semibold">Notas</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Apuntes del equipo de administración. Se guardan en el servidor: abrir el panel en un
          equipo o una sesión distinta muestra las mismas notas.
        </p>
        <div className="mt-3">
          <AdminNotes notes={noteItems} />
        </div>
      </Card>

      <VaultUploadForm />

      {/* ── Honestidad sobre Ver vs Descargar (tarea 10) ─────────────────── */}
      <Card className="p-4">
        <h2 className="font-display text-lg font-semibold">Ver y descargar</h2>
        <p className="mt-2 text-sm text-text-secondary">
          <strong className="text-text-primary">Ver</strong> abre el archivo dentro del navegador y
          no lo guarda en el equipo.{' '}
          <strong className="text-text-primary">Descargar</strong> sí deja un archivo en el disco de
          la computadora que estés usando.
        </p>
      </Card>

      {files.length === 0 ? (
        <Card className="p-8 text-center text-text-secondary">
          La bóveda está vacía. Sube el primer archivo arriba.
        </Card>
      ) : (
        <div className="space-y-3">
          {files.map((f) => {
            const kind = previewKindFor(f.mimeType);
            const canView = kind !== 'none';
            return (
              <Card key={f.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-text-primary">{f.originalName}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-secondary">
                      <span className="rounded-md bg-elevated px-2 py-0.5">{f.mimeType}</span>
                      <span className="font-mono tabular-nums">{formatBytes(f.sizeBytes)}</span>
                      <span>{f.createdAt.toISOString().slice(0, 16).replace('T', ' ')}</span>
                      <span>por {f.uploadedByEmail ?? '(cuenta eliminada)'}</span>
                    </p>
                    <p className="mt-1 truncate font-mono text-[11px] text-text-muted">
                      sha256 {f.sha256.slice(0, 32)}…
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {canView ? (
                      <Link
                        href={`/admin/boveda/${f.id}`}
                        className="min-h-touch inline-flex items-center rounded-md border border-border-subtle bg-surface px-3 text-sm font-medium text-text-primary hover:bg-elevated"
                      >
                        Ver
                      </Link>
                    ) : (
                      <span
                        className="min-h-touch inline-flex cursor-not-allowed items-center rounded-md border border-border-subtle px-3 text-sm text-text-muted"
                        title="Este tipo de archivo solo se puede descargar"
                      >
                        Ver
                      </span>
                    )}
                    <a
                      href={`/api/admin/vault/${f.id}?download=1`}
                      className="min-h-touch inline-flex items-center rounded-md bg-brand px-3 text-sm font-medium text-white hover:bg-brand-hover"
                    >
                      Descargar
                    </a>
                    {isMaster && <VaultDeleteButton fileId={f.id} name={f.originalName} />}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {!isMaster && files.length > 0 && (
        <p className="text-xs text-text-muted">
          Borrar archivos está reservado al administrador maestro.
        </p>
      )}
    </div>
  );
}
