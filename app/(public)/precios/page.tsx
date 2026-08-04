import type { Metadata } from 'next';
import type { SubscriptionPlan } from '@prisma/client';
import { PublicPageShell } from '@/components/marketing/PublicPageShell';
import { PixelPageView } from '@/components/marketing/PixelPageView';
import { LinkButton } from '@/components/ui/LinkButton';
import { resolveEffectiveSeasonSafe } from '@/lib/db/billing';
import { getPlanPricing, type PlanPricing } from '@/lib/stripe/pricing';

// La temporada efectiva (Early Bird vs. regular) depende de compras reales —
// sin esto, el precio quedaría congelado en el estado del momento del build.
export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Precios — Acierta',
  description:
    'Free, Mensual, Pase de Temporada o Premium Garantía. Compara qué incluye cada plan de Acierta para prepararte a tu examen de admisión.',
  alternates: { canonical: '/precios' },
};

const PAID_PLANS: SubscriptionPlan[] = ['MONTHLY', 'SEASON_PASS', 'PREMIUM'];

const PLAN_LABEL: Record<SubscriptionPlan, string> = {
  MONTHLY: 'Mensual',
  SEASON_PASS: 'Pase de Temporada ⭐',
  PREMIUM: 'Premium Garantía',
};

/** Tabla de features EXACTA a la matriz del PRD §9 "Qué incluye cada plan" —
 *  no se reordena ni se reinterpreta ninguna celda. */
const FEATURE_ROWS: Array<{ feature: string; free: string; monthly: string; seasonPass: string; premium: string }> = [
  { feature: 'Diagnóstico inicial', free: '✅', monthly: '✅', seasonPass: '✅', premium: '✅' },
  { feature: 'Reactivos ilimitados (Drill)', free: '❌ 10/día', monthly: '✅', seasonPass: '✅', premium: '✅' },
  {
    feature: 'Simulacros completos',
    free: '1 (30 reactivos)',
    monthly: '✅ ilimitados',
    seasonPass: '✅ ilimitados',
    premium: '✅ ilimitados',
  },
  {
    feature: 'Simulador fullscreen (120/140 reactivos)',
    free: '❌',
    monthly: '✅',
    seasonPass: '✅',
    premium: '✅',
  },
  { feature: 'Resolución por capas', free: 'Capa 1 solo', monthly: '✅ todas', seasonPass: '✅ todas', premium: '✅ todas' },
  { feature: 'Dashboard del alumno', free: 'Básico', monthly: '✅ completo', seasonPass: '✅ completo', premium: '✅ completo' },
  { feature: 'Aciertómetro', free: '❌', monthly: '✅', seasonPass: '✅', premium: '✅' },
  { feature: 'Dashboard parental', free: '❌', monthly: '❌', seasonPass: '✅', premium: '✅' },
  { feature: 'Gamificación completa', free: 'Parcial', monthly: '✅', seasonPass: '✅', premium: '✅' },
  {
    feature: 'Vigencia',
    free: 'Siempre',
    monthly: 'Mensual renovable',
    seasonPass: 'Hasta el día del examen',
    premium: 'Hasta el día del examen',
  },
  { feature: 'Garantía de reembolso', free: '❌', monthly: '❌', seasonPass: '❌', premium: '✅ si no ingresa' },
  { feature: 'Tutorías (Fase 2)', free: '❌', monthly: '❌', seasonPass: '❌', premium: 'Prioritario' },
];

function formatMxn(cents: number): string {
  return (cents / 100).toLocaleString('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  });
}

function PriceTag({ pricing, regular }: { pricing: PlanPricing; regular: PlanPricing | null }) {
  return (
    <div>
      {regular && (
        <p className="text-sm text-text-muted line-through">{formatMxn(regular.amountMxn)}</p>
      )}
      <p className="font-display text-2xl font-bold text-text-primary">
        {formatMxn(pricing.amountMxn)}
        {pricing.isRecurring && <span className="text-sm font-normal text-text-muted">/mes</span>}
      </p>
    </div>
  );
}

export default async function PreciosPage() {
  // Variante resiliente: si la DB no responde (build, caída transitoria),
  // degrada a HIGH_SEASON en vez de romper la página — ver billing.ts.
  const season = await resolveEffectiveSeasonSafe(new Date());
  const isEarlyBird = season === 'EARLY_BIRD';

  const pricing = Object.fromEntries(
    PAID_PLANS.map((plan) => [plan, getPlanPricing(plan, season)])
  ) as Record<SubscriptionPlan, PlanPricing>;

  const regularPricing = isEarlyBird
    ? (Object.fromEntries(
        PAID_PLANS.map((plan) => [plan, getPlanPricing(plan, 'HIGH_SEASON')])
      ) as Record<SubscriptionPlan, PlanPricing>)
    : null;

  return (
    <PublicPageShell>
      <PixelPageView />
      <section className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 sm:py-20">
        <h1 className="font-display text-4xl font-bold text-text-primary">
          Elige el plan que te lleve hasta el examen
        </h1>
        <p className="mt-3 text-lg text-text-secondary">
          Empieza gratis. Sube de plan cuando estés listo — sin compromiso.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-border-subtle bg-surface p-6">
            <p className="font-display text-lg font-bold text-text-primary">Free</p>
            <p className="mt-2 font-display text-2xl font-bold text-text-primary">$0</p>
            <p className="mt-1 text-sm text-text-muted">Siempre gratis</p>
            <LinkButton href="/registro" variant="secondary" className="mt-4 w-full">
              Empieza gratis
            </LinkButton>
          </div>

          {PAID_PLANS.map((plan) => (
            <div
              key={plan}
              className={`rounded-lg border p-6 ${
                plan === 'SEASON_PASS'
                  ? 'border-2 border-brand shadow-lg'
                  : 'border-border-subtle bg-surface'
              }`}
            >
              <p className="font-display text-lg font-bold text-text-primary">{PLAN_LABEL[plan]}</p>
              <div className="mt-2">
                <PriceTag pricing={pricing[plan]} regular={regularPricing?.[plan] ?? null} />
              </div>
              <p className="mt-1 text-sm text-text-muted">
                {pricing[plan].isRecurring ? 'Renovación mensual' : 'Pago único'}
              </p>
              <LinkButton
                href="/registro"
                variant={plan === 'SEASON_PASS' ? 'primary' : 'secondary'}
                className="mt-4 w-full"
              >
                Crear cuenta gratis
              </LinkButton>
            </div>
          ))}
        </div>
        <p className="mt-4 text-center text-sm text-text-muted">
          Creas tu cuenta gratis primero — eliges y pagas tu plan dentro de la app cuando quieras.
        </p>
      </section>

      <section className="pb-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center font-display text-2xl font-bold text-text-primary">
            Qué incluye cada plan
          </h2>

          <div className="mt-8 overflow-x-auto rounded-lg border border-border-subtle">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead>
                <tr className="bg-elevated">
                  <th className="p-4 font-semibold text-text-primary">Feature</th>
                  <th className="p-4 font-semibold text-text-primary">Free</th>
                  <th className="p-4 font-semibold text-text-primary">Mensual</th>
                  <th className="p-4 font-semibold text-brand">Pase ⭐</th>
                  <th className="p-4 font-semibold text-text-primary">Premium</th>
                </tr>
              </thead>
              <tbody>
                {FEATURE_ROWS.map((row, i) => (
                  <tr
                    key={row.feature}
                    className={`border-t border-border-subtle ${i % 2 === 1 ? 'bg-elevated/40' : ''}`}
                  >
                    <td className="p-4 font-medium text-text-primary">{row.feature}</td>
                    <td className="p-4 text-text-secondary">{row.free}</td>
                    <td className="p-4 text-text-secondary">{row.monthly}</td>
                    <td className="p-4 text-text-secondary">{row.seasonPass}</td>
                    <td className="p-4 text-text-secondary">{row.premium}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </PublicPageShell>
  );
}
