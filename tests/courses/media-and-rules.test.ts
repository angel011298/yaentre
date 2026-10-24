import { describe, expect, it } from 'vitest';
import {
  buildObjectPath,
  COURSE_LIMITS,
  isOwnObjectPath,
  sniffMatchesKind,
  sniffMediaType,
  validateUploadRequest,
} from '@/lib/courses/media';
import {
  averageRating,
  isVideoCompleted,
  progressPercent,
  slugify,
  validateCourseForSubmission,
  type CourseForSubmission,
} from '@/lib/courses/rules';
import { calculateCourseRevenue, validateCoursePrice, validateOriginalPrice } from '@/lib/courses/commission';
import { isReferralEligible } from '@/lib/referrals/eligibility';

const enc = (s: string) => new TextEncoder().encode(s);
const COURSE = 'ckcourse0000000000000000a';
const UUID = '0b6f1c2e-3d4a-4b5c-8d9e-0f1a2b3c4d5e';

describe('firma real de los archivos (no la extensión ni el tipo declarado)', () => {
  it('reconoce MP4, MOV, WebM, JPEG, PNG, WebP y PDF por sus primeros bytes', () => {
    expect(sniffMediaType(new Uint8Array([0, 0, 0, 0x18, ...enc('ftypisom')]))).toBe('mp4');
    expect(sniffMediaType(new Uint8Array([0, 0, 0, 0x14, ...enc('ftypqt  ')]))).toBe('mov');
    expect(sniffMediaType(new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 1, 2]))).toBe('webm');
    expect(sniffMediaType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe('jpeg');
    expect(sniffMediaType(new Uint8Array([0x89, ...enc('PNG\r\n\x1a\n')]))).toBe('png');
    expect(sniffMediaType(enc('RIFF\0\0\0\0WEBPVP8 '))).toBe('webp');
    expect(sniffMediaType(enc('%PDF-1.7'))).toBe('pdf');
  });

  it('un HTML o un ejecutable renombrado a .mp4 NO pasa', () => {
    expect(sniffMediaType(enc('<!doctype html><script>'))).toBeNull();
    expect(sniffMediaType(enc('MZ\x90\0'))).toBeNull();
    expect(sniffMatchesKind(sniffMediaType(enc('<html>')), 'video')).toBe(false);
  });

  it('cada uso exige su familia: una imagen no sirve como video, un PDF no sirve como portada', () => {
    expect(sniffMatchesKind('jpeg', 'video')).toBe(false);
    expect(sniffMatchesKind('pdf', 'thumbnail')).toBe(false);
    expect(sniffMatchesKind('mp4', 'video')).toBe(true);
    expect(sniffMatchesKind('webp', 'thumbnail')).toBe(true);
    expect(sniffMatchesKind('pdf', 'resource')).toBe(true);
  });
});

describe('validateUploadRequest — tipo, tamaño y cuota antes de firmar la subida', () => {
  it('500 MB por video, 5 GB por curso', () => {
    expect(validateUploadRequest({ kind: 'video', mimeType: 'video/mp4', sizeBytes: COURSE_LIMITS.MAX_VIDEO_BYTES, courseBytesUsed: 0 })).toEqual({ ok: true, ext: 'mp4' });
    expect(validateUploadRequest({ kind: 'video', mimeType: 'video/mp4', sizeBytes: COURSE_LIMITS.MAX_VIDEO_BYTES + 1, courseBytesUsed: 0 }).ok).toBe(false);
    expect(
      validateUploadRequest({ kind: 'video', mimeType: 'video/mp4', sizeBytes: 100, courseBytesUsed: COURSE_LIMITS.MAX_COURSE_BYTES - 50 }).ok
    ).toBe(false);
  });

  it('tipos fuera de la lista o del uso equivocado se rechazan', () => {
    expect(validateUploadRequest({ kind: 'video', mimeType: 'text/html', sizeBytes: 10, courseBytesUsed: 0 }).ok).toBe(false);
    expect(validateUploadRequest({ kind: 'thumbnail', mimeType: 'video/mp4', sizeBytes: 10, courseBytesUsed: 0 }).ok).toBe(false);
    expect(validateUploadRequest({ kind: 'resource', mimeType: 'application/zip', sizeBytes: 10, courseBytesUsed: 0 }).ok).toBe(false);
    expect(validateUploadRequest({ kind: 'video', mimeType: 'video/mp4', sizeBytes: 0, courseBytesUsed: 0 }).ok).toBe(false);
  });
});

describe('rutas de Storage: las genera el servidor, sin nada del cliente', () => {
  it('forma fija courses/<id>/<tipo>/<uuid>.<ext>', () => {
    expect(buildObjectPath(COURSE, 'video', UUID, 'mp4')).toBe(`courses/${COURSE}/lessons/${UUID}.mp4`);
    expect(buildObjectPath(COURSE, 'thumbnail', UUID, 'jpg')).toBe(`courses/${COURSE}/cover/${UUID}.jpg`);
  });

  it('rechaza ids, uuids o extensiones manipuladas (sin path traversal)', () => {
    expect(() => buildObjectPath('../otro', 'video', UUID, 'mp4')).toThrow();
    expect(() => buildObjectPath(COURSE, 'video', '../../x', 'mp4')).toThrow();
    expect(() => buildObjectPath(COURSE, 'video', UUID, 'mp4/../../x')).toThrow();
  });

  it('isOwnObjectPath: solo una ruta de ESE curso y de ESE tipo', () => {
    const path = buildObjectPath(COURSE, 'video', UUID, 'mp4');
    expect(isOwnObjectPath(path, COURSE, 'video')).toBe(true);
    expect(isOwnObjectPath(path, 'ckcourse0000000000000000b', 'video')).toBe(false);
    expect(isOwnObjectPath(path, COURSE, 'resource')).toBe(false);
    expect(isOwnObjectPath(`${path}/../../otro.mp4`, COURSE, 'video')).toBe(false);
    expect(isOwnObjectPath(`courses/${COURSE}/lessons/../cover/${UUID}.mp4`, COURSE, 'video')).toBe(false);
  });
});

function course(over: Partial<CourseForSubmission> = {}): CourseForSubmission {
  return {
    title: 'Álgebra desde cero',
    description: 'Un curso completo de álgebra para regularizar la materia paso a paso, con ejemplos.',
    shortDescription: 'Álgebra paso a paso',
    thumbnailPath: 'courses/x/cover/y.jpg',
    priceCents: 29_900,
    isFree: false,
    modules: [
      {
        title: 'Módulo 1',
        lessons: [{ type: 'VIDEO', title: '1.1', videoPath: 'p', videoDurationSeconds: 400, content: null, resourcePath: null, isFreePreview: true }],
      },
    ],
    ...over,
  };
}

describe('validaciones previas al envío a revisión (spec §2.6)', () => {
  it('un curso completo pasa', () => {
    expect(validateCourseForSubmission(course())).toEqual([]);
  });
  it('sin módulos, sin portada, con menos de 5 min de video, o con precio fuera de rango → no', () => {
    expect(validateCourseForSubmission(course({ modules: [] })).length).toBeGreaterThan(0);
    expect(validateCourseForSubmission(course({ thumbnailPath: null }))).toContain('Sube una imagen de portada.');
    const short = course();
    short.modules[0].lessons[0].videoDurationSeconds = 120;
    expect(validateCourseForSubmission(short)).toContain('El curso necesita al menos 5 minutos de video en total.');
    expect(validateCourseForSubmission(course({ priceCents: 5_000 })).join(' ')).toContain('mínimo');
  });
  it('máximo 3 lecciones de muestra gratuita', () => {
    const lessons = Array.from({ length: 4 }, (_, i) => ({ type: 'VIDEO' as const, title: `l${i}`, videoPath: 'p', videoDurationSeconds: 100, content: null, resourcePath: null, isFreePreview: true }));
    expect(validateCourseForSubmission(course({ modules: [{ title: 'M', lessons }] }))).toContain('Máximo 3 lecciones de muestra gratuita.');
  });
  it('una lección de video sin video, de texto sin texto o de material sin archivo', () => {
    const lessons = [
      { type: 'VIDEO' as const, title: 'v', videoPath: 'p', videoDurationSeconds: 400, content: null, resourcePath: null, isFreePreview: false },
      { type: 'VIDEO' as const, title: 'sin-video', videoPath: null, videoDurationSeconds: null, content: null, resourcePath: null, isFreePreview: false },
      { type: 'TEXT' as const, title: 'sin-texto', videoPath: null, videoDurationSeconds: null, content: '  ', resourcePath: null, isFreePreview: false },
      { type: 'RESOURCE' as const, title: 'sin-pdf', videoPath: null, videoDurationSeconds: null, content: null, resourcePath: null, isFreePreview: false },
    ];
    const errors = validateCourseForSubmission(course({ modules: [{ title: 'M', lessons }] })).join(' ');
    expect(errors).toContain('«sin-video»');
    expect(errors).toContain('«sin-texto»');
    expect(errors).toContain('«sin-pdf»');
  });
});

describe('precio, comisión y referidos de los cursos', () => {
  it('rango $99–$9,999 o gratis', () => {
    expect(validateCoursePrice(9_900, false).valid).toBe(true);
    expect(validateCoursePrice(9_899, false).valid).toBe(false);
    expect(validateCoursePrice(999_901, false).valid).toBe(false);
    expect(validateCoursePrice(0, true).valid).toBe(true);
    expect(validateCoursePrice(100, true).valid).toBe(false);
    expect(validateOriginalPrice(29_900, 49_900).valid).toBe(true);
    expect(validateOriginalPrice(29_900, 19_900).valid).toBe(false);
  });

  it('25 % YaEntre / 75 % profesor, en centavos, sumando exacto', () => {
    expect(calculateCourseRevenue(49_900)).toEqual({ teacherCents: 37_425, yaentreCents: 12_475 });
    const odd = calculateCourseRevenue(9_999);
    expect(odd.teacherCents + odd.yaentreCents).toBe(9_999);
  });

  it('cursos, clases y la extensión NUNCA generan comisión de referido; Básico y Premium sí; el Mensual no', () => {
    expect(isReferralEligible('COURSE')).toBe(false);
    expect(isReferralEligible('CLASS_ADMISION')).toBe(false);
    expect(isReferralEligible('CLASS_REGULARIZACION')).toBe(false);
    expect(isReferralEligible('ACCESS_EXTENSION')).toBe(false);
    expect(isReferralEligible('PLAN_MONTHLY')).toBe(false);
    expect(isReferralEligible('PLAN_SEASON_PASS')).toBe(true);
    expect(isReferralEligible('PLAN_PREMIUM')).toBe(true);
  });
});

describe('progreso del reproductor', () => {
  it('un video se da por visto al 90 %', () => {
    expect(isVideoCompleted(89, 100)).toBe(false);
    expect(isVideoCompleted(90, 100)).toBe(true);
    expect(isVideoCompleted(50, null)).toBe(false);
  });
  it('porcentaje con un decimal y tope de 100', () => {
    expect(progressPercent(1, 3)).toBe(33.3);
    expect(progressPercent(4, 3)).toBe(100);
    expect(progressPercent(0, 0)).toBe(0);
  });
  it('promedio de calificaciones', () => {
    expect(averageRating([5, 4, 4])).toBe(4.3);
    expect(averageRating([])).toBe(0);
  });
  it('slug legible y estable', () => {
    expect(slugify('Álgebra lineal desde cero')).toBe('algebra-lineal-desde-cero');
    expect(slugify('Inglés B2: ¡intensivo!')).toBe('ingles-b2-intensivo');
    expect(slugify('???')).toBe('curso');
  });
});
