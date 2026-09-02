import type { ButtonHTMLAttributes } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'ghost' | 'danger';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

// G63 (accesibilidad): sin `focus:ring` propio — el `:focus-visible` global de
// `globals.css` (outline `--brand-soft`, offset 2px) aplica solo y cumple
// WCAG 2.4.11 en toda superficie. El `ring` anterior usaba `--brand` (2.6:1
// sobre superficies oscuras) + un `ring-offset` blanco que dibujaba un halo
// blanco alrededor del botón en dark.
const BASE_BUTTON_CLASSNAME =
  'inline-flex min-h-touch min-w-touch items-center justify-center rounded-md px-4 py-2 text-sm font-semibold transition-all active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-brand text-white hover:bg-brand-hover shadow-md hover:shadow-lg',
  secondary: 'bg-surface border border-border-subtle text-text-primary hover:bg-elevated',
  tertiary: 'text-brand-soft hover:text-brand-hover hover:bg-brand-tint',
  ghost: 'text-text-secondary hover:text-brand-soft bg-transparent',
  // G63: `#ef4444` (bg-danger en dark) con texto blanco da 3.76:1 — falla
  // 4.5:1 para el texto del botón. `red-600` (#dc2626) da 4.83:1 en ambos
  // temas.
  danger: 'bg-red-600 text-white hover:bg-red-700 shadow-md hover:shadow-lg',
};

/** Classes compartidas por `Button` y `LinkButton` (src/components/ui/LinkButton.tsx)
 *  para que un CTA como `<Link>` se vea idéntico a un `<button>` real. */
export function buttonClassName(variant: ButtonVariant = 'primary', className = ''): string {
  return `${BASE_BUTTON_CLASSNAME} ${BUTTON_VARIANTS[variant]} ${className}`;
}

export function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  return <button className={buttonClassName(variant, className)} {...props} />;
}
