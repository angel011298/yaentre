import { defineConfig, devices } from '@playwright/test';
import { flagsOffServerEnv, LOCAL, localServerEnv, readStackFile } from './tests/e2e-local/support/stack-env';

/**
 * G103 — e2e contra una pila 100 % LOCAL (`pnpm test:e2e:local`): Supabase
 * local (Auth, Storage, base), simulador de Stripe y el build de producción
 * de la app en localhost:3000. Ninguna prueba crea cuentas, cobra ni manda
 * correos en un servicio real. Preparación de la pila: tests/e2e-local/README.md.
 *
 * Un solo worker: las pruebas comparten la base y el limitador de tasa.
 */
const stack = readStackFile();
const env = localServerEnv(stack);

export default defineConfig({
  testDir: './tests/e2e-local',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: [['list']],
  globalSetup: './tests/e2e-local/support/global-setup.ts',
  globalTeardown: './tests/e2e-local/support/global-teardown.ts',
  use: {
    baseURL: LOCAL.appUrl,
    locale: 'es-MX',
    timezoneId: 'America/Mexico_City',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'npx tsx tests/e2e-local/support/fake-stripe.ts',
      url: `http://127.0.0.1:${LOCAL.fakeStripePort}/__health`,
      env,
      reuseExistingServer: true,
      stdout: 'pipe',
    },
    {
      // Build de PRODUCCIÓN con el entorno local incrustado (los NEXT_PUBLIC_*
      // se fijan al compilar). `E2E_SKIP_BUILD=1` reutiliza el último build.
      command:
        process.env.E2E_SKIP_BUILD === '1'
          ? 'node tests/e2e-local/support/build-marker.mjs check && node tests/e2e-local/support/serve.mjs'
          : 'node tests/e2e-local/support/build-marker.mjs clear && pnpm build && node tests/e2e-local/support/build-marker.mjs write && node tests/e2e-local/support/serve.mjs',
      url: LOCAL.appUrl,
      env,
      timeout: 900_000,
      // NUNCA reutilizar: un servidor ya abierto en :3000 podría estar
      // conectado al proyecto real. Si el puerto está ocupado, falla.
      reuseExistingServer: false,
      stdout: 'pipe',
    },
    {
      // El MISMO build, en :3001, con las banderas apagadas (06-banderas-apagadas).
      command: 'node tests/e2e-local/support/wait-build.mjs && node tests/e2e-local/support/serve.mjs -p 3001',
      url: LOCAL.flagsOffUrl,
      env: flagsOffServerEnv(stack),
      timeout: 900_000,
      reuseExistingServer: false,
      stdout: 'pipe',
    },
  ],
});
