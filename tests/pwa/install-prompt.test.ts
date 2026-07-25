import { describe, expect, it } from 'vitest';
import { shouldShowInstallPrompt } from '@/lib/pwa/install-prompt';

const NOW = new Date('2027-01-15T12:00:00.000Z').getTime();

describe('shouldShowInstallPrompt', () => {
  it('false en la primera visita', () => {
    expect(
      shouldShowInstallPrompt({ visitCount: 1, dismissedAt: null, isStandalone: false, now: NOW })
    ).toBe(false);
  });

  it('true en la segunda visita, nunca descartado antes', () => {
    expect(
      shouldShowInstallPrompt({ visitCount: 2, dismissedAt: null, isStandalone: false, now: NOW })
    ).toBe(true);
  });

  it('true en visitas posteriores también', () => {
    expect(
      shouldShowInstallPrompt({ visitCount: 10, dismissedAt: null, isStandalone: false, now: NOW })
    ).toBe(true);
  });

  it('false si ya está instalada (modo standalone), sin importar visitas', () => {
    expect(
      shouldShowInstallPrompt({ visitCount: 5, dismissedAt: null, isStandalone: true, now: NOW })
    ).toBe(false);
  });

  it('false justo después de descartarlo', () => {
    expect(
      shouldShowInstallPrompt({ visitCount: 3, dismissedAt: NOW - 1000, isStandalone: false, now: NOW })
    ).toBe(false);
  });

  it('false a los 6 días de descartado (todavía dentro del cooldown)', () => {
    const sixDaysMs = 6 * 24 * 3600 * 1000;
    expect(
      shouldShowInstallPrompt({
        visitCount: 3,
        dismissedAt: NOW - sixDaysMs,
        isStandalone: false,
        now: NOW,
      })
    ).toBe(false);
  });

  it('true exactamente a los 7 días de descartado (borde inclusivo)', () => {
    const sevenDaysMs = 7 * 24 * 3600 * 1000;
    expect(
      shouldShowInstallPrompt({
        visitCount: 3,
        dismissedAt: NOW - sevenDaysMs,
        isStandalone: false,
        now: NOW,
      })
    ).toBe(true);
  });

  it('true bastante después de 7 días', () => {
    const twentyDaysMs = 20 * 24 * 3600 * 1000;
    expect(
      shouldShowInstallPrompt({
        visitCount: 3,
        dismissedAt: NOW - twentyDaysMs,
        isStandalone: false,
        now: NOW,
      })
    ).toBe(true);
  });
});
