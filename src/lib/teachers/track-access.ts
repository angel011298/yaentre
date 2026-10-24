import type { ClassTrack } from '@prisma/client';
import { regularizacionClassesOn, type MarketplaceFlags } from '@/lib/marketplace/flags';

/**
 * G103 — ¿quién puede reservar cada pista? (spec §2.10, §7.1b). Módulo PURO,
 * y el servidor lo aplica en CADA reserva: esconder la pista en la interfaz no
 * cierra nada.
 *
 *  - ADMISION: solo con Premium con acceso vigente (ACTIVE o en gracia). Regla
 *    inviolable del CONTEXTO §3.2: Premium ABRE el acceso a las clases; no las
 *    incluye — la clase se cobra aparte.
 *  - REGULARIZACION: cualquier cuenta registrada.
 *    ⚠️ DECISIÓN ABIERTA de Ángel (spec §8.5 «pendiente (b)»): si se decide
 *    exigir un plan también aquí, se cambia `REGULARIZACION_REQUIRES_PREMIUM`.
 *  - En las dos: el alumno declara ser mayor de edad. Para menores de 18 la
 *    spec exige el consentimiento del tutor por liga, y ese flujo todavía no
 *    existe (bloque 1 del CONTEXTO): mientras no exista, un menor NO reserva.
 */
export const REGULARIZACION_REQUIRES_PREMIUM = false;

export type TrackDenial = 'TRACK_DISABLED' | 'PREMIUM_REQUIRED' | 'ADULT_DECLARATION_REQUIRED';

export type TrackDecision = { allowed: true } | { allowed: false; reason: TrackDenial };

export function canBookTrack(input: {
  track: ClassTrack;
  flags: MarketplaceFlags;
  hasPremiumAccess: boolean;
  adultDeclared: boolean;
}): TrackDecision {
  if (!input.flags.liveClasses) return { allowed: false, reason: 'TRACK_DISABLED' };
  if (input.track === 'REGULARIZACION' && !regularizacionClassesOn(input.flags)) {
    return { allowed: false, reason: 'TRACK_DISABLED' };
  }
  const needsPremium = input.track === 'ADMISION' || REGULARIZACION_REQUIRES_PREMIUM;
  if (needsPremium && !input.hasPremiumAccess) return { allowed: false, reason: 'PREMIUM_REQUIRED' };
  if (!input.adultDeclared) return { allowed: false, reason: 'ADULT_DECLARATION_REQUIRED' };
  return { allowed: true };
}

/** ¿Puede VER la pista en el directorio? (sin la declaración de edad). */
export function canSeeTrack(track: ClassTrack, flags: MarketplaceFlags): boolean {
  if (!flags.liveClasses) return false;
  return track === 'ADMISION' || regularizacionClassesOn(flags);
}

export const TRACK_DENIAL_MESSAGES: Record<TrackDenial, string> = {
  TRACK_DISABLED: 'Las clases de esta sección todavía no están disponibles.',
  PREMIUM_REQUIRED:
    'Las clases de preparación para el examen de admisión son para alumnos con plan Premium. Premium abre el acceso al directorio; cada clase se paga aparte.',
  ADULT_DECLARATION_REQUIRED:
    'Para reservar necesitamos que confirmes que eres mayor de edad. Si tienes menos de 18 años, por ahora no puedes reservar clases desde tu cuenta.',
};

/**
 * Declaración de mayoría de edad al reservar.
 * TODO-CLO: texto definitivo y, para menores, el consentimiento del tutor por
 * liga (CONTEXTO §3.1). Con la versión `TODO-CLO…`, en producción la reserva se
 * rechaza (`legal-gate.ts`).
 */
export const ADULT_DECLARATION = {
  version: 'TODO-CLO-declaracion-mayoria-de-edad',
  text: 'Declaro que tengo 18 años o más.',
} as const;
