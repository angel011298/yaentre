import { describe, expect, it } from 'vitest';
import { REFUND_DENIAL_MESSAGE, REFUND_VALVE_HOURS, VALVE_REASON_LABEL, evaluateValve } from '@/lib/support/valve';
import { evaluateRefundAuthority } from '@/lib/admin/capabilities';

const PAID = new Date('2026-11-10T12:00:00.000Z');
const at = (hours: number) => new Date(PAID.getTime() + hours * 3_600_000);

describe('la válvula de 48 h con consumo cero', () => {
  it('son 48 horas', () => {
    expect(REFUND_VALVE_HOURS).toBe(48);
  });

  it('dentro: cobro reciente y ninguna sesión', () => {
    expect(evaluateValve({ paidAt: PAID, now: at(1), sessionsSinceActivation: 0 })).toEqual({ inside: true });
    expect(evaluateValve({ paidAt: PAID, now: PAID, sessionsSinceActivation: 0 })).toEqual({ inside: true });
  });

  it('el borde: EXACTAMENTE 48 h todavía es válvula; un milisegundo después ya no', () => {
    expect(evaluateValve({ paidAt: PAID, now: at(48), sessionsSinceActivation: 0 })).toEqual({ inside: true });
    expect(evaluateValve({ paidAt: PAID, now: new Date(at(48).getTime() + 1), sessionsSinceActivation: 0 })).toEqual({
      inside: false,
      reason: 'TOO_LATE',
    });
  });

  it('una sola sesión de estudio la cierra (consumo ≠ cero), aunque sea al minuto del cobro', () => {
    expect(evaluateValve({ paidAt: PAID, now: at(0.01), sessionsSinceActivation: 1 })).toEqual({ inside: false, reason: 'CONSUMED' });
    expect(evaluateValve({ paidAt: PAID, now: at(1), sessionsSinceActivation: 40 })).toEqual({ inside: false, reason: 'CONSUMED' });
  });

  it('sin fecha de cobro NO hay válvula (nunca se asume)', () => {
    expect(evaluateValve({ paidAt: null, now: at(1), sessionsSinceActivation: 0 })).toEqual({ inside: false, reason: 'NO_PAYMENT_DATE' });
  });

  it('un reloj que va hacia atrás (cobro «en el futuro») no abre la válvula', () => {
    expect(evaluateValve({ paidAt: at(5), now: PAID, sessionsSinceActivation: 0 })).toEqual({ inside: false, reason: 'TOO_LATE' });
  });

  it('cada motivo tiene su texto para la ficha', () => {
    for (const reason of ['NO_PAYMENT_DATE', 'TOO_LATE', 'CONSUMED'] as const) expect(VALVE_REASON_LABEL[reason].length).toBeGreaterThan(5);
  });
});

/** La matriz completa de quién puede reembolsar qué, ENUMERADA A MANO. */
describe('quién puede reembolsar — evaluateRefundAuthority (roles × maestro × válvula)', () => {
  const cases: Array<[string, boolean, boolean, string]> = [
    // rol, isMaster, insideValve → veredicto
    ['SUPPORT', false, true, 'allowed'],
    ['SUPPORT', false, false, 'OUTSIDE_VALVE'],
    ['SUPPORT', true, true, 'allowed'], // ser «maestro» no cambia lo de soporte…
    ['SUPPORT', true, false, 'OUTSIDE_VALVE'], // …porque los correos maestros son cuentas ADMIN
    ['ADMIN', false, true, 'MASTER_REQUIRED'],
    ['ADMIN', false, false, 'MASTER_REQUIRED'],
    ['ADMIN', true, true, 'allowed'],
    ['ADMIN', true, false, 'allowed'],
    ['ACCOUNTANT', true, true, 'ROLE_NOT_ALLOWED'],
    ['ACCOUNTANT', false, true, 'ROLE_NOT_ALLOWED'],
    ['STUDENT', true, true, 'ROLE_NOT_ALLOWED'],
    ['PARENT', true, true, 'ROLE_NOT_ALLOWED'],
    ['', true, true, 'ROLE_NOT_ALLOWED'],
  ];

  for (const [role, isMaster, insideValve, expected] of cases) {
    it(`${role || '(sin rol)'} · maestro=${isMaster} · válvula=${insideValve} → ${expected}`, () => {
      const verdict = evaluateRefundAuthority({ role, isMaster, insideValve });
      if (expected === 'allowed') expect(verdict).toEqual({ allowed: true });
      else expect(verdict).toEqual({ allowed: false, reason: expected });
    });
  }

  it('un rol nulo o desconocido nunca puede', () => {
    expect(evaluateRefundAuthority({ role: null, isMaster: true, insideValve: true })).toEqual({ allowed: false, reason: 'ROLE_NOT_ALLOWED' });
    expect(evaluateRefundAuthority({ role: 'CEO', isMaster: true, insideValve: true })).toEqual({ allowed: false, reason: 'ROLE_NOT_ALLOWED' });
  });

  it('cada denegación tiene un mensaje que dice qué hacer', () => {
    expect(REFUND_DENIAL_MESSAGE.OUTSIDE_VALVE).toMatch(/administrador maestro/);
    expect(REFUND_DENIAL_MESSAGE.MASTER_REQUIRED).toMatch(/maestro/);
    expect(REFUND_DENIAL_MESSAGE.ROLE_NOT_ALLOWED).toMatch(/rol/);
  });
});
