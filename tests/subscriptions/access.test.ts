import { describe, expect, it } from 'vitest';
import type { SubscriptionPlan, SubscriptionStatus } from '@prisma/client';
import {
  ACCESS_DURATION,
  addMonthsInMexico,
  calculateExpirationDate,
  calculateExtensionDate,
  calculateGraceEndsAt,
  extensionPriceCents,
} from '@/lib/subscriptions/access-duration';
import {
  accessibleSubscriptionWhere,
  checkAccessStatus,
  dueExpiryNotice,
  expiryNoticeKey,
  hasPaidAccess,
  mexicoCalendarDaysBetween,
  mexicoDayKey,
  type AccessSubscription,
} from '@/lib/subscriptions/access-check';
import { evaluateExtensionEligibility } from '@/lib/subscriptions/extension';

/**
 * G103 — temporalidad de acceso: 12 meses, gracia de 7 días, extensión de 6.
 * Todas las fechas se expresan en UTC; los comentarios dicen la hora de la
 * Ciudad de México (UTC−6 desde la reforma de 2022; UTC−5 en el horario de
 * verano anterior).
 */

const DAY = 24 * 3600 * 1000;

describe('calculateExpirationDate — 12 meses de calendario en hora de México', () => {
  it('Básico y Premium vencen exactamente 12 meses después, a la misma hora local', () => {
    const compra = new Date('2026-11-15T19:30:00Z'); // 13:30 CDMX
    expect(calculateExpirationDate('SEASON_PASS', compra)).toEqual(new Date('2027-11-15T19:30:00Z'));
    expect(calculateExpirationDate('PREMIUM', compra)).toEqual(new Date('2027-11-15T19:30:00Z'));
  });

  it('el Mensual no tiene vigencia propia (la controla Stripe)', () => {
    expect(calculateExpirationDate('MONTHLY', new Date('2026-11-15T19:30:00Z'))).toBeNull();
  });

  it('29 de febrero + 12 meses = 28 de febrero (no se desborda a marzo)', () => {
    const compra = new Date('2028-02-29T18:00:00Z'); // 29-feb-2028 12:00 CDMX
    expect(mexicoDayKey(compra)).toBe('2028-02-29');
    const vence = calculateExpirationDate('SEASON_PASS', compra)!;
    expect(mexicoDayKey(vence)).toBe('2029-02-28');
  });

  it('comprar el 1 de marzo antes de un año bisiesto da 12 meses reales, no 365 días', () => {
    const compra = new Date('2027-03-01T18:00:00Z');
    const vence = calculateExpirationDate('PREMIUM', compra)!;
    expect(mexicoDayKey(vence)).toBe('2028-03-01');
    expect(Math.round((vence.getTime() - compra.getTime()) / DAY)).toBe(366);
  });

  it('la medianoche UTC NO cambia el día: una compra a las 23:30 CDMX cuenta como ese día', () => {
    const compra = new Date('2026-12-01T05:30:00Z'); // 30-nov 23:30 CDMX
    expect(mexicoDayKey(compra)).toBe('2026-11-30');
    expect(mexicoDayKey(calculateExpirationDate('SEASON_PASS', compra)!)).toBe('2027-11-30');
  });

  it('horario de verano histórico: una compra con CDT (UTC−5) vence a la misma hora local ya en CST (UTC−6)', () => {
    // 1-jun-2022 12:00 CDT = 17:00Z. Un año después México ya no tiene horario
    // de verano: 1-jun-2023 12:00 CST = 18:00Z. Sumar 365×24 h daría 11:00.
    const compra = new Date('2022-06-01T17:00:00Z');
    expect(calculateExpirationDate('SEASON_PASS', compra)).toEqual(new Date('2023-06-01T18:00:00Z'));
  });

  it('fin de mes: 31 de enero + 6 meses = 31 de julio; 31 de agosto + 6 = 28 de febrero', () => {
    expect(mexicoDayKey(addMonthsInMexico(new Date('2027-01-31T18:00:00Z'), 6))).toBe('2027-07-31');
    expect(mexicoDayKey(addMonthsInMexico(new Date('2027-08-31T18:00:00Z'), 6))).toBe('2028-02-29');
    expect(mexicoDayKey(addMonthsInMexico(new Date('2026-08-31T18:00:00Z'), 6))).toBe('2027-02-28');
  });
});

describe('gracia y extensión', () => {
  it('la gracia es expiresAt + 7 días', () => {
    const vence = new Date('2027-10-15T18:00:00Z');
    expect(calculateGraceEndsAt(vence)).toEqual(new Date('2027-10-22T18:00:00Z'));
    expect(ACCESS_DURATION.GRACE_PERIOD_DAYS).toBe(7);
  });

  it('la extensión suma 6 meses a la vigencia ACTUAL, no a la fecha de compra', () => {
    expect(calculateExtensionDate(new Date('2027-10-15T18:00:00Z'))).toEqual(new Date('2028-04-15T18:00:00Z'));
  });

  it('precio fijo de la extensión: $499 Básico, $899 Premium, ninguno para el Mensual', () => {
    expect(extensionPriceCents('SEASON_PASS')).toBe(49_900);
    expect(extensionPriceCents('PREMIUM')).toBe(89_900);
    expect(extensionPriceCents('MONTHLY')).toBeNull();
  });
});

function sub(overrides: Partial<AccessSubscription> = {}): AccessSubscription {
  return {
    status: 'ACTIVE',
    plan: 'SEASON_PASS',
    expiresAt: new Date('2027-10-15T18:00:00Z'),
    graceEndsAt: new Date('2027-10-22T18:00:00Z'),
    ...overrides,
  };
}

describe('checkAccessStatus — ACTIVE / GRACE / EXPIRED / NONE', () => {
  it('sin suscripción → NONE', () => {
    expect(checkAccessStatus(null, new Date())).toBe('NONE');
  });

  it('un checkout PENDING o FAILED nunca dio acceso → NONE', () => {
    expect(checkAccessStatus(sub({ status: 'PENDING' }), new Date('2027-01-01'))).toBe('NONE');
    expect(checkAccessStatus(sub({ status: 'FAILED' }), new Date('2027-01-01'))).toBe('NONE');
  });

  it('cancelada o expirada en la base → EXPIRED aunque la fecha no haya llegado', () => {
    expect(checkAccessStatus(sub({ status: 'CANCELED' }), new Date('2027-01-01'))).toBe('EXPIRED');
    expect(checkAccessStatus(sub({ status: 'EXPIRED' }), new Date('2027-01-01'))).toBe('EXPIRED');
  });

  it('antes de vencer → ACTIVE; en la gracia → GRACE; después → EXPIRED', () => {
    const s = sub();
    expect(checkAccessStatus(s, new Date('2027-10-15T17:59:59Z'))).toBe('ACTIVE');
    expect(checkAccessStatus(s, new Date('2027-10-15T18:00:00Z'))).toBe('GRACE');
    expect(checkAccessStatus(s, new Date('2027-10-22T17:59:59Z'))).toBe('GRACE');
    expect(checkAccessStatus(s, new Date('2027-10-22T18:00:00Z'))).toBe('EXPIRED');
  });

  it('el Mensual (sin expiresAt) es ACTIVE mientras Stripe lo mantenga activo', () => {
    expect(checkAccessStatus(sub({ plan: 'MONTHLY', expiresAt: null, graceEndsAt: null }), new Date('2030-01-01'))).toBe('ACTIVE');
  });

  it('fila anterior a G103 sin graceEndsAt: la gracia se deriva — nunca se bloquea sin ella', () => {
    const legacy = sub({ graceEndsAt: null });
    expect(checkAccessStatus(legacy, new Date('2027-10-20T00:00:00Z'))).toBe('GRACE');
    expect(checkAccessStatus(legacy, new Date('2027-10-23T00:00:00Z'))).toBe('EXPIRED');
  });

  it('la gracia SÍ da acceso de pago; EXPIRED y NONE no', () => {
    expect(hasPaidAccess('ACTIVE')).toBe(true);
    expect(hasPaidAccess('GRACE')).toBe(true);
    expect(hasPaidAccess('EXPIRED')).toBe(false);
    expect(hasPaidAccess('NONE')).toBe(false);
  });
});

/**
 * Evaluador en memoria del filtro de Prisma, para comprobar que la consulta de
 * `getActiveSubscription` y la función pura dicen EXACTAMENTE lo mismo.
 */
type Row = AccessSubscription;
type Cond = Record<string, unknown>;
function matches(row: Row, where: Cond): boolean {
  for (const [key, value] of Object.entries(where)) {
    if (key === 'OR') {
      if (!(value as Cond[]).some((c) => matches(row, c))) return false;
      continue;
    }
    const field = (row as unknown as Record<string, unknown>)[key] as Date | string | null;
    if (value === null) {
      if (field !== null) return false;
    } else if (typeof value === 'object' && value !== null && 'gt' in value) {
      if (!(field instanceof Date) || !(field.getTime() > (value.gt as Date).getTime())) return false;
    } else if (field !== value) {
      return false;
    }
  }
  return true;
}

describe('accessibleSubscriptionWhere ≡ checkAccessStatus (no pueden separarse)', () => {
  const statuses: SubscriptionStatus[] = ['PENDING', 'ACTIVE', 'FAILED', 'EXPIRED', 'CANCELED'];
  const plans: SubscriptionPlan[] = ['MONTHLY', 'SEASON_PASS', 'PREMIUM'];
  const expiries = [null, new Date('2027-10-15T18:00:00Z')];
  const graces = [null, new Date('2027-10-22T18:00:00Z')];
  const instants = [
    '2027-01-01T00:00:00Z',
    '2027-10-15T17:59:59Z',
    '2027-10-15T18:00:01Z',
    '2027-10-21T00:00:00Z',
    '2027-10-22T18:00:01Z',
    '2028-01-01T00:00:00Z',
  ].map((s) => new Date(s));

  for (const status of statuses)
    for (const plan of plans)
      for (const expiresAt of expiries)
        for (const graceEndsAt of graces) {
          if (!expiresAt && graceEndsAt) continue; // combinación imposible
          for (const now of instants) {
            it(`${status}/${plan}/${expiresAt ? 'vence' : 'sin-vencer'}/${graceEndsAt ? 'gracia' : 'sin-gracia'} @ ${now.toISOString()}`, () => {
              const row: Row = { status, plan, expiresAt, graceEndsAt };
              expect(matches(row, accessibleSubscriptionWhere(now))).toBe(
                hasPaidAccess(checkAccessStatus(row, now))
              );
            });
          }
        }
});

describe('dueExpiryNotice — los cinco avisos, por ventanas', () => {
  const s = sub(); // vence 15-oct-2027 12:00 CDMX
  const at = (iso: string) => new Date(iso);

  it('31 días antes no toca ningún aviso', () => {
    expect(dueExpiryNotice(s, at('2027-09-14T13:00:00Z'))).toBeNull();
  });
  it('30 y 8 días antes → T30', () => {
    expect(dueExpiryNotice(s, at('2027-09-15T13:00:00Z'))).toBe('T30');
    expect(dueExpiryNotice(s, at('2027-10-07T13:00:00Z'))).toBe('T30');
  });
  it('7 y 2 días antes → T7', () => {
    expect(dueExpiryNotice(s, at('2027-10-08T13:00:00Z'))).toBe('T7');
    expect(dueExpiryNotice(s, at('2027-10-13T13:00:00Z'))).toBe('T7');
  });
  it('1 día antes, y el mismo día antes de la hora de vencer → T1 («último día», nunca «ya expiró»)', () => {
    expect(dueExpiryNotice(s, at('2027-10-14T13:00:00Z'))).toBe('T1');
    expect(dueExpiryNotice(s, at('2027-10-15T13:00:00Z'))).toBe('T1');
  });
  it('ya vencido y dentro de la gracia → T0', () => {
    expect(dueExpiryNotice(s, at('2027-10-15T18:00:00Z'))).toBe('T0');
    expect(dueExpiryNotice(s, at('2027-10-21T13:00:00Z'))).toBe('T0');
  });
  it('terminó la gracia → GRACE_END durante una semana; después, nada', () => {
    expect(dueExpiryNotice(s, at('2027-10-22T18:00:00Z'))).toBe('GRACE_END');
    expect(dueExpiryNotice(s, at('2027-10-28T13:00:00Z'))).toBe('GRACE_END');
    expect(dueExpiryNotice(s, at('2027-10-29T19:00:00Z'))).toBeNull();
  });
  it('el Mensual y las filas no activas nunca reciben avisos de vigencia', () => {
    expect(dueExpiryNotice(sub({ plan: 'MONTHLY' }), at('2027-10-14T13:00:00Z'))).toBeNull();
    expect(dueExpiryNotice(sub({ status: 'CANCELED' }), at('2027-10-14T13:00:00Z'))).toBeNull();
  });
  it('la llave de idempotencia incluye la fecha de vigencia: tras extender, hay avisos nuevos', () => {
    expect(expiryNoticeKey('T30', s.expiresAt!)).toBe('T30:2027-10-15');
    expect(expiryNoticeKey('T30', calculateExtensionDate(s.expiresAt!))).toBe('T30:2028-04-15');
  });
  it('días de calendario en México, no múltiplos de 24 h desde ahora', () => {
    // 23:00 CDMX del 14 y 01:00 CDMX del 15 son días distintos.
    expect(mexicoCalendarDaysBetween(at('2027-10-15T05:00:00Z'), s.expiresAt!)).toBe(1);
    expect(mexicoCalendarDaysBetween(at('2027-10-15T07:00:00Z'), s.expiresAt!)).toBe(0);
  });
});

describe('evaluateExtensionEligibility — solo ACTIVE o GRACE, solo Básico/Premium', () => {
  const base = { id: 'sub1', ...sub() };

  it('vigente → se puede extender, sobre la fecha actual de vigencia', () => {
    const r = evaluateExtensionEligibility(base, new Date('2027-09-20T00:00:00Z'));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.accessStatus).toBe('ACTIVE');
      expect(r.priceCents).toBe(49_900);
      expect(r.newExpiresAt).toEqual(new Date('2028-04-15T18:00:00Z'));
      expect(r.newGraceEndsAt).toEqual(new Date('2028-04-22T18:00:00Z'));
    }
  });

  it('en gracia → se puede extender (los 6 meses cuentan desde que venció)', () => {
    const r = evaluateExtensionEligibility({ ...base, plan: 'PREMIUM' }, new Date('2027-10-18T00:00:00Z'));
    expect(r.ok && r.accessStatus).toBe('GRACE');
    expect(r.ok && r.priceCents).toBe(89_900);
    expect(r.ok && r.newExpiresAt).toEqual(new Date('2028-04-15T18:00:00Z'));
  });

  it('terminada la gracia → no (procede un plan nuevo)', () => {
    expect(evaluateExtensionEligibility(base, new Date('2027-10-23T00:00:00Z'))).toEqual({ ok: false, reason: 'EXPIRED' });
  });

  it('Mensual → no tiene extensión', () => {
    expect(
      evaluateExtensionEligibility({ ...base, plan: 'MONTHLY', expiresAt: null, graceEndsAt: null }, new Date())
    ).toEqual({ ok: false, reason: 'NOT_EXTENDABLE_PLAN' });
  });

  it('sin plan → no', () => {
    expect(evaluateExtensionEligibility(null, new Date())).toEqual({ ok: false, reason: 'NO_PLAN' });
  });
});

describe('migración: la suscripción real de producción conserva su acceso', () => {
  // Censo del 2026-10-23: 1 PREMIUM ACTIVE con vigencia 2027-07-25 (anterior a
  // G103, sin graceEndsAt). El backfill de 0019 solo agrega la gracia.
  const legacy = sub({ plan: 'PREMIUM', expiresAt: new Date('2027-07-25T16:23:44.603Z'), graceEndsAt: null });
  const backfilled = { ...legacy, graceEndsAt: new Date(legacy.expiresAt!.getTime() + 7 * DAY) };

  it('hoy sigue ACTIVE, antes y después del backfill', () => {
    const hoy = new Date('2026-10-23T12:00:00Z');
    expect(checkAccessStatus(legacy, hoy)).toBe('ACTIVE');
    expect(checkAccessStatus(backfilled, hoy)).toBe('ACTIVE');
  });

  it('el backfill no recorta ni alarga la vigencia: solo la gracia de 7 días que la regla da a todos', () => {
    expect(backfilled.expiresAt).toEqual(legacy.expiresAt);
    expect(backfilled.graceEndsAt).toEqual(calculateGraceEndsAt(legacy.expiresAt!));
  });
});
