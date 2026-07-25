import { describe, expect, it } from 'vitest';
import { daysSinceActivity, INACTIVITY_ALERT_DAYS, isInactiveStudent } from '@/lib/parent/inactivity';

describe('daysSinceActivity', () => {
  it('null si nunca hubo actividad', () => {
    expect(daysSinceActivity(null, new Date())).toBeNull();
  });

  it('0 si la actividad fue hoy mismo (dentro de 24h)', () => {
    const now = new Date('2027-03-10T12:00:00.000Z');
    expect(daysSinceActivity(new Date('2027-03-10T01:00:00.000Z'), now)).toBe(0);
  });

  it('cuenta días completos transcurridos', () => {
    const now = new Date('2027-03-10T12:00:00.000Z');
    expect(daysSinceActivity(new Date('2027-03-07T12:00:00.000Z'), now)).toBe(3);
  });
});

describe('isInactiveStudent', () => {
  const now = new Date('2027-03-10T12:00:00.000Z');

  it('el umbral es 3 días', () => {
    expect(INACTIVITY_ALERT_DAYS).toBe(3);
  });

  it('false sin actividad registrada aún (alumno nuevo, no "inactivo")', () => {
    expect(isInactiveStudent(null, now)).toBe(false);
  });

  it('false con 2 días — todavía no alcanza el umbral', () => {
    expect(isInactiveStudent(new Date('2027-03-08T12:00:00.000Z'), now)).toBe(false);
  });

  it('true exactamente a los 3 días (umbral inclusivo)', () => {
    expect(isInactiveStudent(new Date('2027-03-07T12:00:00.000Z'), now)).toBe(true);
  });

  it('true con más de 3 días', () => {
    expect(isInactiveStudent(new Date('2027-03-01T12:00:00.000Z'), now)).toBe(true);
  });
});
