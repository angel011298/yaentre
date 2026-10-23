import type { Config } from 'tailwindcss';

/**
 * Marca v1.0: los COLORES ya no viven aquí sino en el bloque `@theme inline`
 * de `app/globals.css` (generado desde docs/marca/tokens/yaentre-colors.css).
 * Ahí cada utilidad apunta a la variable semántica (`bg-brand` →
 * `var(--brand-primary)`), así un `data-theme` anidado la cambia; tenerlos
 * en los dos sitios dejaba dos definiciones de la misma utilidad compitiendo
 * por orden. Aquí quedan radios, fuentes, área táctil y sombra.
 */
export default {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
        '2xl': '32px',
      },
      fontFamily: {
        display: ['Outfit', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      minHeight: {
        touch: '44px',
      },
      minWidth: {
        touch: '44px',
      },
      boxShadow: {
        md: 'var(--shadow-md)',
      },
    },
  },
  plugins: [],
} satisfies Config;
