import { describe, expect, it } from 'vitest';
import { OnboardingStep, isOnboardingComplete } from '@/lib/onboarding/steps';

describe('isOnboardingComplete', () => {
  it('es falso antes del paso DONE', () => {
    expect(isOnboardingComplete(OnboardingStep.EXAM)).toBe(false);
    expect(isOnboardingComplete(OnboardingStep.AREA_CAREER)).toBe(false);
    expect(isOnboardingComplete(OnboardingStep.DIAGNOSTIC_INTRO)).toBe(false);
  });

  it('es verdadero en DONE y en cualquier valor mayor (defensivo ante datos futuros)', () => {
    expect(isOnboardingComplete(OnboardingStep.DONE)).toBe(true);
    expect(isOnboardingComplete(OnboardingStep.DONE + 1)).toBe(true);
  });

  it('los valores de los pasos son únicos y ascendentes', () => {
    const values = Object.values(OnboardingStep);
    expect(new Set(values).size).toBe(values.length);
    expect(values).toEqual([...values].sort((a, b) => a - b));
  });
});
