import { describe, expect, it, vi } from 'vitest';

/**
 * ARCO — la exportación de datos incluye el programa de referidos de LA PERSONA y
 * nada de terceros: ni el comprador (nombre, correo, id), ni las marcas del
 * antifraude, ni quién la refirió. El doble de Prisma devuelve filas CON esos
 * datos a propósito: lo que se prueba es que la exportación los descarta.
 */

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    userProfile: {
      findUnique: async (args: { include?: unknown; select?: { referredByCodeId?: boolean } }) =>
        args.include
          ? {
              id: 'cku1', role: 'STUDENT', displayName: 'Ana', createdAt: new Date('2026-09-01'), badges: [], diagnosticDone: true,
              learningProfile: null, streak: null, weakTopics: [], sessions: [], subscriptions: [], notificationPrefs: [],
              asParentLinks: [], asStudentLinks: [], targetExam: null, targetCareer: null,
            }
          : { referredByCodeId: 'ckcodeDELREFERIDOR' },
    },
    referralCode: { findUnique: async () => ({ id: 'ckc', code: 'AB2CD3EF', active: true, createdAt: new Date('2026-09-02') }) },
    referralCreditLot: {
      findMany: async () => [
        { amountCents: 15_000, remainingCents: 5_000, accruedAt: new Date('2026-10-01'), expiresAt: new Date('2027-10-01'), revokedAt: null, saleId: 'ckSALE', userProfileId: 'cku1' },
      ],
    },
    referralSale: {
      findMany: async () => [
        {
          createdAt: new Date('2026-09-20'), commissionAmount: 15_000, status: 'ACCRUED', accruedAt: new Date('2026-09-28'), reversedAt: null,
          buyerProfileId: 'ckBUYER123', purchaseId: 'ckPURCHASE', fraudFlag: 'velocity', saleAmount: 99_900,
        },
      ],
    },
  },
}));

const { buildUserDataExport } = await import('@/lib/db/account');

describe('buildUserDataExport — programaDeReferidos', () => {
  it('trae el código, el crédito y las ventas propias con fechas y montos', async () => {
    const out = (await buildUserDataExport('cku1', 'ana@example.com')) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(out.programaDeReferidos.codigo).toMatchObject({ valor: 'AB2CD3EF', activo: true });
    expect(out.programaDeReferidos.credito).toEqual([
      { montoCentavos: 15_000, saldoCentavos: 5_000, acreditadoEl: new Date('2026-10-01'), venceEl: new Date('2027-10-01'), revocado: false },
    ]);
    expect(out.programaDeReferidos.ventasAtribuidas).toEqual([
      { fecha: new Date('2026-09-20'), comisionCentavos: 15_000, estado: 'ACCRUED', acreditadaEl: new Date('2026-09-28'), revertidaEl: null },
    ]);
  });

  it('dice SI llegó con un código de referido, pero NO cuál ni de quién (tercero)', async () => {
    const out = (await buildUserDataExport('cku1', null)) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(out.programaDeReferidos.llegasteConUnCodigoDeReferido).toBe(true);
    expect(JSON.stringify(out)).not.toContain('ckcodeDELREFERIDOR');
  });

  it('NADA del comprador ni del antifraude se cuela, aunque la fila de la base lo traiga', async () => {
    const text = JSON.stringify(await buildUserDataExport('cku1', 'ana@example.com'));
    for (const leak of ['ckBUYER123', 'ckPURCHASE', 'ckSALE', 'velocity', 'buyerProfileId', 'purchaseId', 'fraud', '99900']) {
      expect(text.includes(leak), leak).toBe(false);
    }
  });
});
