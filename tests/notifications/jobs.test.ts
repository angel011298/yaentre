import { describe, expect, it } from 'vitest';
import { isMondayInMexico } from '@/lib/notifications/schedule';

describe('isMondayInMexico', () => {
  it('true un lunes a mediodía México (UTC-6)', () => {
    // 2027-01-04 es lunes. 12:00 México = 18:00 UTC.
    expect(isMondayInMexico(new Date('2027-01-04T18:00:00.000Z'))).toBe(true);
  });

  it('false un domingo', () => {
    expect(isMondayInMexico(new Date('2027-01-03T18:00:00.000Z'))).toBe(false);
  });

  it('sigue siendo lunes en México a las 23:30 lunes (05:30 UTC del martes)', () => {
    // 2027-01-04 23:30 México = 2027-01-05 05:30 UTC — todavía lunes calendario México.
    expect(isMondayInMexico(new Date('2027-01-05T05:30:00.000Z'))).toBe(true);
  });

  it('ya es martes a las 00:30 México del martes (06:30 UTC)', () => {
    expect(isMondayInMexico(new Date('2027-01-05T06:30:00.000Z'))).toBe(false);
  });
});
