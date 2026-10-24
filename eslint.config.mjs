import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Server Actions usadas con useActionState deben aceptar (prevState,
      // formData) aunque no siempre se usen ambos — permitir prefijo `_`.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Artefactos de Playwright (trazas con JS minificado de terceros).
    "test-results/**",
    "playwright-report/**",
    // Marca v1.0: generadores de referencia del handoff de diseño, tal cual
    // llegaron (CommonJS). Las pruebas los usan como oráculo; no son código
    // de la app.
    "docs/marca/**",
  ]),
]);

export default eslintConfig;
