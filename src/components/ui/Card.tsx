import type { HTMLAttributes } from 'react';

type CardProps = HTMLAttributes<HTMLDivElement>;

export function Card({ className = '', ...props }: CardProps) {
  return (
    <div
      className={`rounded-lg bg-surface border border-border-subtle shadow-md transition-all hover:shadow-lg active:scale-[0.97] ${className}`}
      {...props}
    />
  );
}
