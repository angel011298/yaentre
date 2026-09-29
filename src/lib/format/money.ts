/**
 * Formato de dinero para las pantallas de administración y fiscales. Los
 * importes viajan SIEMPRE como centavos enteros; se convierten a texto solo aquí,
 * al pintarlos. Siempre con dos decimales: en un tablero fiscal «$1,350» y
 * «$1,350.00» no se leen igual, y una cifra que parece redonda esconde centavos.
 */
export function formatMxnExact(cents: number): string {
  return (cents / 100).toLocaleString('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
