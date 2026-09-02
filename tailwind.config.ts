import type { Config } from 'tailwindcss';

export default {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#7C3AED',
          hover: '#6D28D9',
          // `soft` SÍ es theme-aware (a diferencia de DEFAULT/hover/tint):
          // en dark es el lila claro de acento (pasa AA de sobra ahí); sobre
          // fondos claros ese mismo lila no cumple AA como texto, así que
          // `[data-theme='light']` lo redefine igual al morado principal.
          soft: 'var(--brand-soft)',
          tint: '#EDE9FE',
        },
        // success/streak/danger/info/warning viven en var(--x) (a diferencia
        // de brand, que es la misma marca en ambos temas): el verde/ámbar/
        // rojo/azul vivos del diseño original NO cumplen AA como texto sobre
        // fondos claros (UIUX Spec §12, "algunos verdes vivos fallan
        // contraste... requieren texto oscuro") — `[data-theme='light']`
        // en globals.css redefine estas variables a una sombra más oscura
        // SOLO para light; dark conserva el valor vivo original sin cambios.
        success: { DEFAULT: 'var(--success)', glow: '#4ADE80' },
        streak: { DEFAULT: 'var(--streak)', glow: '#FB923C' },
        danger: 'var(--danger)',
        info: 'var(--info)',
        warning: 'var(--warning)',
        // G63 (accesibilidad): color de texto/ícono para poner ENCIMA de un
        // fondo sólido del color semántico correspondiente (theme-aware, ≥4.5:1
        // en ambos temas — ver globals.css). Uso: `bg-success text-on-success`.
        'on-success': 'var(--on-success)',
        'on-danger': 'var(--on-danger)',
        'on-warning': 'var(--on-warning)',
        'on-info': 'var(--on-info)',
        'on-streak': 'var(--on-streak)',
        base: 'var(--bg-base)',
        surface: 'var(--bg-surface)',
        elevated: 'var(--bg-elevated)',
        'input': 'var(--bg-input)',
        'text': {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
        },
        'border': {
          subtle: 'var(--border-subtle)',
          strong: 'var(--border-strong)',
        },
      },
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
