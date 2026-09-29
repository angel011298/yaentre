import { describe, expect, it, vi } from 'vitest';

// La capa de datos importa el cliente de Prisma; aquí no se toca ninguna base.
vi.mock('@/lib/db/prisma', () => ({ prisma: {} }));

const { PUBLIC_TEACHER_SELECT, toPublicCard, toPublicProfile } = await import('@/lib/db/teachers');

/**
 * Lista BLANCA, escrita a mano y a propósito NO derivada de `PUBLIC_TEACHER_SELECT`:
 * si el `select` creciera con un campo sensible, una prueba que compara el
 * `select` contra sí mismo seguiría en verde (la lección de la mutación del
 * tabulador). Estos son los ÚNICOS campos de un profesor que un alumno puede ver.
 */
const ALLOWED_PUBLIC_FIELDS = [
  'availability',
  'averageRating',
  'bio',
  'id',
  'level',
  'publicName',
  'ratingCount',
  'subjects',
  'totalClassesGiven',
].sort();

/** Campos que JAMÁS pueden salir a un alumno. */
const NEVER_PUBLIC = [
  'fullName', 'curp', 'clabe', 'rfc', 'phone', 'bankName', 'csfDocumentUrl', 'userProfileId',
  'paymentRail', 'cancellationRate', 'suspendReason', 'suspendedAt', 'status', 'contractVersion',
  'contractAcceptedAt', 'ndaAcceptedAt', 'recordingPolicyAcceptedAt', 'clabeUpdatedAt',
  'monthsActive', 'onboardedAt', 'createdAt', 'updatedAt',
];

describe('PUBLIC_TEACHER_SELECT — lo que un alumno puede ver de un profesor', () => {
  it('es EXACTAMENTE la lista blanca (ni un campo más)', () => {
    expect(Object.keys(PUBLIC_TEACHER_SELECT).sort()).toEqual(ALLOWED_PUBLIC_FIELDS);
  });

  it.each(NEVER_PUBLIC.map((f) => [f]))('no incluye «%s»', (field) => {
    expect(Object.keys(PUBLIC_TEACHER_SELECT)).not.toContain(field);
  });

  it('las materias solo traen la clave, no la tarifa base guardada', () => {
    expect(PUBLIC_TEACHER_SELECT.subjects).toEqual({ select: { subjectKey: true } });
  });
});

describe('las vistas públicas', () => {
  const row = {
    id: 'cabc',
    publicName: 'Juan P.',
    bio: 'Ingeniero con 8 años de experiencia.',
    level: 'VERIFICADO' as const,
    averageRating: 4.66,
    ratingCount: 12,
    totalClassesGiven: 30,
    availability: [{ weekday: 1, startMinute: 540, endMinute: 720 }],
    subjects: [{ subjectKey: 'matematicas' }, { subjectKey: 'fisica' }],
  };

  it('la tarjeta calcula el «Desde» sobre el nivel del profesor y redondea la calificación', () => {
    const card = toPublicCard(row as never);
    expect(card.fromPriceCents).toBe(34500); // $300 × 1.15 (Verificado)
    expect(card.averageRating).toBe(4.7);
    expect(card.subjects).toEqual([
      { key: 'matematicas', label: 'Matemáticas' },
      { key: 'fisica', label: 'Física' },
    ]);
  });

  it('sin calificaciones NO se muestra un «0.0»: la calificación es null', () => {
    expect(toPublicCard({ ...row, averageRating: 0, ratingCount: 0 } as never).averageRating).toBeNull();
  });

  it('la tarjeta y el perfil no filtran ningún campo fuera de lo permitido, ni con datos extra en la fila', () => {
    // Aunque la fila trajera de más (p. ej. un `select` mal escrito), el mapeador
    // construye la salida campo por campo y no propaga lo que no conoce.
    const dirty = { ...row, curp: 'HEGG560427MVZRRL04', clabe: '002010077777777771', phone: '5512345678', fullName: 'Juan Pérez García' };
    const serialized = JSON.stringify([toPublicCard(dirty as never), toPublicProfile(dirty as never)]);
    for (const secret of ['HEGG560427MVZRRL04', '002010077777777771', '5512345678', 'Juan Pérez García']) {
      expect(serialized).not.toContain(secret);
    }
  });

  it('las claves de materia desconocidas se descartan en vez de romper', () => {
    const card = toPublicCard({ ...row, subjects: [{ subjectKey: 'astrologia' }, { subjectKey: 'fisica' }] } as never);
    expect(card.subjects.map((s) => s.key)).toEqual(['fisica']);
  });

  it('el perfil añade presentación, clases dadas y disponibilidad ya normalizada', () => {
    const profile = toPublicProfile(row as never);
    expect(profile.bio).toBe('Ingeniero con 8 años de experiencia.');
    expect(profile.totalClassesGiven).toBe(30);
    expect(profile.availability).toEqual([{ weekday: 1, startMinute: 540, endMinute: 720 }]);
  });
});
