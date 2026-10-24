import type { Metadata } from 'next';
import type { SubscriptionPlan } from '@prisma/client';
import { PublicPageShell } from '@/components/marketing/PublicPageShell';
import { PixelPageView } from '@/components/marketing/PixelPageView';
import { LinkButton } from '@/components/ui/LinkButton';
import { getSiteUrl } from '@/lib/auth/site-url';
import { resolveEffectiveSeasonSafe } from '@/lib/db/billing';
import { JsonLd } from '@/lib/seo/JsonLd';
import { openGraphFor } from '@/lib/seo/metadata';
import { productJsonLd, type ProductOffer } from '@/lib/seo/structured-data';
import { getPlanPricing, planLabel, type PlanPricing } from '@/lib/stripe/pricing';
import { Icon } from '@/components/ui/Icon';

// La temporada efectiva (Early Bird vs. regular) depende de compras reales —
// sin esto, el precio quedaría congelado en el estado del momento del build.
//
// 600 s y no 60 s por el mismo motivo que en la página principal: cada
// regeneración cuenta como «ISR Write» y el plan gratuito de Vercel pausa la
// cuenta entera al pasar de 200 000 en 30 días.
export const revalidate = 600;

export const metadata: Metadata = {
  title: 'Precios y planes',
  description:
    'Planes de YaEntre para prepararte al examen de admisión de la UNAM, el IPN, la UAM y el CENEVAL: Free (gratis para siempre), Mensual, Pase de Temporada y Premium Garantía. Compara qué incluye cada uno. Pago con tarjeta, OXXO o SPEI.',
  alternates: { canonical: '/precios' },
  openGraph: openGraphFor({
    url: '/precios',
    title: 'Precios y planes — YaEntre',
    description:
      'Empieza gratis. Sube de plan cuando estés listo: Mensual, Pase de Temporada o Premium con garantía de reembolso si no ingresas.',
  }),
};

const PAID_PLANS: SubscriptionPlan[] = ['MONTHLY', 'SEASON_PASS', 'PREMIUM'];

const PLAN_LABEL: Record<SubscriptionPlan, string> = {
  MONTHLY: 'Mensual',
  SEASON_PASS: 'Pase de Temporada',
  PREMIUM: 'Premium Garantía',
};

/** Tabla de features EXACTA a la matriz del PRD §9 "Qué incluye cada plan" —
 *  no se reordena ni se reinterpreta ninguna celda. */
/** G101: celda de la tabla — incluido / no incluido / texto, sin emojis. El
 *  ícono nunca va solo: el lector de pantalla oye «Incluido»/«No incluido». */
type FeatureCell = { mark?: 'yes' | 'no'; text?: string };
const Y = (text?: string): FeatureCell => ({ mark: 'yes', text });
const N = (text?: string): FeatureCell => ({ mark: 'no', text });
const T = (text: string): FeatureCell => ({ text });

const FEATURE_ROWS: Array<{
  feature: string;
  free: FeatureCell;
  monthly: FeatureCell;
  seasonPass: FeatureCell;
  premium: FeatureCell;
}> = [
  { feature: 'Diagnóstico inicial', free: Y(), monthly: Y(), seasonPass: Y(), premium: Y() },
  { feature: 'Reactivos ilimitados (Drill)', free: N('10/día'), monthly: Y(), seasonPass: Y(), premium: Y() },
  {
    feature: 'Simulacros completos',
    free: T('1 (30 reactivos)'),
    monthly: Y('ilimitados'),
    seasonPass: Y('ilimitados'),
    premium: Y('ilimitados'),
  },
  {
    feature: 'Simulador fullscreen (120/140 reactivos)',
    free: N(),
    monthly: Y(),
    seasonPass: Y(),
    premium: Y(),
  },
  { feature: 'Resolución por capas', free: T('Capa 1 solo'), monthly: Y('todas'), seasonPass: Y('todas'), premium: Y('todas') },
  { feature: 'Dashboard del alumno', free: T('Básico'), monthly: Y('completo'), seasonPass: Y('completo'), premium: Y('completo') },
  { feature: 'Entrómetro', free: N(), monthly: Y(), seasonPass: Y(), premium: Y() },
  { feature: 'Dashboard parental', free: N(), monthly: N(), seasonPass: Y(), premium: Y() },
  { feature: 'Gamificación completa', free: T('Parcial'), monthly: Y(), seasonPass: Y(), premium: Y() },
  {
    feature: 'Vigencia',
    free: T('Siempre'),
    monthly: T('Mensual renovable'),
    // G103: 12 meses desde la compra (antes, hasta el día del examen).
    seasonPass: T('12 meses'),
    premium: T('12 meses'),
  },
  { feature: 'Garantía de reembolso', free: N(), monthly: N(), seasonPass: N(), premium: Y('si no ingresa') },
  { feature: 'Tutorías (Fase 2)', free: N(), monthly: N(), seasonPass: N(), premium: T('Prioritario') },
];

function FeatureCellView({ cell }: { cell: FeatureCell }) {
  // `relative`: el texto `sr-only` es `position:absolute`, y sin un ancestro
  // posicionado DENTRO del contenedor con scroll se escapa del recorte y
  // ensancha la página entera en celular (medido: 543 px en una pantalla de 390).
  return (
    <td className="relative p-4 text-text-secondary">
      <span className="inline-flex items-center gap-1.5">
        {cell.mark === 'yes' && <Icon name="check" className="h-4 w-4 text-success" />}
        {cell.mark === 'no' && <Icon name="x" className="h-4 w-4 text-text-muted" />}
        {cell.mark && (
          <span className="sr-only">{cell.mark === 'yes' ? 'Incluido' : 'No incluido'}</span>
        )}
        {cell.text && <span>{cell.text}</span>}
      </span>
    </td>
  );
}

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

  // Datos estructurados `Product` (G68): una oferta por plan con el precio de
  // la temporada VIGENTE (el mismo que ve y paga el usuario), en pesos.
  const offers: ProductOffer[] = [
    { name: 'Free', price: '0.00', description: 'Diagnóstico y primer simulacro completo gratis, para siempre.' },
    ...PAID_PLANS.map((plan) => ({
      name: planLabel(plan),
      price: (pricing[plan].amountMxn / 100).toFixed(2),
      description: pricing[plan].isRecurring ? 'Suscripción mensual renovable.' : 'Pago único, 12 meses de acceso.',
    })),
  ];

  return (
    <PublicPageShell>
      <JsonLd data={productJsonLd(getSiteUrl(), offers)} />
      <PixelPageView />
      <section className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 sm:py-20">
        <h1 className="font-display text-4xl font-bold text-text-primary">
          Elige el plan que te lleve hasta el examen de admisión
        </h1>
        <p className="mt-3 text-lg text-text-secondary">
          Empieza gratis. Sube de plan cuando estés listo — sin compromiso.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6" aria-labelledby="planes-heading">
        <h2 id="planes-heading" className="sr-only">
          Planes y precios
        </h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-border-subtle bg-surface p-6">
            <h3 className="font-display text-lg font-bold text-text-primary">Free</h3>
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
              <h3 className="font-display text-lg font-bold text-text-primary">{PLAN_LABEL[plan]}</h3>
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
                  <th className="p-4 font-semibold text-brand-fg">Pase de Temporada</th>
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
                    <FeatureCellView cell={row.free} />
                    <FeatureCellView cell={row.monthly} />
                    <FeatureCellView cell={row.seasonPass} />
                    <FeatureCellView cell={row.premium} />
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
