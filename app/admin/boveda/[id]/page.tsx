import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { getVaultFile } from '@/lib/db/admin-vault';
import { formatBytes, parseCsv, previewKindFor, VAULT_BUCKET } from '@/lib/admin/vault';
import { requireRole } from '@/lib/auth/guards';

export const metadata = { title: 'Ver archivo' };
export const dynamic = 'force-dynamic';

/**
 * G99 — visor de un archivo de la bóveda. Sin dependencias nuevas.
 *
 * 🔒 REGLA DE SEGURIDAD DE ESTA PANTALLA: el texto y el Markdown se pintan
 * PREFORMATEADOS, NUNCA interpretados como HTML. Un `.md` o un `.txt` de la
 * bóveda es contenido arbitrario; pasarlo por un renderizador de Markdown o
 * por `dangerouslySetInnerHTML` abriría una inyección dentro de la sesión del
 * administrador, que es la más privilegiada del producto. Se muestra tal cual.
 *
 * El CSV sí se pinta como tabla, pero celda por celda como TEXTO de React
 * (que escapa por construcción) — nunca concatenando HTML.
 */
export default async function VaultViewerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireRole('ADMIN');

  const file = await getVaultFile(id);
  if (!file) notFound();

  const kind = previewKindFor(file.mimeType);
  const src = `/api/admin/vault/${file.id}`;

  return (
    <div className="space-y-4">
      <div>
        <Link href="/admin/boveda" className="text-sm text-brand hover:underline">
          ← Bóveda
        </Link>
        <h1 className="mt-2 truncate font-display text-2xl font-bold">{file.originalName}</h1>
        <p className="text-sm text-text-secondary">
          {file.mimeType} · {formatBytes(file.sizeBytes)} ·{' '}
          {file.createdAt.toISOString().slice(0, 16).replace('T', ' ')}
        </p>
      </div>

      <p className="text-xs text-text-muted">
        Estás viendo el archivo dentro del navegador; no se guarda en el equipo.{' '}
        <a href={`${src}?download=1`} className="text-brand hover:underline">
          Descargarlo
        </a>{' '}
        sí deja una copia en el disco de esta computadora.
      </p>

      <Card className="overflow-hidden p-0">
        {kind === 'pdf' && (
          <object data={src} type="application/pdf" className="h-[75vh] w-full">
            <p className="p-6 text-sm text-text-secondary">
              Tu navegador no puede mostrar este PDF aquí.{' '}
              <a href={`${src}?download=1`} className="text-brand hover:underline">
                Descárgalo
              </a>{' '}
              para abrirlo.
            </p>
          </object>
        )}

        {kind === 'image' && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={file.originalName} className="mx-auto max-h-[75vh] w-auto" />
        )}

        {kind === 'csv' && <CsvTable src={src} />}

        {kind === 'text' && <TextBlock src={src} />}

        {kind === 'spreadsheet' && <SheetTables src={src} />}

        {kind === 'none' && (
          <p className="p-6 text-sm text-text-secondary">
            Este tipo de archivo no se puede ver dentro del navegador.{' '}
            <a href={`${src}?download=1`} className="text-brand hover:underline">
              Descárgalo
            </a>{' '}
            para abrirlo con la aplicación correspondiente.
          </p>
        )}
      </Card>
    </div>
  );
}

/**
 * El contenido se lee EN EL SERVIDOR (mismo proceso, misma sesión) y se pinta
 * como texto de React: sin `dangerouslySetInnerHTML` en ninguna rama.
 */
async function readVaultBytes(src: string): Promise<Buffer | null> {
  const { getVaultFile: get } = await import('@/lib/db/admin-vault');
  const id = src.split('/').pop()!;
  const file = await get(id);
  if (!file) return null;
  const { createSupabaseServerClient } = await import('@/lib/auth/supabase-server');
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.storage.from(VAULT_BUCKET).download(file.path);
  if (!data) return null;
  return Buffer.from(await data.arrayBuffer());
}

async function readVaultText(src: string, maxBytes: number): Promise<string> {
  const { getVaultFile: get } = await import('@/lib/db/admin-vault');
  const id = src.split('/').pop()!;
  const file = await get(id);
  if (!file) return '';
  const { createSupabaseServerClient } = await import('@/lib/auth/supabase-server');
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.storage.from(VAULT_BUCKET).download(file.path);
  if (!data) return '';
  const buf = Buffer.from(await data.arrayBuffer());
  return buf.subarray(0, maxBytes).toString('utf8');
}

const MAX_TEXT_BYTES = 512 * 1024;
const MAX_CSV_ROWS = 500;
const MAX_CSV_COLS = 40;

async function TextBlock({ src }: { src: string }) {
  const text = await readVaultText(src, MAX_TEXT_BYTES);
  return (
    <pre className="max-h-[75vh] overflow-auto whitespace-pre-wrap break-words p-4 font-mono text-xs text-text-primary">
      {text || '(archivo vacío)'}
    </pre>
  );
}

async function CsvTable({ src }: { src: string }) {
  const text = await readVaultText(src, MAX_TEXT_BYTES);
  const rows = parseCsv(text, MAX_CSV_ROWS + 1, MAX_CSV_COLS);
  if (rows.length === 0) {
    return <p className="p-6 text-sm text-text-secondary">(archivo vacío)</p>;
  }
  const [header, ...body] = rows;

  return (
    <div className="max-h-[75vh] overflow-auto">
      <table className="w-full border-collapse text-left text-xs">
        <thead className="sticky top-0 bg-elevated">
          <tr>
            {header.map((cell, i) => (
              <th key={i} className="border-b border-border-subtle px-3 py-2 font-semibold">
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((r, ri) => (
            <tr key={ri} className="odd:bg-surface">
              {header.map((_, ci) => (
                <td key={ci} className="border-b border-border-subtle px-3 py-1.5 align-top">
                  {r[ci] ?? ''}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {body.length >= MAX_CSV_ROWS && (
        <p className="p-3 text-xs text-text-muted">
          Mostrando las primeras {MAX_CSV_ROWS} filas. Descarga el archivo para verlo completo.
        </p>
      )}
    </div>
  );
}

/**
 * G99 parte B — previsualización de .xlsx renderizada EN EL SERVIDOR, sobre la
 * misma ruta `no-store`. El archivo nunca llega al navegador para esto: solo
 * la tabla ya resuelta, con las celdas escapadas por React y sin evaluar
 * ninguna fórmula.
 */
async function SheetTables({ src }: { src: string }) {
  const { readXlsxPreview } = await import('@/lib/admin/xlsx-preview');
  const bytes = await readVaultBytes(src);
  if (!bytes) {
    return <p className="p-6 text-sm text-text-secondary">(archivo vacío)</p>;
  }

  const preview = await readXlsxPreview(bytes);
  if (!preview.ok) {
    return (
      <div className="p-6 text-sm">
        <p className="font-medium text-danger">{preview.error}</p>
        <p className="mt-2 text-text-secondary">
          Puedes{' '}
          <a href={`${src}?download=1`} className="text-brand hover:underline">
            descargarlo
          </a>{' '}
          e intentar abrirlo con Excel o LibreOffice.
        </p>
      </div>
    );
  }

  return (
    <div className="max-h-[75vh] overflow-auto">
      {preview.totalSheets > preview.sheets.length && (
        <p className="p-3 text-xs text-text-muted">
          Mostrando {preview.sheets.length} de {preview.totalSheets} hojas.
        </p>
      )}
      {preview.sheets.map((sheet) => (
        <section key={sheet.name} className="border-b border-border-subtle last:border-b-0">
          <h2 className="sticky top-0 bg-elevated px-3 py-2 text-xs font-semibold text-text-primary">
            {sheet.name}
          </h2>
          {sheet.rows.length === 0 ? (
            <p className="px-3 py-2 text-xs text-text-muted">(hoja vacía)</p>
          ) : (
            <table className="w-full border-collapse text-left text-xs">
              <tbody>
                {sheet.rows.map((row, ri) => (
                  <tr key={ri} className="odd:bg-surface">
                    {row.map((cell, ci) => (
                      <td
                        key={ci}
                        className="border-b border-border-subtle px-3 py-1.5 align-top"
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {(sheet.truncatedRows || sheet.truncatedCols) && (
            <p className="px-3 py-2 text-xs text-text-muted">
              Vista recortada{sheet.truncatedRows ? ' en filas' : ''}
              {sheet.truncatedRows && sheet.truncatedCols ? ' y' : ''}
              {sheet.truncatedCols ? ' en columnas' : ''}. Descarga el archivo para verlo completo.
            </p>
          )}
        </section>
      ))}
    </div>
  );
}
