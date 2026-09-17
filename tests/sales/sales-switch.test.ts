import { describe, expect, it } from 'vitest';
import {
  evaluateSalesGate,
  isProductionDeployment,
  stripeKeyMode,
  type SalesEnv,
} from '@/lib/stripe/sales-switch';

/**
 * G98 — MATRIZ COMPLETA del interruptor de ventas.
 *
 * La matriz se enumera entera a propósito: 3 valores de `SALES_OPEN` × 3 de
 * `VERCEL_ENV` × 3 modos de llave = 27 combinaciones, y de las 27 solo 3
 * abren la venta. Escribir las 27 es lo que impide que un `if` añadido más
 * tarde abra una celda por descuido sin que ninguna prueba lo note.
 */

const SALES_OPEN_VALUES = [undefined, 'false', 'true'] as const;
const VERCEL_ENV_VALUES = [undefined, 'preview', 'production'] as const;
const KEYS = {
  test: 'sk_test_51abcDEF',
  live: 'sk_live_51abcDEF',
  missing: undefined,
} as const;

function env(
  salesOpen: string | undefined,
  vercelEnv: string | undefined,
  key: string | undefined
): SalesEnv {
  return { salesOpen, vercelEnv, stripeSecretKey: key };
}

describe('stripeKeyMode', () => {
  it('reconoce las llaves de modo real, secretas y restringidas', () => {
    expect(stripeKeyMode('sk_live_abc')).toBe('live');
    expect(stripeKeyMode('rk_live_abc')).toBe('live');
  });

  it('reconoce las de prueba', () => {
    expect(stripeKeyMode('sk_test_abc')).toBe('test');
    expect(stripeKeyMode('rk_test_abc')).toBe('test');
  });

  it('cualquier otra cosa es `unknown` — y `unknown` NUNCA vale como real', () => {
    expect(stripeKeyMode(undefined)).toBe('unknown');
    expect(stripeKeyMode('')).toBe('unknown');
    expect(stripeKeyMode('pon-aqui-tu-llave')).toBe('unknown');
    // El caso malicioso: una cadena que CONTIENE el prefijo pero no empieza
    // por él. `startsWith` y no `includes`, justamente por esto.
    expect(stripeKeyMode('sk_test_sk_live_abc')).toBe('test');
    expect(stripeKeyMode('prefijo_sk_live_abc')).toBe('unknown');
  });
});

describe('isProductionDeployment', () => {
  it('solo `production` cuenta como producción', () => {
    expect(isProductionDeployment('production')).toBe(true);
    expect(isProductionDeployment('preview')).toBe(false);
    expect(isProductionDeployment('development')).toBe(false);
    expect(isProductionDeployment(undefined)).toBe(false);
    expect(isProductionDeployment('Production')).toBe(false);
  });
});

describe('evaluateSalesGate — sin SALES_OPEN=true nada abre', () => {
  for (const salesOpen of [undefined, 'false', 'TRUE', '1', 'yes', ''] as const) {
    for (const vercelEnv of VERCEL_ENV_VALUES) {
      for (const [name, key] of Object.entries(KEYS)) {
        it(`SALES_OPEN=${String(salesOpen)} · VERCEL_ENV=${String(vercelEnv)} · llave ${name} → cerrada`, () => {
          expect(evaluateSalesGate(env(salesOpen, vercelEnv, key))).toEqual({
            open: false,
            reason: 'flag_off',
          });
        });
      }
    }
  }
});

describe('evaluateSalesGate — con SALES_OPEN=true manda el modo de la llave', () => {
  it('producción + llave REAL → ABIERTA (la única forma de vender)', () => {
    expect(evaluateSalesGate(env('true', 'production', KEYS.live))).toEqual({ open: true });
  });

  it('producción + llave de PRUEBA → cerrada y marcada como inconsistente', () => {
    expect(evaluateSalesGate(env('true', 'production', KEYS.test))).toEqual({
      open: false,
      reason: 'misconfigured_test_key_in_production',
    });
  });

  it('producción SIN llave → cerrada e inconsistente (no se puede afirmar el modo)', () => {
    expect(evaluateSalesGate(env('true', 'production', KEYS.missing))).toEqual({
      open: false,
      reason: 'misconfigured_test_key_in_production',
    });
  });

  it('preview + llave de prueba → abierta (es donde se ensaya el flujo)', () => {
    expect(evaluateSalesGate(env('true', 'preview', KEYS.test))).toEqual({ open: true });
  });

  it('local (sin VERCEL_ENV) + llave de prueba → abierta', () => {
    expect(evaluateSalesGate(env('true', undefined, KEYS.test))).toEqual({ open: true });
  });

  it('preview sin llave → abierta: fuera de producción el modo no se exige', () => {
    expect(evaluateSalesGate(env('true', 'preview', KEYS.missing))).toEqual({ open: true });
  });
});

describe('evaluateSalesGate — la matriz 3×3×3 completa', () => {
  // Las ÚNICAS siete celdas abiertas de las 27: fuera de producción basta la
  // bandera (6 celdas), y en producción hace falta además la llave real (1).
  // Se enumeran por nombre para que abrir cualquier otra rompa por su nombre,
  // no por un conteo agregado que se puede "arreglar" ajustando el número.
  const OPEN = new Set([
    'true|undefined|test',
    'true|undefined|live',
    'true|undefined|missing',
    'true|preview|test',
    'true|preview|live',
    'true|preview|missing',
    'true|production|live',
  ]);

  for (const salesOpen of SALES_OPEN_VALUES) {
    for (const vercelEnv of VERCEL_ENV_VALUES) {
      for (const keyName of ['test', 'live', 'missing'] as const) {
        const cell = `${String(salesOpen)}|${String(vercelEnv)}|${keyName}`;
        const expectedOpen = OPEN.has(cell);
        it(`${cell} → ${expectedOpen ? 'ABIERTA' : 'cerrada'}`, () => {
          const gate = evaluateSalesGate(env(salesOpen, vercelEnv, KEYS[keyName]));
          expect(gate.open).toBe(expectedOpen);
        });
      }
    }
  }

  it('solo 7 de las 27 celdas abren — y ninguna con llave de prueba en producción', () => {
    let open = 0;
    for (const salesOpen of SALES_OPEN_VALUES) {
      for (const vercelEnv of VERCEL_ENV_VALUES) {
        for (const keyName of ['test', 'live', 'missing'] as const) {
          if (evaluateSalesGate(env(salesOpen, vercelEnv, KEYS[keyName])).open) open += 1;
        }
      }
    }
    expect(open).toBe(7);
  });
});
