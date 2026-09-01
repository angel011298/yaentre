import { cache } from 'react';
import type { Subscription, UserProfile, UserRole } from '@prisma/client';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db/prisma';
import { isOnboardingComplete } from '@/lib/onboarding/steps';
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
  } catch {
    // Proveedor de auth inalcanzable: se trata igual que "sin sesión".
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
