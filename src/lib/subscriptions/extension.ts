import type { SubscriptionPlan, SubscriptionStatus } from '@prisma/client';
import { checkAccessStatus, type AccessStatus } from './access-check';
import { calculateExtensionDate, calculateGraceEndsAt, extensionPriceCents } from './access-duration';

/**
 * G103 — ¿se puede comprar la extensión de 6 meses? Módulo PURO.
 *
 * Reglas (spec §3.3, §7.3):
 *  - solo Básico (`SEASON_PASS`) y Premium — el Mensual se renueva por Stripe;
 *  - solo con el acceso en ACTIVE o GRACE: después de la gracia lo que procede
 *    es comprar un plan completo, no extender uno terminado;
 *  - precio FIJO (`ACCESS_DURATION.EXTENSION_PRICE_CENTS`), sin temporada;
 *  - nunca gratis: no hay camino que extienda sin un pago confirmado por el
 *    webhook (la extensión regalada sería una cortesía del admin maestro).
 */

export interface ExtendableSubscription {
  id: string;
  status: SubscriptionStatus;
  plan: SubscriptionPlan;
  expiresAt: Date | null;
  graceEndsAt: Date | null;
}

export type ExtensionDenial = 'NO_PLAN' | 'NOT_EXTENDABLE_PLAN' | 'EXPIRED';

export type ExtensionEligibility =
  | {
      ok: true;
      accessStatus: Extract<AccessStatus, 'ACTIVE' | 'GRACE'>;
      priceCents: number;
      currentExpiresAt: Date;
      newExpiresAt: Date;
      newGraceEndsAt: Date;
    }
  | { ok: false; reason: ExtensionDenial };

export function evaluateExtensionEligibility(
  sub: ExtendableSubscription | null,
  now: Date
): ExtensionEligibility {
  if (!sub) return { ok: false, reason: 'NO_PLAN' };
  const price = extensionPriceCents(sub.plan);
  if (price === null || !sub.expiresAt) return { ok: false, reason: 'NOT_EXTENDABLE_PLAN' };

  const status = checkAccessStatus(sub, now);
  if (status !== 'ACTIVE' && status !== 'GRACE') {
    return { ok: false, reason: status === 'NONE' ? 'NO_PLAN' : 'EXPIRED' };
  }

  const newExpiresAt = calculateExtensionDate(sub.expiresAt);
  return {
    ok: true,
    accessStatus: status,
    priceCents: price,
    currentExpiresAt: sub.expiresAt,
    newExpiresAt,
    newGraceEndsAt: calculateGraceEndsAt(newExpiresAt),
  };
}

export const EXTENSION_DENIAL_MESSAGES: Record<ExtensionDenial, string> = {
  NO_PLAN: 'No encontramos un plan activo que extender.',
  NOT_EXTENDABLE_PLAN:
    'Tu plan Mensual se renueva solo cada mes, así que no necesita extensión.',
  EXPIRED:
    'Tu periodo de gracia ya terminó. Para volver a entrar elige un plan nuevo; tu progreso sigue guardado.',
};

/**
 * Texto de la casilla de consentimiento del art. 56 LFPC para la extensión.
 * Es el texto de CONTEXTO_YAENTRE_HANDOFF §3.4 tal cual (acceso a YaEntre que
 * se activa de inmediato) — no se redactó uno nuevo.
 * TODO-CLO: confirmar que el texto del checkout de planes cubre la extensión
 * o entregar una versión específica; cambiar entonces `version`.
 */
export const EXTENSION_IMMEDIATE_ACCESS_CONSENT = {
  version: 'art56-planes-v1',
  text: 'Entiendo que mi acceso a YaEntre se activa de inmediato al confirmarse el pago, y solicito expresamente que así sea. Acepto que, por tratarse de un servicio que se presta de inmediato, no aplica el derecho de revocación del artículo 56 de la Ley Federal de Protección al Consumidor.',
} as const;
