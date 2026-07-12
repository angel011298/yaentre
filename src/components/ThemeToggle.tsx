'use client';

import { useLayoutEffect, useState } from 'react';

export function ThemeToggle() {
  const [theme, setTheme] = useState<'dark' | 'light' | null>(null);

  useLayoutEffect(() => {
    const stored = localStorage.getItem('theme') as 'dark' | 'light' | null;
    const initial = stored || 'dark';
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(initial);
    document.documentElement.setAttribute('data-theme', initial);
  }, []);

  const toggle = () => {
    if (!theme) return;
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  };

  return (
    <button
      onClick={toggle}
      className="inline-flex items-center justify-center min-h-touch min-w-touch rounded-md bg-surface border border-border-subtle p-2 transition-all hover:bg-elevated"
      aria-label={`Cambiar a tema ${theme === 'dark' ? 'claro' : 'oscuro'}`}
      disabled={!theme}
    >
      {theme === 'dark' ? '☀️' : theme === 'light' ? '🌙' : '◯'}
    </button>
  );
}
