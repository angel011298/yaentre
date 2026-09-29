import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  profile: { id: 'ckp' } as null | { id: string },
  teacher: null as null | { id: string },
  live: 0,
  liveWhere: null as unknown,
  writes: [] as string[],
}));

vi.mock('@/lib/db/prisma', () => {
  const del = (name: string) => async () => {
    h.writes.push(name);
    return { count: 0 };
  };
  return {
    prisma: {
      userProfile: { findUnique: async () => h.profile, update: async () => void h.writes.push('userProfile.update') },
      teacher: { findUnique: async () => h.teacher },
      classSession: {
        count: async (args: unknown) => {
          h.liveWhere = args;
          return h.live;
        },
      },
      examSession: { deleteMany: del('examSession') },
      weakTopic: { deleteMany: del('weakTopic') },
      streakRecord: { deleteMany: del('streakRecord') },
      learningProfile: { deleteMany: del('learningProfile') },
      notificationPreference: { deleteMany: del('notificationPreference') },
      parentLinkCode: { deleteMany: del('parentLinkCode') },
      parentLink: { deleteMany: del('parentLink') },
      referralCode: { updateMany: del('referralCode') },
      referralCreditLot: { updateMany: del('referralCreditLot') },
      $transaction: async (ops: unknown[]) => Promise.all(ops),
    },
  };
});

const { anonymizeAndDeletePersonalData } = await import('@/lib/db/account');

beforeEach(() => {
  h.profile = { id: 'ckp' };
  h.teacher = null;
  h.live = 0;
  h.writes.length = 0;
});

describe('eliminar cuenta — Bloque 2', () => {
  it('sin profesor ni clases vivas se anonimiza como siempre', async () => {
    expect(await anonymizeAndDeletePersonalData('ckp')).toBe('OK');
    expect(h.writes).toContain('userProfile.update');
  });

  it('al anonimizar, el código de referido deja de atribuir y el crédito sobrante se pierde con la cuenta', async () => {
    expect(await anonymizeAndDeletePersonalData('ckp')).toBe('OK');
    expect(h.writes).toContain('referralCode');
    expect(h.writes).toContain('referralCreditLot');
  });

  it('un PROFESOR no se anonimiza: conserva datos fiscales y bancarios, y NO se escribe nada', async () => {
    h.teacher = { id: 't1' };
    expect(await anonymizeAndDeletePersonalData('ckp')).toBe('HAS_TEACHER_PROFILE');
    expect(h.writes).toEqual([]);
  });

  it('un alumno con clases vivas no se anonimiza, y NO se escribe nada', async () => {
    h.live = 2;
    expect(await anonymizeAndDeletePersonalData('ckp')).toBe('HAS_LIVE_CLASSES');
    expect(h.writes).toEqual([]);
  });

  it('«vivas» incluye la reserva sin pagar y la ya confirmada, pero no las terminadas ni canceladas', async () => {
    await anonymizeAndDeletePersonalData('ckp');
    const statuses = (h.liveWhere as { where: { status: { in: string[] } } }).where.status.in;
    expect(statuses.sort()).toEqual(['BOOKED', 'CONFIRMED', 'IN_PROGRESS', 'PENDING_PAYMENT']);
  });

  it('un perfil inexistente sigue siendo NOT_FOUND', async () => {
    h.profile = null;
    expect(await anonymizeAndDeletePersonalData('nope')).toBe('NOT_FOUND');
  });
});
