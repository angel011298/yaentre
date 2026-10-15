/**
 * G100 — botón único de «Cerrar sesión».
 *
 * Formulario HTML nativo con POST a `/auth/salir` (ver el Route Handler para
 * el porqué). Sin JavaScript propio y sin `'use client'`: funciona antes de
 * hidratar y en WebViews restringidos, y el clic nunca se pierde por una
 * carrera de hidratación (la lección del formulario de la bóveda en G99 era la
 * contraria: allí el formulario dependía de JS y aquí no depende de nada).
 */
export function SignOutButton({
  className,
  label = 'Cerrar sesión',
}: {
  className?: string;
  label?: string;
}) {
  return (
    <form action="/auth/salir" method="post">
      <button type="submit" className={className}>
        {label}
      </button>
    </form>
  );
}
