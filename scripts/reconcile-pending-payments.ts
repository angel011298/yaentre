/**
 * scripts/reconcile-pending-payments.ts — Corrida manual del job de
 * reconciliación de pagos (F22). Lógica real en `src/lib/db/billing.ts`
 * (`runPaymentReconciliation`) — este archivo solo carga el entorno y la
 * invoca, mismo patrón que `scripts/verify-rls-isolation.ts`.
 *
 * Uso: pnpm reconcile:payments
 * (También corre programado 1x/día vía GET /api/cron/reconcile-payments,
 * ver vercel.json — mismo código, sin duplicar).
 */
import './lib/env';
import { runPaymentReconciliation } from '@/lib/db/billing';

runPaymentReconciliation()
  .then((summary) => {
    console.log('[reconcile] Resumen:', JSON.stringify(summary, null, 2));
    process.exitCode = 0;
  })
  .catch((err) => {
    console.error('[reconcile] Falló la corrida:', err);
    process.exitCode = 1;
  });
