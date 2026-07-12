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
    <div
      data-theme="dark"
      className="flex min-h-screen items-center justify-center bg-[var(--bg-base)] px-4 py-12 text-[var(--text-primary)]"
    >
      <div className="w-full max-w-sm rounded-[24px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-8 shadow-[var(--shadow-md-dark)]">
        <h1 className="text-2xl font-bold">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-[var(--text-secondary)]">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
