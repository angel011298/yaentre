import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [],
    include: ['tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    // Playwright posee tests/e2e; Vitest no debe recolectar esos specs.
    exclude: ['node_modules/**', 'tests/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.test.ts',
        '**/*.spec.ts',
      ],
    },
  },
  resolve: {
    alias: {
      // Debe ir ANTES de '@' para que gane el prefijo más específico —
      // espeja el mapeo de tsconfig ('@/app/*' → './app/*', '@/*' → './src/*').
      '@/app': path.resolve(__dirname, './app'),
      '@': path.resolve(__dirname, './src'),
      // `server-only` lanza a propósito fuera de un React Server Component.
      // En pruebas de integración de Route Handlers (F19, webhook de Stripe)
      // sí necesitamos importar módulos que lo declaran; el stub conserva la
      // protección real del build de Next y solo la neutraliza bajo Vitest.
      'server-only': path.resolve(__dirname, './tests/stubs/server-only.ts'),
    },
  },
});
