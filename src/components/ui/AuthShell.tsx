import type { ReactNode } from 'react';

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div data-theme="dark" className="flex min-h-screen items-center justify-center bg-base px-4 py-12 text-text-primary">
      {/* G63: landmark `<main>` — antes era solo `<div>`, sin punto de
          referencia para saltar a contenido con lector de pantalla. */}
      <main className="w-full max-w-sm rounded-xl border border-border-subtle bg-surface p-8 shadow-md">
        <h1 className="font-display text-2xl font-bold">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-text-secondary">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </main>
    </div>
  );
}
