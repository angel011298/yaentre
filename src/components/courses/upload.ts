'use client';

import { confirmCourseUploadAction, requestCourseUploadAction } from '@/app/actions/courses-teacher';

/**
 * G103 — subida de un archivo del curso en tres pasos, sin que los bytes pasen
 * por el servidor de la app (límite de cuerpo de Vercel):
 *   1. el servidor valida tipo, tamaño, cuota y dueño, y emite una URL firmada
 *      para una RUTA que él mismo generó;
 *   2. el navegador sube el archivo directo a Storage (XHR para mostrar el
 *      avance);
 *   3. el servidor confirma: existe, pesa lo que debe y su FIRMA real
 *      corresponde al tipo; si no, lo borra.
 */
export type UploadKind = 'video' | 'preview' | 'thumbnail' | 'resource';

/**
 * Duración real del video, leída del archivo local antes de subirlo.
 *
 * Un WebM grabado con `MediaRecorder` (grabadores de pantalla, la cámara del
 * navegador) no trae la duración en la cabecera y el navegador la reporta como
 * `Infinity`. Truco estándar: buscar a un punto enorme obliga al navegador a
 * recorrer el archivo y emitir `durationchange` con la duración real. Con tope
 * de 8 s para no colgar la subida.
 */
export function readVideoDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement('video');
    let settled = false;
    const finish = (value: number | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      URL.revokeObjectURL(url);
      resolve(value);
    };
    const timer = setTimeout(() => finish(null), 8_000);
    const finite = () => Number.isFinite(v.duration) && v.duration > 0;
    v.preload = 'metadata';
    v.muted = true;
    v.onloadedmetadata = () => {
      if (finite()) return finish(v.duration);
      v.ondurationchange = () => {
        if (finite()) finish(v.duration);
      };
      v.currentTime = Number.MAX_SAFE_INTEGER;
    };
    v.onerror = () => finish(null);
    v.src = url;
  });
}

function putWithProgress(url: string, file: File, onProgress: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (anon) {
      xhr.setRequestHeader('apikey', anon);
      xhr.setRequestHeader('authorization', `Bearer ${anon}`);
    }
    xhr.setRequestHeader('x-upsert', 'false');
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`HTTP ${xhr.status}`)));
    xhr.onerror = () => reject(new Error('network'));
    const body = new FormData();
    body.append('cacheControl', '3600');
    body.append('', file);
    xhr.send(body);
  });
}

export async function uploadCourseFile(input: {
  courseId: string;
  lessonId: string | null;
  kind: UploadKind;
  file: File;
  onProgress: (pct: number) => void;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const { courseId, lessonId, kind, file } = input;
  let durationSeconds: number | null = null;
  if (kind === 'video' || kind === 'preview') {
    durationSeconds = await readVideoDuration(file);
    if (kind === 'video' && !durationSeconds) return { ok: false, message: 'No pudimos leer el video. Prueba con un MP4.' };
  }

  const req = await requestCourseUploadAction({ courseId, lessonId, kind, mimeType: file.type, sizeBytes: file.size }).catch(() => null);
  if (!req?.ok) return { ok: false, message: req?.message ?? 'No pudimos preparar la subida.' };

  try {
    await putWithProgress(req.data.signedUrl, file, input.onProgress);
  } catch {
    return { ok: false, message: 'La subida se interrumpió. Revisa tu conexión e intenta de nuevo.' };
  }

  const done = await confirmCourseUploadAction({ courseId, lessonId, kind, path: req.data.path, durationSeconds }).catch(() => null);
  if (!done?.ok) return { ok: false, message: done?.message ?? 'No pudimos registrar el archivo.' };
  return { ok: true };
}
