import { describe, expect, it } from 'vitest';
import {
  ALERT_MIN_MINUTES_BEFORE_CLASS,
  AUTO_CANCEL_MIN_MINUTES_BEFORE_CLASS,
  CANCELLABLE_STATUSES,
  SLOT_HOLDING_STATUSES,
  TRANSITIONS,
  canTransition,
  checkCanRate,
  classHasStarted,
  computeCancellation,
  confirmationRequestDue,
  confirmationSchedule,
  disputeWindowOpen,
  meetingLinkDueAt,
  noShowDeclarable,
  paymentHoldExpired,
  recordingConsentGranted,
  recordingExpiry,
  studentCanCancel,
  type CancellationCause,
  type ClassStatusKey,
} from '@/lib/classes/policy';

const H = 3_600_000;
const T0 = new Date('2026-11-10T18:00:00Z'); // inicio de la clase
const before = (hours: number) => new Date(T0.getTime() - hours * H);

const ALL_STATUSES: ClassStatusKey[] = [
  'PENDING_PAYMENT', 'BOOKED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED',
  'CANCELLED', 'NO_SHOW_TEACHER', 'NO_SHOW_STUDENT', 'DISPUTED',
];

describe('máquina de estados', () => {
  it('enumera TODAS las transiciones legales (y solo esas)', () => {
    const legal: string[] = [];
    for (const from of ALL_STATUSES) for (const to of ALL_STATUSES) if (canTransition(from, to)) legal.push(`${from}→${to}`);
    expect(legal.sort()).toEqual(
      [
        'PENDING_PAYMENT→BOOKED', 'PENDING_PAYMENT→CANCELLED',
        'BOOKED→CONFIRMED', 'BOOKED→CANCELLED', 'BOOKED→NO_SHOW_TEACHER',
        'CONFIRMED→IN_PROGRESS', 'CONFIRMED→COMPLETED', 'CONFIRMED→CANCELLED',
        'CONFIRMED→NO_SHOW_TEACHER', 'CONFIRMED→NO_SHOW_STUDENT',
        'IN_PROGRESS→COMPLETED', 'IN_PROGRESS→DISPUTED',
        'COMPLETED→DISPUTED', 'NO_SHOW_TEACHER→DISPUTED', 'NO_SHOW_STUDENT→DISPUTED',
      ].sort()
    );
  });

  it('una clase cancelada NUNCA revive: un pago tardío no la reserva', () => {
    for (const to of ALL_STATUSES) expect(canTransition('CANCELLED', to)).toBe(false);
  });

  it('una clase completada no se cancela ni se vuelve a reservar', () => {
    expect(canTransition('COMPLETED', 'CANCELLED')).toBe(false);
    expect(canTransition('COMPLETED', 'BOOKED')).toBe(false);
  });

  it('ninguna transición apunta a sí misma ni retrocede a PENDING_PAYMENT', () => {
    for (const from of ALL_STATUSES) {
      expect(TRANSITIONS[from]).not.toContain(from);
      expect(TRANSITIONS[from]).not.toContain('PENDING_PAYMENT');
    }
  });

  it('solo las clases vivas ocupan horario, y solo esas se pueden cancelar', () => {
    expect([...SLOT_HOLDING_STATUSES].sort()).toEqual(['BOOKED', 'CONFIRMED', 'IN_PROGRESS', 'PENDING_PAYMENT']);
    expect([...CANCELLABLE_STATUSES].sort()).toEqual(['BOOKED', 'CONFIRMED', 'PENDING_PAYMENT']);
  });
});

describe('cancelación del ALUMNO (spec §6.7)', () => {
  const run = (hoursBefore: number, final = 30000) =>
    computeCancellation({ cause: 'STUDENT_REQUEST', paid: true, finalTariffCents: final, scheduledAt: T0, now: before(hoursBefore) });

  it('≥24 h antes: reembolso del 100%, no se retiene nada', () => {
    expect(run(24)).toEqual({ refundCents: 30000, retainedCents: 0, commissionCents: 0, teacherPayCents: 0, countsAgainstTeacher: false });
    expect(run(100).refundCents).toBe(30000);
  });

  it('<24 h antes: reembolso del 50%; lo retenido se reparte 25/75 (el profesor recibe 50% de SU parte)', () => {
    const r = run(23.99);
    expect(r.refundCents).toBe(15000);
    expect(r.retainedCents).toBe(15000);
    expect(r.commissionCents).toBe(3750);
    expect(r.teacherPayCents).toBe(11250);
    // 11 250 = 50% de los 22 500 que el profesor habría recibido de la clase completa.
    expect(r.teacherPayCents).toBe(22500 / 2);
  });

  it('el límite de 24 h es exacto: 24:00 es gratis, 23:59:59 no', () => {
    expect(run(24).refundCents).toBe(30000);
    const late = computeCancellation({ cause: 'STUDENT_REQUEST', paid: true, finalTariffCents: 30000, scheduledAt: T0, now: new Date(T0.getTime() - 24 * H + 1000) });
    expect(late.refundCents).toBe(15000);
  });

  it('la cancelación del alumno NO cuenta contra el profesor', () => {
    expect(run(2).countsAgainstTeacher).toBe(false);
  });

  it('con un monto impar el redondeo del 50% favorece a la parte retenida y no se pierde un centavo', () => {
    const r = run(1, 24701);
    expect(r.refundCents).toBe(12350);
    expect(r.retainedCents).toBe(12351);
  });
});

describe('cancelación por el lado del PROFESOR o del sistema', () => {
  const run = (cause: CancellationCause) =>
    computeCancellation({ cause, paid: true, finalTariffCents: 45000, scheduledAt: T0, now: before(1) });

  it.each(['TEACHER_REQUEST', 'TEACHER_NO_CONFIRMATION', 'TEACHER_NO_SHOW'] as const)(
    '%s: reembolso del 100% y CUENTA contra el profesor',
    (cause) => {
      expect(run(cause)).toEqual({ refundCents: 45000, retainedCents: 0, commissionCents: 0, teacherPayCents: 0, countsAgainstTeacher: true });
    }
  );

  it('el profesor que cancela una hora antes devuelve el 100% (la ventana de 24 h no lo protege a él)', () => {
    expect(run('TEACHER_REQUEST').refundCents).toBe(45000);
  });

  it('el no-show del ALUMNO: sin reembolso, todo retenido y repartido 25/75; NO cuenta contra el profesor', () => {
    expect(run('STUDENT_NO_SHOW')).toEqual({ refundCents: 0, retainedCents: 45000, commissionCents: 11250, teacherPayCents: 33750, countsAgainstTeacher: false });
  });

  it('un pago que nunca se confirmó no tiene cobro que devolver ni reparto, y NO castiga a nadie', () => {
    const r = computeCancellation({ cause: 'PAYMENT_TIMEOUT', paid: false, finalTariffCents: 45000, scheduledAt: T0, now: before(1) });
    expect(r).toEqual({ refundCents: 0, retainedCents: 0, commissionCents: 0, teacherPayCents: 0, countsAgainstTeacher: false });
  });

  it('sin cobro previo (paid=false) jamás se devuelve ni se retiene dinero, sea cual sea la causa', () => {
    for (const cause of ['STUDENT_REQUEST', 'TEACHER_REQUEST', 'STUDENT_NO_SHOW', 'TEACHER_NO_SHOW'] as const) {
      const r = computeCancellation({ cause, paid: false, finalTariffCents: 45000, scheduledAt: T0, now: before(1) });
      expect(r.refundCents + r.retainedCents + r.commissionCents + r.teacherPayCents).toBe(0);
    }
  });
});

describe('propiedades del reparto — ni un centavo se pierde ni se inventa', () => {
  it('para toda causa, monto y anticipación: refund + retained = cobrado, y commission + teacherPay = retained', () => {
    const causes: CancellationCause[] = ['STUDENT_REQUEST', 'TEACHER_REQUEST', 'TEACHER_NO_CONFIRMATION', 'TEACHER_NO_SHOW', 'STUDENT_NO_SHOW', 'PAYMENT_TIMEOUT'];
    for (const cause of causes)
      for (const final of [0, 1, 2, 3, 24700, 26000, 33333, 45000, 45001, 99999])
        for (const hours of [0.5, 5, 23.999, 24, 48, 500]) {
          const r = computeCancellation({ cause, paid: true, finalTariffCents: final, scheduledAt: T0, now: before(hours) });
          expect(r.refundCents + r.retainedCents).toBe(final);
          expect(r.commissionCents + r.teacherPayCents).toBe(r.retainedCents);
          for (const v of Object.values(r)) if (typeof v === 'number') expect(v).toBeGreaterThanOrEqual(0);
        }
  });

  it('la comisión nunca supera el 25% de lo retenido (redondeada a la mitad hacia arriba)', () => {
    for (let retained = 0; retained <= 3000; retained++) {
      const r = computeCancellation({ cause: 'STUDENT_NO_SHOW', paid: true, finalTariffCents: retained, scheduledAt: T0, now: before(1) });
      expect(r.commissionCents).toBeLessThanOrEqual(Math.ceil(retained * 0.25));
    }
  });
});

describe('studentCanCancel', () => {
  it('solo antes del inicio y solo en estados cancelables', () => {
    expect(studentCanCancel('BOOKED', T0, before(1))).toBe(true);
    expect(studentCanCancel('CONFIRMED', T0, before(1))).toBe(true);
    expect(studentCanCancel('PENDING_PAYMENT', T0, before(1))).toBe(true);
    expect(studentCanCancel('BOOKED', T0, T0)).toBe(false); // ya empezó
    expect(studentCanCancel('BOOKED', T0, new Date(T0.getTime() + H))).toBe(false);
    expect(studentCanCancel('COMPLETED', T0, before(50))).toBe(false);
    expect(studentCanCancel('CANCELLED', T0, before(50))).toBe(false);
  });
});

describe('confirmationSchedule (spec §6.4)', () => {
  it('reserva con anticipación: pide 24 h antes; alerta a las 4 h; cancela a las 12 h', () => {
    const s = confirmationSchedule(T0, before(100));
    expect(s.requestAt.getTime()).toBe(before(24).getTime());
    expect(s.alertAt.getTime()).toBe(before(24).getTime() + 4 * H);
    expect(s.autoCancelAt.getTime()).toBe(before(24).getTime() + 12 * H);
  });

  it('reserva de último minuto: la solicitud es de inmediato y los plazos se acotan al inicio de la clase', () => {
    const paidAt = before(3);
    const s = confirmationSchedule(T0, paidAt);
    expect(s.requestAt.getTime()).toBe(paidAt.getTime());
    expect(s.alertAt.getTime()).toBe(T0.getTime() - ALERT_MIN_MINUTES_BEFORE_CLASS * 60_000);
    expect(s.autoCancelAt.getTime()).toBe(T0.getTime() - AUTO_CANCEL_MIN_MINUTES_BEFORE_CLASS * 60_000);
  });

  it('propiedad: request ≤ alerta ≤ cancelación ≤ inicio, para cualquier anticipación ≥ 1 h', () => {
    for (const hours of [1, 1.5, 2, 3, 6, 12, 23, 24, 25, 47, 48, 72, 500]) {
      const s = confirmationSchedule(T0, before(hours));
      expect(s.requestAt.getTime()).toBeLessThanOrEqual(s.alertAt.getTime());
      expect(s.alertAt.getTime()).toBeLessThanOrEqual(s.autoCancelAt.getTime());
      expect(s.autoCancelAt.getTime()).toBeLessThanOrEqual(T0.getTime());
    }
  });

  it('nunca se pide confirmación antes de que la clase esté pagada', () => {
    const paidAt = before(10);
    expect(confirmationSchedule(T0, paidAt).requestAt.getTime()).toBeGreaterThanOrEqual(paidAt.getTime());
  });

  it('confirmationRequestDue respeta el borde de las 24 h', () => {
    expect(confirmationRequestDue(T0, before(200), before(24.01))).toBe(false);
    expect(confirmationRequestDue(T0, before(200), before(24))).toBe(true);
  });
});

describe('otros plazos', () => {
  it('el enlace de la clase se manda 15 min antes', () => {
    expect(meetingLinkDueAt(T0).getTime()).toBe(T0.getTime() - 15 * 60_000);
  });

  it('una reserva sin pagar suelta el horario a los 30 min (el mínimo de expiración de Checkout de Stripe)', () => {
    const created = new Date('2026-11-01T12:00:00Z');
    expect(paymentHoldExpired(created, new Date('2026-11-01T12:29:59Z'))).toBe(false);
    expect(paymentHoldExpired(created, new Date('2026-11-01T12:30:00Z'))).toBe(true);
  });

  it('un no-show solo se declara pasados 15 min del inicio; la clase «empezó» desde el inicio', () => {
    expect(noShowDeclarable(T0, new Date(T0.getTime() + 14 * 60_000))).toBe(false);
    expect(noShowDeclarable(T0, new Date(T0.getTime() + 15 * 60_000))).toBe(true);
    expect(classHasStarted(T0, before(0.01))).toBe(false);
    expect(classHasStarted(T0, T0)).toBe(true);
  });

  it('la ventana de disputa dura 48 h desde que se marcó como impartida', () => {
    const done = new Date('2026-11-10T19:00:00Z');
    expect(disputeWindowOpen(done, new Date(done.getTime() + 48 * H))).toBe(true);
    expect(disputeWindowOpen(done, new Date(done.getTime() + 48 * H + 1))).toBe(false);
  });
});

describe('checkCanRate (spec §6.6: 48 h para calificar)', () => {
  const completedAt = new Date('2026-11-10T19:00:00Z');
  const ok = { status: 'COMPLETED' as const, completedAt, ratedAt: null, rating: 5, now: new Date('2026-11-11T19:00:00Z') };

  it('permite calificar una clase completada dentro de la ventana', () => {
    expect(checkCanRate(ok)).toEqual({ ok: true });
  });

  it.each([
    ['clase no completada', { ...ok, status: 'BOOKED' as const }, 'NOT_COMPLETED'],
    ['sin fecha de cierre', { ...ok, completedAt: null }, 'NOT_COMPLETED'],
    ['ya calificada', { ...ok, ratedAt: new Date() }, 'ALREADY_RATED'],
    ['fuera de la ventana', { ...ok, now: new Date(completedAt.getTime() + 48 * H + 1) }, 'WINDOW_CLOSED'],
    ['calificación 0', { ...ok, rating: 0 }, 'INVALID_RATING'],
    ['calificación 6', { ...ok, rating: 6 }, 'INVALID_RATING'],
    ['calificación decimal', { ...ok, rating: 4.5 }, 'INVALID_RATING'],
    ['calificación NaN', { ...ok, rating: Number.NaN }, 'INVALID_RATING'],
  ])('rechaza: %s', (_n, input, reason) => {
    expect(checkCanRate(input)).toEqual({ ok: false, reason });
  });

  it('el borde de las 48 h es inclusivo', () => {
    expect(checkCanRate({ ...ok, now: new Date(completedAt.getTime() + 48 * H) })).toEqual({ ok: true });
  });
});

describe('consentimiento de grabación (contexto maestro §4.5)', () => {
  const base = { studentIsMinor: false, tutorRecordingConsent: false, adultRecordingConsent: false, teacherAcceptedRecordingPolicy: true };

  it('un ADULTO graba solo si él lo aceptó', () => {
    expect(recordingConsentGranted({ ...base, adultRecordingConsent: true })).toBe(true);
    expect(recordingConsentGranted({ ...base, adultRecordingConsent: false })).toBe(false);
  });

  it('un MENOR graba solo con el consentimiento del TUTOR; el suyo propio no cuenta', () => {
    expect(recordingConsentGranted({ ...base, studentIsMinor: true, tutorRecordingConsent: true })).toBe(true);
    expect(recordingConsentGranted({ ...base, studentIsMinor: true, tutorRecordingConsent: false, adultRecordingConsent: true })).toBe(false);
  });

  it('el consentimiento del tutor no se puede sustituir por el del alumno adulto ni al revés', () => {
    expect(recordingConsentGranted({ ...base, studentIsMinor: false, tutorRecordingConsent: true, adultRecordingConsent: false })).toBe(false);
  });

  it('sin la aceptación de la política por parte del PROFESOR no se graba, aunque el alumno consienta', () => {
    expect(recordingConsentGranted({ ...base, adultRecordingConsent: true, teacherAcceptedRecordingPolicy: false })).toBe(false);
  });

  it('enumeración: 16 combinaciones, solo se graba cuando el consentimiento correcto Y la política del profesor están', () => {
    for (const minor of [true, false])
      for (const tutor of [true, false])
        for (const adult of [true, false])
          for (const teacher of [true, false]) {
            const expected = teacher && (minor ? tutor : adult);
            expect(recordingConsentGranted({ studentIsMinor: minor, tutorRecordingConsent: tutor, adultRecordingConsent: adult, teacherAcceptedRecordingPolicy: teacher })).toBe(expected);
          }
  });

  it('el vencimiento suma los días de retención al fin de la clase', () => {
    expect(recordingExpiry(new Date('2026-11-10T19:00:00Z'), 30).toISOString()).toBe('2026-12-10T19:00:00.000Z');
  });

  it('exige un número de días entero y positivo (no hay retención «por defecto»)', () => {
    for (const bad of [0, -1, 1.5, Number.NaN]) expect(() => recordingExpiry(new Date(), bad)).toThrow();
  });
});
