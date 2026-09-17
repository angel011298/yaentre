import 'server-only';
import { reportControlFailure } from '@/lib/observability/report';
import {
  evaluateSalesGate,
  readSalesEnv,
  stripeKeyMode,
  type SalesGate,
} from './sales-switch';

/**
 * G98 — lado SERVIDOR del interruptor de ventas. La decisión vive en el módulo
 * puro `sales-switch.ts`; aquí solo se lee el entorno y se reporta el único
 * desenlace que merece una alerta.
 *
 * `import 'server-only'`: si este módulo llegara a un bundle de cliente el
 * build falla. El interruptor no puede depender de nada que el navegador
 * pueda mentir — esconder un botón no cierra una Server Action.
 */

/**
 * ¿La venta está abierta AHORA? Además del veredicto, reporta a Sentry la
 * configuración inconsistente (`SALES_OPEN=true` en producción con llave de
 * prueba). `fail-closed`: la compra se deniega, que es lo correcto — pero en
 * silencio nadie se enteraría de que la caja que el dueño creyó abrir está
 * cerrada, y ese es exactamente el patrón de G73.
 */
export function salesGate(): SalesGate {
  const env = readSalesEnv();
  const gate = evaluateSalesGate(env);

  if (!gate.open && gate.reason === 'misconfigured_test_key_in_production') {
    reportControlFailure(
      'sales_gate',
      'fail-closed',
      new Error('SALES_OPEN=true en producción con una llave de Stripe que no es de modo real'),
      { vercelEnv: env.vercelEnv, stripeKeyMode: stripeKeyMode(env.stripeSecretKey) }
    );
  }

  return gate;
}

/** Azúcar para las plantillas: `true` solo si la compra se puede completar. */
export function isSalesOpen(): boolean {
  return salesGate().open;
}
