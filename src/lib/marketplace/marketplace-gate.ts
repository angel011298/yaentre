import 'server-only';
import {
  evaluateMarketplaceGate,
  readMarketplaceEnv,
  type MarketplaceGate,
} from './marketplace-switch';

/**
 * Lado SERVIDOR del interruptor del marketplace. La decisión vive en el módulo
 * puro `marketplace-switch.ts`; aquí solo se lee el entorno.
 *
 * `import 'server-only'`: si este módulo llegara a un bundle de cliente el
 * build falla. El interruptor no puede depender de nada que el navegador
 * pueda mentir.
 */
export function marketplaceGate(): MarketplaceGate {
  return evaluateMarketplaceGate(readMarketplaceEnv());
}

/** Azúcar para las páginas: `true` solo si el marketplace está abierto. */
export function isMarketplaceOpen(): boolean {
  return marketplaceGate().open;
}
