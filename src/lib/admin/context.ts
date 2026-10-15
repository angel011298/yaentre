import { redirect } from 'next/navigation';
import { cache } from 'react';
import { AuthError } from '@/lib/auth/errors';
import { requireRole, type RequireUserResult } from '@/lib/auth/guards';
import { isOnboardingComplete } from '@/lib/onboarding/steps';
import { isMasterAdminEmail, masterCandidateEmail } from './master';

export type AdminContext = RequireUserResult & {
  /** Admin MAESTRO: rol ADMIN + correo verificado en `MASTER_ADMIN_EMAILS`. */
  isMaster: boolean;
  /** ¿Puede abrir la app del alumno sin que lo devuelva al panel? */
  hasStudentApp: boolean;
};

/**
 * G100 — quién es el administrador de ESTA petición, resuelto UNA vez.
 *
 * El layout del panel, cada página y la cabecera necesitaban saber si el
 * actor es maestro, y cada uno lo recalculaba por su cuenta (G99). Aquí se
 * decide en el servidor, en cada petición, a partir de la sesión y del
 * entorno — por eso da lo mismo desde qué dispositivo se entre: no hay nada
 * guardado en el navegador que pueda decir otra cosa.
 *
 * 🔴 TODA página de /admin la llama en su PRIMERA línea, antes de leer datos.
 * El layout no basta: Next renderiza layout y página EN PARALELO, y cuando el
 * layout redirigía a un alumno, el 307 llevaba en el CUERPO la página ya
 * renderizada — medido en G100: `/admin/bitacora` entregaba 25 correos de
 * cuentas reales a una sesión de alumno, `/admin/usuarios` 6, y la cola de
 * revisión los reactivos sin publicar. `tests/admin/pages-guard.test.ts`
 * falla si una página nueva se olvida.
 *
 * ⚠️ Sirve para decidir qué se PINTA. El candado real de las ACCIONES sigue en
 * la primera línea de cada Server Action (`requireMasterAdmin`): un botón
 * escondido no cierra nada (G98).
 */
export const getAdminContext = cache(async function getAdminContext(): Promise<AdminContext> {
  let result: RequireUserResult;
  try {
    result = await requireRole('ADMIN');
  } catch (err) {
    // Redirigir, no lanzar: un `AuthError` sin capturar en una página llega a
    // Sentry por `onRequestError` aunque el layout ya haya redirigido — cada
    // alumno que abriera /admin era un "error" que tapaba los reales (G71 D3).
    if (err instanceof AuthError) {
      redirect(err.code === 'FORBIDDEN' ? '/app' : '/login?next=/admin');
    }
    throw err;
  }
  return {
    ...result,
    isMaster: isMasterAdminEmail(
      masterCandidateEmail(result.authUser),
      process.env.MASTER_ADMIN_EMAILS
    ),
    hasStudentApp: isOnboardingComplete(result.profile.onboardingStep),
  };
});
