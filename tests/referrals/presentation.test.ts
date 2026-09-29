import { describe, expect, it } from 'vitest';
import { daysUntilAccrual, describeSale } from '@/lib/referrals/presentation';
import { AUTH_REQUIRED_PREFIXES, matchesPrefix } from '@/lib/auth/middleware-policy';

const NOW = new Date('2026-11-10T12:00:00.000Z');
const d = (iso: string) => new Date(iso);

describe('daysUntilAccrual', () => {
  it('redondea hacia arriba: 1 h antes todavía es «1 día»', () => {
    expect(daysUntilAccrual(d('2026-11-10T13:00:00Z'), NOW)).toBe(1);
    expect(daysUntilAccrual(d('2026-11-13T12:00:00Z'), NOW)).toBe(3);
    expect(daysUntilAccrual(d('2026-11-13T12:00:01Z'), NOW)).toBe(4);
  });

  it('nunca es negativo', () => {
    expect(daysUntilAccrual(d('2026-11-10T12:00:00Z'), NOW)).toBe(0);
    expect(daysUntilAccrual(d('2026-10-01T12:00:00Z'), NOW)).toBe(0);
  });
});

describe('describeSale — lo que se le cuenta a quien invitó', () => {
  const base = { accrueAfter: d('2026-11-15T12:00:00Z'), underReview: false, reversedForRefund: false };

  it('acreditada: ✓ (marca además del color)', () => {
    const v = describeSale({ ...base, status: 'ACCRUED' }, NOW);
    expect(v.tone).toBe('success');
    expect(v.label).toMatch(/^✓/);
  });

  it('pendiente: cuenta los días, en singular y plural', () => {
    expect(describeSale({ ...base, status: 'PENDING' }, NOW).label).toBe('⏳ Se acredita en 5 días');
    expect(describeSale({ ...base, status: 'PENDING', accrueAfter: d('2026-11-11T00:00:00Z') }, NOW).label).toBe('⏳ Se acredita en 1 día');
    expect(describeSale({ ...base, status: 'PENDING', accrueAfter: d('2026-11-09T00:00:00Z') }, NOW).label).toBe('⏳ Se acredita hoy');
  });

  it('en revisión: dice «en verificación» y NADA de por qué', () => {
    const v = describeSale({ ...base, status: 'PENDING', underReview: true }, NOW);
    expect(v.tone).toBe('review');
    expect(v.label).toMatch(/verificación/);
    expect(JSON.stringify(v).toLowerCase()).not.toMatch(/fraude|antifraude|velocidad|autocompra|correo/);
  });

  it('revertida por reembolso: lo dice; por cualquier otra causa: «no se acreditó», sin motivo', () => {
    expect(describeSale({ ...base, status: 'REVERSED', reversedForRefund: true }, NOW).label).toMatch(/Revertido/);
    const other = describeSale({ ...base, status: 'REVERSED' }, NOW);
    expect(other.label).toBe('✗ No se acreditó');
    expect(JSON.stringify(other).toLowerCase()).not.toMatch(/fraude|autocompra|correo/);
  });

  it('todo estado tiene un texto (ninguno cae en vacío)', () => {
    for (const status of ['PENDING', 'ACCRUED', 'PAID', 'REVERSED'] as const) {
      const v = describeSale({ ...base, status }, NOW);
      expect(v.label.length).toBeGreaterThan(3);
      expect(v.detail.length).toBeGreaterThan(3);
    }
  });
});

describe('rutas: quién las ve desde el middleware', () => {
  it('el enlace público /r/{código} NO exige sesión (un visitante anónimo tiene que poder abrirlo)', () => {
    expect(matchesPrefix('/r/AB2CD3EF', AUTH_REQUIRED_PREFIXES)).toBe(false);
  });

  it('«Invita y gana» del alumno y del tutor SÍ la exigen', () => {
    expect(matchesPrefix('/app/invitar', AUTH_REQUIRED_PREFIXES)).toBe(true);
    expect(matchesPrefix('/tutor/invitar', AUTH_REQUIRED_PREFIXES)).toBe(true);
  });
});
