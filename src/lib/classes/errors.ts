/**
 * Errores de dominio del marketplace de profesores — Bloque 2.
 *
 * Un solo tipo de error para las Server Actions, los Route Handlers y la capa
 * de datos, con un código ESTABLE que el cliente puede ramificar sin parsear el
 * mensaje. El mensaje va en la voz de la interfaz (español mexicano, explica qué
 * pasó y cómo seguir, sin disculpas excesivas — CLAUDE.md).
 */

export type MarketplaceErrorCode =
  /** El interruptor MARKETPLACE_OPEN está cerrado. */
  | 'MARKETPLACE_CLOSED'
  /** La venta está cerrada (interruptor de G98): una reserva cobra dinero. */
  | 'SALES_CLOSED'
  | 'VALIDATION'
  | 'NOT_FOUND'
  /** El estado actual de la clase/profesor no permite la operación. */
  | 'INVALID_STATE'
  /** Ya existe (solicitud duplicada, CURP repetida…). */
  | 'CONFLICT'
  /** El horario ya lo ocupa otra clase del profesor o del alumno. */
  | 'SLOT_TAKEN'
  | 'OUT_OF_AVAILABILITY'
  | 'TOO_SOON'
  /** El alumno es menor y su tutor aún no confirmó. */
  | 'TUTOR_CONSENT_REQUIRED'
  | 'BIRTHDATE_REQUIRED'
  /** El cobro con la tarjeta guardada no procedió: hay que pagar por Checkout. */
  | 'PAYMENT_ACTION_REQUIRED'
  | 'PAYMENT_FAILED'
  | 'RATE_LIMIT'
  | 'FORBIDDEN'
  | 'UNAUTHORIZED'
  | 'PAYWALL'
  /** Falla de un proveedor (Stripe, Google) o de la base: se reintenta. */
  | 'UPSTREAM';

const HTTP_STATUS: Record<MarketplaceErrorCode, number> = {
  MARKETPLACE_CLOSED: 503,
  SALES_CLOSED: 503,
  VALIDATION: 400,
  NOT_FOUND: 404,
  INVALID_STATE: 409,
  CONFLICT: 409,
  SLOT_TAKEN: 409,
  OUT_OF_AVAILABILITY: 422,
  TOO_SOON: 422,
  TUTOR_CONSENT_REQUIRED: 403,
  BIRTHDATE_REQUIRED: 403,
  PAYMENT_ACTION_REQUIRED: 402,
  PAYMENT_FAILED: 402,
  RATE_LIMIT: 429,
  FORBIDDEN: 403,
  UNAUTHORIZED: 401,
  PAYWALL: 402,
  UPSTREAM: 502,
};

export class MarketplaceError extends Error {
  readonly code: MarketplaceErrorCode;

  constructor(code: MarketplaceErrorCode, message: string) {
    super(message);
    this.name = 'MarketplaceError';
    this.code = code;
  }

  get status(): number {
    return HTTP_STATUS[this.code];
  }
}

export function httpStatusFor(code: MarketplaceErrorCode): number {
  return HTTP_STATUS[code];
}
