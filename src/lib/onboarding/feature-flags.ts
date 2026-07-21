import type { InstitutionCode, LevelType } from '@prisma/client';

/**
 * Gating de instituciones/niveles del Paso 1 de onboarding por feature flag
 * (ver CLAUDE.md → Feature flags). UNAM e IPN Superior están siempre
 * disponibles — son el único contenido real al lanzamiento (6 ene 2027).
 * Módulo puro: recibe las flags como parámetro para ser testeable sin mockear
 * `process.env`; `readFeatureFlags()` es el único punto que lee el entorno.
 */
export interface FeatureFlags {
  enableUAM: boolean;
  enableExani: boolean;
  enableMediaSuperior: boolean;
}

export function readFeatureFlags(): FeatureFlags {
  return {
    enableUAM: process.env.NEXT_PUBLIC_ENABLE_UAM === 'true',
    enableExani: process.env.NEXT_PUBLIC_ENABLE_EXANI === 'true',
    enableMediaSuperior: process.env.NEXT_PUBLIC_ENABLE_MEDIA_SUPERIOR === 'true',
  };
}

export function isInstitutionEnabled(code: InstitutionCode, flags: FeatureFlags): boolean {
  switch (code) {
    case 'UNAM':
    case 'IPN':
      return true;
    case 'UAM':
      return flags.enableUAM;
    case 'CENEVAL':
      return flags.enableExani;
    default:
      // CNBV u otro código futuro no contemplado en el onboarding.
      return false;
  }
}

export function isLevelEnabled(type: LevelType, flags: FeatureFlags): boolean {
  if (type === 'MEDIA_SUPERIOR') return flags.enableMediaSuperior;
  return true; // SUPERIOR siempre permitido (sujeto a la flag de institución)
}

/** Punto único de gating para una combinación institución+nivel del Paso 1. */
export function isExamOptionEnabled(
  institutionCode: InstitutionCode,
  levelType: LevelType,
  flags: FeatureFlags = readFeatureFlags()
): boolean {
  return isInstitutionEnabled(institutionCode, flags) && isLevelEnabled(levelType, flags);
}
