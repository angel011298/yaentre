import { describe, expect, it } from 'vitest';
import {
  isExamOptionEnabled,
  isInstitutionEnabled,
  isLevelEnabled,
  type FeatureFlags,
} from '@/lib/onboarding/feature-flags';

const allOff: FeatureFlags = { enableUAM: false, enableExani: false, enableMediaSuperior: false };
const allOn: FeatureFlags = { enableUAM: true, enableExani: true, enableMediaSuperior: true };

describe('isInstitutionEnabled', () => {
  it('UNAM e IPN siempre están habilitadas, sin importar las flags', () => {
    expect(isInstitutionEnabled('UNAM', allOff)).toBe(true);
    expect(isInstitutionEnabled('IPN', allOff)).toBe(true);
  });

  it('UAM y CENEVAL respetan su propia flag', () => {
    expect(isInstitutionEnabled('UAM', allOff)).toBe(false);
    expect(isInstitutionEnabled('UAM', allOn)).toBe(true);
    expect(isInstitutionEnabled('CENEVAL', allOff)).toBe(false);
    expect(isInstitutionEnabled('CENEVAL', allOn)).toBe(true);
  });

  it('CNBV (no contemplado en el onboarding) nunca está habilitada', () => {
    expect(isInstitutionEnabled('CNBV', allOn)).toBe(false);
  });
});

describe('isLevelEnabled', () => {
  it('SUPERIOR siempre está habilitado', () => {
    expect(isLevelEnabled('SUPERIOR', allOff)).toBe(true);
  });

  it('MEDIA_SUPERIOR respeta su propia flag', () => {
    expect(isLevelEnabled('MEDIA_SUPERIOR', allOff)).toBe(false);
    expect(isLevelEnabled('MEDIA_SUPERIOR', allOn)).toBe(true);
  });
});

describe('isExamOptionEnabled', () => {
  it('UNAM Superior e IPN Superior están disponibles con todas las flags apagadas', () => {
    expect(isExamOptionEnabled('UNAM', 'SUPERIOR', allOff)).toBe(true);
    expect(isExamOptionEnabled('IPN', 'SUPERIOR', allOff)).toBe(true);
  });

  it('UAM Superior requiere la flag de UAM', () => {
    expect(isExamOptionEnabled('UAM', 'SUPERIOR', allOff)).toBe(false);
    expect(isExamOptionEnabled('UAM', 'SUPERIOR', { ...allOff, enableUAM: true })).toBe(true);
  });

  it('Media Superior de una institución habilitada requiere también la flag de nivel', () => {
    expect(isExamOptionEnabled('UNAM', 'MEDIA_SUPERIOR', allOff)).toBe(false);
    expect(
      isExamOptionEnabled('UNAM', 'MEDIA_SUPERIOR', { ...allOff, enableMediaSuperior: true })
    ).toBe(true);
  });

  it('una institución apagada bloquea incluso si el nivel está permitido', () => {
    expect(
      isExamOptionEnabled('UAM', 'SUPERIOR', { ...allOn, enableUAM: false })
    ).toBe(false);
  });
});
