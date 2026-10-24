/**
 * G103 — archivos de los cursos en Storage (spec §2.5, §7.1). PURO.
 *
 * Reglas que no se negocian:
 *  - el bucket es PRIVADO; nunca hay URL pública;
 *  - la RUTA la genera el servidor: `courses/<courseId>/<tipo>/<uuid>.<ext>`,
 *    con la extensión que sale del TIPO validado — nunca del nombre que mandó
 *    el navegador (sin `..`, sin barras, sin nada que el cliente controle);
 *  - el tipo se valida dos veces: el que declara el navegador al pedir la URL
 *    de subida, y el REAL leyendo los primeros bytes ya subidos (firma
 *    `ftyp` de MP4/MOV, EBML de WebM, JPEG/PNG/WebP, `%PDF-`); si no coincide,
 *    el archivo se borra y no se registra;
 *  - tamaño: 500 MB por video y 5 GB por curso (spec).
 */

export const COURSE_BUCKET = 'course-videos';

export const COURSE_LIMITS = {
  MAX_VIDEO_BYTES: 500 * 1024 * 1024,
  MAX_COURSE_BYTES: 5 * 1024 * 1024 * 1024,
  MAX_IMAGE_BYTES: 5 * 1024 * 1024,
  MAX_RESOURCE_BYTES: 50 * 1024 * 1024,
  MAX_FREE_PREVIEWS: 3,
  /** Mínimo de video para enviar a revisión: 5 minutos en total. */
  MIN_TOTAL_VIDEO_SECONDS: 5 * 60,
  /** Vida de una URL firmada de reproducción; el reproductor la renueva al caducar. */
  PLAYBACK_URL_TTL_SECONDS: 3600,
  UPLOAD_URL_TTL_SECONDS: 2 * 3600,
} as const;

export type MediaKind = 'video' | 'preview' | 'thumbnail' | 'resource';

export type SniffedType = 'mp4' | 'mov' | 'webm' | 'jpeg' | 'png' | 'webp' | 'pdf';

const TYPES: Record<string, { sniff: SniffedType[]; ext: string; kinds: MediaKind[] }> = {
  'video/mp4': { sniff: ['mp4', 'mov'], ext: 'mp4', kinds: ['video', 'preview'] },
  'video/quicktime': { sniff: ['mov', 'mp4'], ext: 'mov', kinds: ['video', 'preview'] },
  'video/webm': { sniff: ['webm'], ext: 'webm', kinds: ['video', 'preview'] },
  'image/jpeg': { sniff: ['jpeg'], ext: 'jpg', kinds: ['thumbnail'] },
  'image/png': { sniff: ['png'], ext: 'png', kinds: ['thumbnail'] },
  'image/webp': { sniff: ['webp'], ext: 'webp', kinds: ['thumbnail'] },
  'application/pdf': { sniff: ['pdf'], ext: 'pdf', kinds: ['resource'] },
};

export function maxBytesFor(kind: MediaKind): number {
  if (kind === 'video' || kind === 'preview') return COURSE_LIMITS.MAX_VIDEO_BYTES;
  if (kind === 'thumbnail') return COURSE_LIMITS.MAX_IMAGE_BYTES;
  return COURSE_LIMITS.MAX_RESOURCE_BYTES;
}

export type UploadCheck = { ok: true; ext: string } | { ok: false; error: string };

/** Validación ANTES de emitir la URL de subida (tipo declarado, tamaño y cuota). */
export function validateUploadRequest(input: {
  kind: MediaKind;
  mimeType: string;
  sizeBytes: number;
  courseBytesUsed: number;
}): UploadCheck {
  const t = TYPES[input.mimeType];
  if (!t || !t.kinds.includes(input.kind)) {
    const allowed =
      input.kind === 'thumbnail' ? 'JPG, PNG o WebP' : input.kind === 'resource' ? 'PDF' : 'MP4, WebM o MOV';
    return { ok: false, error: `Formato no permitido. Usa ${allowed}.` };
  }
  if (!Number.isInteger(input.sizeBytes) || input.sizeBytes <= 0) return { ok: false, error: 'El archivo está vacío.' };
  const max = maxBytesFor(input.kind);
  if (input.sizeBytes > max) return { ok: false, error: `El archivo pesa más de ${Math.round(max / 1024 / 1024)} MB.` };
  if (input.courseBytesUsed + input.sizeBytes > COURSE_LIMITS.MAX_COURSE_BYTES) {
    return { ok: false, error: 'El curso superaría el límite de 5 GB.' };
  }
  return { ok: true, ext: t.ext };
}

const KIND_DIR: Record<MediaKind, string> = {
  video: 'lessons',
  preview: 'preview',
  thumbnail: 'cover',
  resource: 'resources',
};

/** Ruta del objeto. `uuid` lo pone el llamador con `crypto.randomUUID()`. */
export function buildObjectPath(courseId: string, kind: MediaKind, uuid: string, ext: string): string {
  if (!/^c[a-z0-9]{20,40}$/.test(courseId)) throw new Error('courseId inválido');
  if (!/^[0-9a-f-]{36}$/.test(uuid)) throw new Error('uuid inválido');
  if (!/^[a-z0-9]{2,4}$/.test(ext)) throw new Error('extensión inválida');
  return `courses/${courseId}/${KIND_DIR[kind]}/${uuid}.${ext}`;
}

/** ¿Esta ruta la generó el servidor para ESTE curso y este tipo? */
export function isOwnObjectPath(path: string, courseId: string, kind: MediaKind): boolean {
  const re = new RegExp(`^courses/${courseId}/${KIND_DIR[kind]}/[0-9a-f-]{36}\\.[a-z0-9]{2,4}$`);
  return re.test(path);
}

/** Firma real del archivo por sus primeros bytes. */
export function sniffMediaType(bytes: Uint8Array): SniffedType | null {
  const at = (i: number) => bytes[i];
  const ascii = (from: number, len: number) => String.fromCharCode(...bytes.slice(from, from + len));
  if (bytes.length >= 12 && ascii(4, 4) === 'ftyp') {
    return ascii(8, 4) === 'qt  ' ? 'mov' : 'mp4';
  }
  if (bytes.length >= 4 && at(0) === 0x1a && at(1) === 0x45 && at(2) === 0xdf && at(3) === 0xa3) return 'webm';
  if (bytes.length >= 3 && at(0) === 0xff && at(1) === 0xd8 && at(2) === 0xff) return 'jpeg';
  if (bytes.length >= 8 && at(0) === 0x89 && ascii(1, 3) === 'PNG') return 'png';
  if (bytes.length >= 12 && ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WEBP') return 'webp';
  if (bytes.length >= 5 && ascii(0, 5) === '%PDF-') return 'pdf';
  return null;
}

/** ¿Lo que se subió es de verdad del tipo esperado para ese uso? */
export function sniffMatchesKind(sniffed: SniffedType | null, kind: MediaKind): boolean {
  if (!sniffed) return false;
  if (kind === 'video' || kind === 'preview') return sniffed === 'mp4' || sniffed === 'mov' || sniffed === 'webm';
  if (kind === 'thumbnail') return sniffed === 'jpeg' || sniffed === 'png' || sniffed === 'webp';
  return sniffed === 'pdf';
}
