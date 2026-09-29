import { cache } from 'react';
import type { Subscription, Teacher, TeacherStatus, UserProfile, UserRole } from '@prisma/client';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db/prisma';
import { isOnboardingComplete } from '@/lib/onboarding/steps';
import { reportControlFailure } from '@/lib/observability/report';
import { AuthError } from './errors';
import { createSupabaseServerClient } from './supabase-server';

export type RequireUserResult = {
  authUser: SupabaseUser;
  profile: UserProfile;
};

/**
 * Exige una sesión válida y un UserProfile existente. Base de todos los
 * demás guards. Lanza AuthError('UNAUTHORIZED') si falta cualquiera de los dos.
 *
 * G62 (rendimiento): envuelto en `cache()` de React — en una carga de `/app/*`
 * el guard corre al menos dos veces por request (`(app)/layout.tsx` para el
 * shell + la propia página vía `requireOnboarding`), y cada llamada hacía un
 * `supabase.auth.getUser()` (valida el JWT contra el servidor de Auth, ~ida y
 * vuelta de red) MÁS una consulta a `user_profiles`. `cache()` deduplica ambas
 * dentro del mismo render: la segunda llamada es gratis. No cambia semántica —
 * la sesión no muta a mitad de request.
 */
export const requireUser = cache(async function requireUser(): Promise<RequireUserResult> {
  const supabase = await createSupabaseServerClient();

  let authUser: SupabaseUser | null = null;
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    authUser = user;
  } catch (err) {
    // Proveedor de auth inalcanzable: se trata igual que "sin sesión" — fallar
    // CERRADO es lo correcto aquí y no se toca. Pero un Auth caído se ve desde
    // dentro exactamente igual que "nadie tenía sesión": sin este reporte, una
    // caída del proveedor sale a producción como un cierre de sesión masivo
    // sin una sola alerta (G73b).
    reportControlFailure('auth_session', 'fail-closed', err);
    authUser = null;
  }

  if (!authUser) {
    throw new AuthError('UNAUTHORIZED', 'Debes iniciar sesión para continuar.');
  }

  const profile = await prisma.userProfile.findUnique({ where: { userId: authUser.id } });

  if (!profile) {
    throw new AuthError(
      'UNAUTHORIZED',
      'No encontramos tu perfil. Intenta iniciar sesión de nuevo.'
    );
  }

  return { authUser, profile };
});

/**
 * Exige uno de los roles indicados. No aplica el guard de verificación de
 * correo — la verificación diferida solo bloquea la compra de planes
 * (ver requireVerifiedForPurchase).
 */
export async function requireRole(allowed: UserRole | UserRole[]): Promise<RequireUserResult> {
  const result = await requireUser();
  const roles = Array.isArray(allowed) ? allowed : [allowed];

  if (!roles.includes(result.profile.role)) {
    throw new AuthError('FORBIDDEN', 'No tienes permiso para acceder a esto.');
  }

  return result;
}

/**
 * Exige una Subscription con status ACTIVE. Usado para features exclusivas
 * de planes de pago (simulacros ilimitados, capas 2-4, panel parental, etc.).
 */
export async function requirePaidPlan(): Promise<
  RequireUserResult & { subscription: Subscription }
> {
  const result = await requireUser();
  const subscription = await prisma.subscription.findFirst({
    where: { userProfileId: result.profile.id, status: 'ACTIVE' },
  });

  if (!subscription) {
    throw new AuthError('PAYWALL', 'Necesitas un plan activo para continuar.');
  }

  return { ...result, subscription };
}

/**
 * Exige sesión Y onboarding completo (ver src/lib/onboarding/steps.ts). Es el
 * guard que protege todo /app/* (Flujo_App §16.2, `requireOnboarding`) —
 * a diferencia de los demás guards, redirige directamente en vez de lanzar,
 * porque el único destino válido ante un onboarding incompleto es /onboarding.
 *
 * El chequeo de ROL va PRIMERO, por la misma razón que en `(app)/layout.tsx`:
 * un tutor tiene `onboardingStep=0` de por vida (nunca pasa por el asistente
 * de alumno), así que comprobar onboarding antes que rol lo mandaría a
 * /onboarding — el asistente de ALUMNO — sin salida. `(app)/*` ya lo cubre en
 * su layout, pero /simulador vive FUERA de ese grupo a propósito (pantalla
 * aislada, ver app/simulador/page.tsx) y solo tiene este guard: sin esta
 * comprobación, un tutor que abre /simulador queda atrapado en el asistente
 * de alumno (G10). Todos los llamadores de este guard son rutas de alumno.
 */
export async function requireOnboarding(): Promise<RequireUserResult> {
  const result = await requireUser();

  if (result.profile.role === 'PARENT') {
    redirect('/tutor');
  }

  if (!isOnboardingComplete(result.profile.onboardingStep)) {
    redirect('/onboarding');
  }

  return result;
}

/**
 * El único punto del sistema donde la verificación de correo bloquea el
 * acceso: justo antes de comprar (protege contra fraude de pago y asegura
 * un canal de contacto válido). Ver docs/Flujo_App_YaEntre_v1.0.md §3.
 */
export async function requireVerifiedForPurchase(): Promise<RequireUserResult> {
  const result = await requireUser();

  if (!result.authUser.email_confirmed_at) {
    throw new AuthError(
      'UNAUTHORIZED',
      'Verifica tu correo antes de comprar. Te reenviamos el enlace.'
    );
  }

  return result;
}

/**
 * Bloque 2 — sesión con el correo VERIFICADO, para acciones que no son una
 * compra pero tratan dinero o datos financieros (la solicitud de profesor pide
 * CURP y CLABE). Mismo criterio que `requireVerifiedForPurchase`, con un mensaje
 * que no habla de «comprar».
 */
export async function requireVerifiedUser(): Promise<RequireUserResult> {
  const result = await requireUser();

  if (!result.authUser.email_confirmed_at) {
    throw new AuthError(
      'UNAUTHORIZED',
      'Verifica tu correo para continuar. Te reenviamos el enlace.'
    );
  }

  return result;
}

/**
 * Bloque 2 — exige que la cuenta tenga un perfil de PROFESOR en uno de los
 * estados permitidos. Ser profesor NO es un rol (`UserRole`): es la existencia
 * de una fila `Teacher`, así que una misma cuenta puede ser alumno y profesor.
 *
 * El profesor sale SIEMPRE de la sesión, nunca de un identificador del cuerpo:
 * esta es la barrera que impide que un profesor lea o modifique a otro.
 *
 * Por defecto solo pasa un profesor ACTIVO. Las pantallas de solicitud y de
 * estado pasan `['PENDING_REVIEW', …]` explícitamente: que un estado se permita
 * es una decisión de cada llamador, no un valor por omisión.
 */
export async function requireTeacher(
  allowedStatuses: readonly TeacherStatus[] = ['ACTIVE']
): Promise<RequireUserResult & { teacher: Teacher }> {
  const result = await requireUser();

  const teacher = await prisma.teacher.findUnique({ where: { userProfileId: result.profile.id } });
  if (!teacher || !allowedStatuses.includes(teacher.status)) {
    throw new AuthError('FORBIDDEN', 'No tienes un perfil de profesor activo en YaEntre.');
  }

  return { ...result, teacher };
}
