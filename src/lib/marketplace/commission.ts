/**
 * G103 — comisión ÚNICA del marketplace (decisión de Ángel, 23-oct-2026):
 * YaEntre se queda el 25 % de todo lo que vende un profesor —clases en vivo de
 * cualquier pista y cursos pregrabados— y el profesor recibe el 75 %. Una sola
 * constante para clases y cursos: el contrato de comisión mercantil, la
 * liquidación y la explicación al profesor dicen lo mismo.
 *
 * Aritmética en CENTAVOS ENTEROS, en puntos base (1 % = 100 bps) para no
 * acumular flotantes. Redondeo documentado: la parte del profesor se redondea
 * al centavo más cercano (medio centavo hacia arriba) y YaEntre se queda con
 * el resto, así que `teacher + yaentre === total` SIEMPRE, sin centavos que
 * aparezcan o desaparezcan.
 */
export const MARKETPLACE_COMMISSION = {
  YAENTRE_RATE_BPS: 2_500,
  TEACHER_RATE_BPS: 7_500,
} as const;

export function splitMarketplaceRevenue(totalCents: number): { teacherCents: number; yaentreCents: number } {
  if (!Number.isInteger(totalCents) || totalCents < 0) {
    throw new Error(`Monto inválido para repartir: ${totalCents}`);
  }
  const teacherCents = Math.round((totalCents * MARKETPLACE_COMMISSION.TEACHER_RATE_BPS) / 10_000);
  return { teacherCents, yaentreCents: totalCents - teacherCents };
}
