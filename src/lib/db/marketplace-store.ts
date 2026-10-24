import type { MarketplaceStore } from '@/lib/stripe/marketplace-webhook';
import { applyAccessExtension } from './access-extension';

/**
 * G103 — implementación real (Prisma) del `MarketplaceStore` que usa el
 * webhook para los pagos que NO son de planes. Cada método es idempotente por
 * `event.id` (`runIdempotent`, misma transacción que la mutación).
 */
export const marketplaceStore: MarketplaceStore = {
  applyAccessExtension,
};
