import { describe, expect, it } from 'vitest';
import { startOfMexicoDay } from '@/lib/paywall/mexico-time';

describe('startOfMexicoDay — reinicio a medianoche en huso de México (UTC-6 fijo)', () => {
  it('las 23:30 de México (05:30 UTC del día siguiente) siguen dentro del día que empezó ayer', () => {
    // 22 jul 05:30 UTC == 21 jul 23:30 México.
    const now = new Date('2026-07-22T05:30:00Z');
    expect(startOfMexicoDay(now)).toEqual(new Date('2026-07-21T06:00:00Z'));
  });

  it('exactamente en la medianoche de México, devuelve el mismo instante', () => {
    const midnight = new Date('2026-07-21T06:00:00Z'); // 21 jul 00:00 México
    expect(startOfMexicoDay(midnight)).toEqual(midnight);
  });

  it('un segundo antes de medianoche de México sigue perteneciendo al día anterior', () => {
    const justBefore = new Date('2026-07-21T05:59:59Z'); // 20 jul 23:59:59 México
    expect(startOfMexicoDay(justBefore)).toEqual(new Date('2026-07-20T06:00:00Z'));
  });

  it('es idempotente', () => {
    const now = new Date('2026-07-22T14:00:00Z');
    const once = startOfMexicoDay(now);
    expect(startOfMexicoDay(once)).toEqual(once);
  });

  it('24h después cae exactamente en el siguiente reinicio (sin horario de verano)', () => {
    const now = new Date('2026-07-22T14:00:00Z');
    const tomorrow = new Date(now.getTime() + 24 * 3600 * 1000);
    const diff = startOfMexicoDay(tomorrow).getTime() - startOfMexicoDay(now).getTime();
    expect(diff).toBe(24 * 3600 * 1000);
  });
});
