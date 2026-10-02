import { signInWithGoogleAction } from '@/app/actions/security';
import { isGoogleAuthEnabled } from '@/lib/auth/google';

/**
 * G100 — «Continuar con Google». Server Component con un `<form action>` de
 * Server Action: funciona aun antes de hidratar (es un POST real, no el GET
 * nativo de un `onSubmit`). No se pinta si el proveedor no está habilitado
 * (`NEXT_PUBLIC_ENABLE_GOOGLE_AUTH`).
 *
 * El aviso legal va junto al botón: registrarse con Google crea la cuenta en
 * el mismo clic, así que es aquí donde se aceptan los términos.
 */
export function GoogleSignInButton({ next, mode }: { next?: string; mode: 'login' | 'registro' }) {
  if (!isGoogleAuthEnabled()) return null;
  return (
    <div className="space-y-3">
      <form action={signInWithGoogleAction}>
        {next && <input type="hidden" name="next" value={next} />}
        <button
          type="submit"
          className="flex min-h-touch w-full items-center justify-center gap-3 rounded-md border border-border-strong bg-white px-4 text-sm font-semibold text-[#1f1f1f] transition-all hover:bg-[#f2f2f2]"
        >
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
          </svg>
          Continuar con Google
        </button>
      </form>
      {mode === 'registro' && (
        <p className="text-center text-xs text-text-muted">
          Al continuar con Google aceptas los{' '}
          <a href="/legal/terminos" className="underline">
            Términos
          </a>{' '}
          y el{' '}
          <a href="/legal/privacidad" className="underline">
            Aviso de privacidad
          </a>
          .
        </p>
      )}
      <div className="flex items-center gap-3 text-xs text-text-muted" aria-hidden="true">
        <span className="h-px flex-1 bg-border-subtle" />o con tu correo
        <span className="h-px flex-1 bg-border-subtle" />
      </div>
    </div>
  );
}
