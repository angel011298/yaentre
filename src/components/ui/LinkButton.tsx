import Link, { type LinkProps } from 'next/link';
import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { buttonClassName, type ButtonVariant } from './Button';

type LinkButtonProps = LinkProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps> & {
    variant?: ButtonVariant;
    children: ReactNode;
  };

/** Un CTA que navega (Link) pero se ve idéntico a `Button` — para landing/precios,
 *  donde el botón principal es navegación pura y no necesita un Client Component. */
export function LinkButton({ variant = 'primary', className = '', children, ...props }: LinkButtonProps) {
  return (
    <Link className={buttonClassName(variant, className)} {...props}>
      {children}
    </Link>
  );
}
