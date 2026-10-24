import 'server-only';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { reportControlFailure } from '@/lib/observability/report';
import { COURSE_BUCKET, COURSE_LIMITS } from './media';

/**
 * G103 — Storage de los cursos, SOLO servidor.
 *
 * Todas las operaciones usan el cliente de Supabase con la SESIÓN de quien
 * pide (o anónimo): no hay service role en este camino. Las políticas de
 * `storage.objects` (migración 0021) deciden con las MISMAS reglas que la app
 * — dueño, inscripción vigente, preview de curso publicado — así que, aunque
 * la app se equivocara, Storage no firmaría una URL que no debe. La app
 * verifica primero para dar un mensaje claro.
 */

export async function createUploadUrl(path: string): Promise<{ signedUrl: string; token: string } | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.storage.from(COURSE_BUCKET).createSignedUploadUrl(path, { upsert: false });
  if (error || !data) {
    reportControlFailure('marketplace_storage', 'fail-closed', error ?? new Error('sin datos'), { operation: 'signed_upload' });
    return null;
  }
  return { signedUrl: data.signedUrl, token: data.token };
}

export async function signedReadUrl(path: string, ttlSecs: number = COURSE_LIMITS.PLAYBACK_URL_TTL_SECONDS): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.storage.from(COURSE_BUCKET).createSignedUrl(path, ttlSecs);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

/** Varias a la vez (portadas del catálogo). Las que la política niega quedan fuera. */
export async function signedReadUrls(paths: string[], ttlSecs: number = COURSE_LIMITS.PLAYBACK_URL_TTL_SECONDS): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const unique = [...new Set(paths.filter(Boolean))];
  if (unique.length === 0) return out;
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.storage.from(COURSE_BUCKET).createSignedUrls(unique, ttlSecs);
    for (const row of data ?? []) {
      if (row.path && row.signedUrl && !row.error) out.set(row.path, row.signedUrl);
    }
  } catch {
    /* sin portadas: la tarjeta muestra su respaldo */
  }
  return out;
}

/** Primeros bytes del objeto (para validar la firma real) y su tamaño. */
export async function inspectObject(path: string): Promise<{ head: Uint8Array; sizeBytes: number } | null> {
  const supabase = await createSupabaseServerClient();
  const storage = supabase.storage.from(COURSE_BUCKET);
  const { data: info, error: infoError } = await storage.info(path);
  if (infoError || !info) return null;
  const url = await signedReadUrl(path, 60);
  if (!url) return null;
  try {
    const res = await fetch(url, { headers: { Range: 'bytes=0-63' }, cache: 'no-store' });
    if (!res.ok && res.status !== 206) return null;
    const head = new Uint8Array(await res.arrayBuffer()).slice(0, 64);
    return { head, sizeBytes: Number(info.size ?? 0) };
  } catch {
    return null;
  }
}

/** Borra objetos del curso (reemplazo o rechazo de un archivo). Nunca lanza. */
export async function removeObjects(paths: string[]): Promise<void> {
  const list = paths.filter(Boolean);
  if (list.length === 0) return;
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.storage.from(COURSE_BUCKET).remove(list);
    if (error) throw error;
  } catch (err) {
    // Un archivo huérfano ocupa cuota pero no da acceso a nadie (el bucket es
    // privado y la ruta ya no está en la base). Se reporta para limpiarlo.
    reportControlFailure('marketplace_storage', 'degraded', err, { operation: 'remove', count: list.length });
  }
}
