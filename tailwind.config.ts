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
          soft: '#A78BFA',
          tint: '#EDE9FE',
        },
        success: { DEFAULT: '#22C55E', glow: '#4ADE80' },
        streak: { DEFAULT: '#F97316', glow: '#FB923C' },
        danger: '#EF4444',
        info: '#38BDF8',
        warning: '#FBBF24',
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
