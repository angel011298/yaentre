import 'server-only';
import { PostHog } from 'posthog-node';
import type { AnalyticsEventName, AnalyticsEvents } from './events';
import { reportSilentDegradation } from '@/lib/observability/report';

/**
 * Analítica de producto — lado SERVIDOR (F20 tarea 2). Los eventos de negocio
 * más importantes (fin de sesión, compra, embudo) se capturan aquí y NO desde
 * el navegador: así llegan siempre, sin depender de que el JS del cliente
 * cargue o de que un ad-blocker no bloquee el script de PostHog — el mismo
 * criterio de "el servidor es la autoridad" que CLAUDE.md ya exige para
 * scoring y pagos.
 *
 * `flushAt: 1, flushInterval: 0`: en un entorno serverless (Vercel) el
 * proceso puede congelarse en cuanto la función termina, así que cada evento
 * se manda de inmediato en vez de esperar a acumular un lote que quizás nunca
 * salga. `trackServerEvent` además espera el flush antes de devolver el
 * control — unos milisegundos de latencia a cambio de no perder el evento.
 *
 * Sin `NEXT_PUBLIC_POSTHOG_KEY` real (placeholder, ver docs/ESTADO.md) queda
 * inerte: no lanza, simplemente no manda nada.
 */
let client: PostHog | null | undefined;

function getClient(): PostHog | null {
  if (client !== undefined) return client;

  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!apiKey || apiKey.startsWith('your-')) {
    client = null;
    return client;
  }

  client = new PostHog(apiKey, {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
    flushAt: 1,
    flushInterval: 0,
  });
  return client;
}

/**
 * Registra un evento de negocio con `userProfileId` (nunca el correo) como
 * `distinctId`. Nunca lanza: un fallo de analítica jamás debe tumbar el flujo
 * real (cerrar una sesión, activar un pago) que lo dispara.
 */
export async function trackServerEvent<E extends AnalyticsEventName>(
  userProfileId: string,
  event: E,
  properties: AnalyticsEvents[E]
): Promise<void> {
  const ph = getClient();
  if (!ph) return;

  try {
    ph.capture({ distinctId: userProfileId, event, properties });
    await ph.flush();
  } catch (err) {
    reportSilentDegradation('analytics', err, { event });
  }
}
