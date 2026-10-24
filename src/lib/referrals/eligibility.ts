/**
 * G103 (spec §8.4) — ¿una venta puede generar comisión de referido o aceptar
 * el descuento de Embajador? PURO.
 *
 * DECISIÓN FINAL: solo la venta de planes de admisión Básico (`SEASON_PASS`)
 * y Premium. El Mensual tampoco (spec QR). Cursos, clases en vivo de
 * cualquier pista y la extensión de vigencia NUNCA: con 25 % de comisión un
 * referido de $150 dejaría el neto negativo.
 *
 * El programa de referidos (spec QR) todavía no está implementado: esta regla
 * queda lista para que su primera línea la consulte. Mientras tanto, los
 * checkouts de cursos, clases y extensión validan su cuerpo con `.strict()`
 * (un `referralCode` o un `discountCode` se rechaza) y crean la sesión de
 * Stripe con `allow_promotion_codes: false`.
 */
export type SaleOrigin =
  | 'PLAN_SEASON_PASS'
  | 'PLAN_PREMIUM'
  | 'PLAN_MONTHLY'
  | 'ACCESS_EXTENSION'
  | 'COURSE'
  | 'CLASS_ADMISION'
  | 'CLASS_REGULARIZACION';

export function isReferralEligible(origin: SaleOrigin): boolean {
  return origin === 'PLAN_SEASON_PASS' || origin === 'PLAN_PREMIUM';
}
