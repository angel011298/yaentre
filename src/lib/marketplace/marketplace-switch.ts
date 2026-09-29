/**
 * INTERRUPTOR DEL MARKETPLACE DE PROFESORES — Bloque 2, fase Early Bird.
 * Módulo PURO: decide si el marketplace está abierto a partir del entorno.
 *
 * ── Qué cierra y por qué existe ─────────────────────────────────────────────
 *
 * Premium «abre el acceso» a clases en vivo con profesores independientes
 * verificados en YaEntre (contexto maestro §3.2). Durante Early Bird el
 * directorio todavía no existe (spec §12: «Premium "Coming Soon", botón
 * desactivado, precio visible»), así que vender Premium hoy sería cobrar por un
 * acceso que no se puede usar.
 *
 * Igual que el interruptor de ventas de G98: **esconder el botón no cierra
 * nada**. `startCheckoutAction` es una Server Action y se invoca con un `fetch`.
 * El cierre vive en el SERVIDOR, y este módulo es su decisión.
 *
 * ── La regla que no se invierte ─────────────────────────────────────────────
 *
 * `MARKETPLACE_OPEN` ausente, vacía o distinta de `'true'` ⇒ CERRADO. Olvidar
 * una variable nunca puede abrir la venta de Premium ni las reservas de clase.
 *
 * Este interruptor es INDEPENDIENTE del de ventas: la venta de Básico puede
 * estar abierta con el marketplace cerrado (así arranca Early Bird), y abrir
 * el marketplace NO abre la venta — una reserva de clase cobra dinero, así que
 * además pasa por `salesGate()` (ver `booking.ts`).
 *
 * El módulo NO lee `process.env`: recibe un `MarketplaceEnv`. `readMarketplaceEnv`
 * es el único punto que lo toca.
 */

export interface MarketplaceEnv {
  /** `MARKETPLACE_OPEN` tal cual viene del entorno (puede faltar). */
  marketplaceOpen: string | undefined;
}

export type MarketplaceClosedReason = 'flag_off';

export type MarketplaceGate =
  | { open: true }
  | { open: false; reason: MarketplaceClosedReason };

export function evaluateMarketplaceGate(env: MarketplaceEnv): MarketplaceGate {
  if (env.marketplaceOpen === 'true') return { open: true };
  return { open: false, reason: 'flag_off' };
}

export function readMarketplaceEnv(): MarketplaceEnv {
  return { marketplaceOpen: process.env.MARKETPLACE_OPEN };
}

/** Código estable para el cliente: distingue «cerrado» de un error real. */
export const MARKETPLACE_CLOSED_CODE = 'MARKETPLACE_CLOSED';

/**
 * Copy de cara al alumno. Lenguaje obligatorio (contexto maestro §3.2/§8):
 * «profesores independientes verificados en YaEntre»; nunca «nuestros
 * profesores», nunca «próximamente» (el guardrail pide «Disponible pronto»).
 */
export const MARKETPLACE_CLOSED_MESSAGE =
  'El acceso a profesores independientes verificados en YaEntre estará disponible pronto. ' +
  'Mientras tanto puedes usar el plan Básico.';
