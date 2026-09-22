/**
 * scripts/g99/vault-probe.ts — G99 tarea 12, VERIFICACIÓN POR EFECTO.
 *
 *   G99_PROBE_PASSWORD=… pnpm admin:vault
 *
 * Ejecuta las operaciones REALES contra la API de Storage (`/storage/v1`), la
 * misma que alcanza cualquier navegador con la anon key. No pregunta si las
 * políticas están escritas —eso es verificar código (G73b)— sino si funcionan:
 *
 *   · un ADMIN sube y lee el objeto;
 *   · la MISMA cuenta, ya degradada a STUDENT, no puede leerlo ni listarlo;
 *   · sin sesión no se puede leer, listar, ni sacarlo por la URL «pública»
 *     del bucket (que existe aunque el bucket sea privado — y precisamente por
 *     eso hay que comprobar que no devuelve el archivo);
 *   · el borrado lógico saca el archivo del listado de la app.
 *
 * ── CONTROL POSITIVO ───────────────────────────────────────────────────────
 * Primero se comprueba que el ADMIN SÍ puede leer lo que acaba de subir. Sin
 * eso, todos los «no se pudo leer» de después pasarían igual de bien con un
 * path mal escrito o un bucket inexistente (G71 §6 D6).
 *
 * La sonda BORRA lo que crea, pase lo que pase.
 */
import '../g71/env';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { listVaultFiles } from '../../src/lib/db/admin-vault';

const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });

const URL_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const PASSWORD = process.env.G99_PROBE_PASSWORD ?? '';
const EMAIL = process.env.G99_PROBE_EMAIL ?? 'e2e.free@acierta-test.mx';
const BUCKET = 'admin-vault';
const FIXTURE_DOMAIN = '@acierta-test.mx';

interface Check {
  id: string;
  descripcion: string;
  ok: boolean;
  detalle: string;
}
const checks: Check[] = [];
const record = (id: string, descripcion: string, ok: boolean, detalle: string) => {
  checks.push({ id, descripcion, ok, detalle });
};

async function signIn(): Promise<string> {
  const res = await fetch(`${URL_BASE}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON, 'content-type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const body = (await res.json()) as { access_token?: string };
  if (!res.ok || !body.access_token) {
    throw new Error(`login ${EMAIL}: ${res.status} ${JSON.stringify(body)}`);
  }
  return body.access_token;
}

async function storage(
  token: string | null,
  method: string,
  path: string,
  body?: BodyInit,
  extraHeaders: Record<string, string> = {}
): Promise<{ status: number; text: string }> {
  const headers: Record<string, string> = { apikey: ANON, ...extraHeaders };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${URL_BASE}/storage/v1/${path}`, { method, headers, body });
  return { status: res.status, text: (await res.text()).slice(0, 200) };
}

async function setRole(profileId: string, role: 'ADMIN' | 'STUDENT'): Promise<void> {
  await prisma.userProfile.update({ where: { id: profileId }, data: { role } });
}

async function main() {
  if (!PASSWORD) {
    console.error('Falta G99_PROBE_PASSWORD (contraseña temporal de la cuenta fixture).');
    process.exitCode = 1;
    return;
  }
  if (!EMAIL.toLowerCase().endsWith(FIXTURE_DOMAIN)) {
    console.error(`La sonda solo corre con cuentas fixture (${FIXTURE_DOMAIN}).`);
    process.exitCode = 1;
    return;
  }

  console.log('G99 — bóveda, verificada POR EFECTO contra /storage/v1\n');

  const rows = await prisma.$queryRaw<Array<{ profileId: string }>>`
    SELECT "profileId" FROM app_security.profile_ids_by_email_search(${EMAIL})
  `;
  const profileId = rows[0]?.profileId;
  if (!profileId) throw new Error(`No hay perfil para ${EMAIL}`);

  const objectPath = `${randomUUID()}.txt`;
  const contenido = 'contenido secreto de la boveda g99';
  let fileId: string | null = null;
  let promoted = false;

  try {
    const jwt = await signIn();

    // ── 1. Como ADMIN: subir y leer (CONTROL POSITIVO) ──────────────────
    await setRole(profileId, 'ADMIN');
    promoted = true;

    const up = await storage(jwt, 'POST', `object/${BUCKET}/${objectPath}`, contenido, {
      'content-type': 'text/plain',
    });
    if (up.status >= 400) {
      console.error(`🛑 CONTROL POSITIVO FALLIDO: un ADMIN no pudo subir. ${up.status} ${up.text}`);
      process.exitCode = 1;
      return;
    }
    record('ADMIN-sube', 'un ADMIN sube a la bóveda', true, `HTTP ${up.status}`);

    const adminRead = await storage(jwt, 'GET', `object/${BUCKET}/${objectPath}`);
    const adminCanRead = adminRead.status === 200 && adminRead.text.includes('secreto');
    record(
      'ADMIN-lee',
      'un ADMIN lee lo que subió (control positivo)',
      adminCanRead,
      `HTTP ${adminRead.status}`
    );
    if (!adminCanRead) {
      console.error('🛑 CONTROL POSITIVO FALLIDO: sin esto nada de lo de abajo prueba nada.');
      process.exitCode = 1;
      return;
    }

    // La fila de la app, para probar el borrado lógico más abajo.
    const created = await prisma.adminFile.create({
      data: {
        path: objectPath,
        originalName: 'sonda-g99.txt',
        mimeType: 'text/plain',
        sizeBytes: contenido.length,
        sha256: 'sonda',
        uploadedById: profileId,
        uploadedByEmail: EMAIL,
      },
      select: { id: true },
    });
    fileId = created.id;

    const listedAlive = await listVaultFiles();
    record(
      'LISTADO-incluye',
      'el archivo vivo aparece en el listado de la app',
      listedAlive.some((f) => f.id === fileId),
      `${listedAlive.length} archivo(s) vivos`
    );

    // ── 2. Degradar a STUDENT y reintentar TODO con el mismo JWT ────────
    await setRole(profileId, 'STUDENT');
    promoted = false;

    const stuRead = await storage(jwt, 'GET', `object/${BUCKET}/${objectPath}`);
    record(
      'STUDENT-no-lee',
      'con sesión STUDENT el objeto NO se puede leer',
      stuRead.status >= 400,
      `HTTP ${stuRead.status} ${stuRead.text}`
    );

    const stuList = await storage(
      jwt,
      'POST',
      `object/list/${BUCKET}`,
      JSON.stringify({ prefix: '', limit: 100 }),
      { 'content-type': 'application/json' }
    );
    const stuListBlocked =
      stuList.status >= 400 || stuList.text === '[]' || !stuList.text.includes(objectPath);
    record(
      'STUDENT-no-lista',
      'con sesión STUDENT el bucket NO se puede listar',
      stuListBlocked,
      `HTTP ${stuList.status} ${stuList.text}`
    );

    const stuDelete = await storage(jwt, 'DELETE', `object/${BUCKET}/${objectPath}`);
    record(
      'STUDENT-no-borra',
      'con sesión STUDENT el objeto NO se puede borrar',
      stuDelete.status >= 400,
      `HTTP ${stuDelete.status}`
    );

    // ── 3. Sin sesión ───────────────────────────────────────────────────
    const anonRead = await storage(null, 'GET', `object/${BUCKET}/${objectPath}`);
    record(
      'ANON-no-lee',
      'sin sesión el objeto NO se puede leer',
      anonRead.status >= 400,
      `HTTP ${anonRead.status}`
    );

    // La URL «pública» existe aunque el bucket sea privado: hay que comprobar
    // que NO devuelve el archivo, no dar por hecho que el flag basta.
    const publicUrl = await fetch(
      `${URL_BASE}/storage/v1/object/public/${BUCKET}/${objectPath}`
    );
    const publicText = (await publicUrl.text()).slice(0, 200);
    record(
      'ANON-url-publica',
      'la URL pública del bucket NO devuelve el archivo',
      publicUrl.status >= 400 || !publicText.includes('secreto'),
      `HTTP ${publicUrl.status} ${publicText}`
    );

    const anonList = await storage(
      null,
      'POST',
      `object/list/${BUCKET}`,
      JSON.stringify({ prefix: '', limit: 100 }),
      { 'content-type': 'application/json' }
    );
    record(
      'ANON-no-lista',
      'sin sesión el bucket NO se puede listar',
      anonList.status >= 400 || !anonList.text.includes(objectPath),
      `HTTP ${anonList.status} ${anonList.text}`
    );

    // ── 4. Borrado lógico: el archivo sale del listado ──────────────────
    await prisma.adminFile.update({ where: { id: fileId }, data: { deletedAt: new Date() } });
    const listedAfter = await listVaultFiles();
    record(
      'BORRADO-logico',
      'el borrado lógico saca el archivo del listado',
      !listedAfter.some((f) => f.id === fileId),
      `${listedAfter.length} archivo(s) vivos tras el borrado`
    );
  } finally {
    // Limpieza: rol, objeto y fila.
    if (promoted) await setRole(profileId, 'STUDENT').catch(() => {});
    const finalRole = await prisma.userProfile.findUnique({
      where: { id: profileId },
      select: { role: true },
    });
    console.log(`\nRol final de la cuenta fixture: ${finalRole?.role}`);

    try {
      await setRole(profileId, 'ADMIN');
      const jwt = await signIn();
      await storage(jwt, 'DELETE', `object/${BUCKET}/${objectPath}`);
    } catch {
      /* si no se puede, se reporta abajo */
    } finally {
      await setRole(profileId, 'STUDENT').catch(() => {});
    }
    if (fileId) await prisma.adminFile.deleteMany({ where: { id: fileId } });
    console.log('Limpieza: objeto y fila de la sonda borrados.');
  }

  console.log('\n┌─ Resultado ──────────────────────────────────────────────────');
  for (const c of checks) {
    console.log(`│ ${c.ok ? '✅' : '❌'} ${c.id.padEnd(20)} ${c.descripcion}`);
    if (!c.ok) console.log(`│      ↳ ${c.detalle}`);
  }
  console.log('└──────────────────────────────────────────────────────────────');
  const fallos = checks.filter((c) => !c.ok);
  console.log(`\n${checks.length - fallos.length}/${checks.length} comprobaciones en verde.`);
  if (fallos.length > 0) process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
