import Link from 'next/link';
import { earlyBirdLicensesRemainingSafe, resolveEffectiveSeasonSafe } from '@/lib/db/billing';
import { EARLY_BIRD_LICENSE_LIMIT, getPlanPricing } from '@/lib/stripe/pricing';

function formatMxn(cents: number): string {
  return (cents / 100).toLocaleString('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  });
}

/**
 * Banner Early Bird (F10 Task 1): conteo REAL de licencias restantes —
 * reusa `earlyBirdLicensesRemainingSafe`/`resolveEffectiveSeasonSafe` de F9,
 * no duplica el cálculo. Si el cupo ya se agotó (o la fecha ya no es Early
 * Bird), la temporada efectiva cae a otra y el banner se oculta por
 * completo — nunca promete un precio que ya no aplica. Igual se oculta si la
 * DB no responde (build o caída transitoria): sin dato real, no se muestra
 * ningún número en vez de arriesgar uno inventado.
 */
export async function EarlyBirdBanner() {
  const season = await resolveEffectiveSeasonSafe(new Date());
  if (season !== 'EARLY_BIRD') return null;

  const remaining = await earlyBirdLicensesRemainingSafe();
  if (remaining === null) return null;

  const eb = getPlanPricing('SEASON_PASS', 'EARLY_BIRD');
  const regular = getPlanPricing('SEASON_PASS', 'HIGH_SEASON');

  return (
    <section className="bg-brand">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 py-4 text-center text-white sm:flex-row sm:justify-between sm:px-6 sm:text-left">
        <div>
          <p className="font-display text-base font-bold sm:text-lg">
            🏅 Promoción Early Bird — quedan {remaining} de {EARLY_BIRD_LICENSE_LIMIT} licencias
            fundadoras
          </p>
          <p className="text-sm text-white/85">
            Pase de Temporada:{' '}
            <span className="font-bold">{formatMxn(eb.amountMxn)}</span>{' '}
            <span className="text-white/60 line-through">{formatMxn(regular.amountMxn)}</span> ·
            precio congelado para tu ciclo
          </p>
        </div>
        <Link
          href="/registro"
          className="inline-flex min-h-touch min-w-touch items-center justify-center whitespace-nowrap rounded-md bg-white px-4 py-2 text-sm font-semibold text-brand shadow-md transition-all hover:bg-white/90 active:scale-[0.97]"
        >
          Asegurar mi lugar
        </Link>
      </div>
    </section>
  );
}
