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
    // G64: `py` mínimo de 3rem que crece hasta la muesca/indicador del iPhone
    // (env()=0 en pantallas normales). Estilo inline en vez de clase Tailwind
    // arbitraria con env() — esa sintaxis rompe el escáner de CSS (F11/F18).
    <div
      data-theme="dark"
      className="flex min-h-screen items-center justify-center bg-base px-4 text-text-primary"
      style={{
        paddingTop: 'max(3rem, env(safe-area-inset-top))',
        paddingBottom: 'max(3rem, env(safe-area-inset-bottom))',
      }}
    >
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
