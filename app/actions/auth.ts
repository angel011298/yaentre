'use server';

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import type { Prisma } from '@prisma/client';
import { getSiteUrl } from '@/lib/auth/site-url';
import {
  forgotPasswordSchema,
  signInSchema,
  signUpSchema,
  updatePasswordSchema,
} from '@/lib/auth/schemas';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { safeInternalPath } from '@/lib/auth/safe-redirect';
import type { ActionState } from '@/lib/auth/types';
import { prisma } from '@/lib/db/prisma';
import { trackServerEvent } from '@/lib/analytics/server';
import { ATTRIBUTION_COOKIE_NAME, parseAttributionCookie } from '@/lib/marketing/attribution';
import { consumeAll, consumeRateLimit, type RateLimitVerdict } from '@/lib/rate-limit/store';
import { currentClientIp, emailSubject } from '@/lib/rate-limit/request';

/** Agrega un query param a una ruta relativa sin romper uno ya existente. */
function withQueryParam(path: string, key: string, value: string): string {
  return `${path}${path.includes('?') ? '&' : '?'}${key}=${value}`;
}

/**
 * G65 — mensaje único de "demasiados intentos".
 *
 * Se redacta en minutos (no en segundos) a propósito: un contador exacto le
 * dice a un script cuándo volver justo a tiempo; los minutos redondeados
 * bastan para orientar a una persona y no regalan precisión.
 */
function tooManyAttempts(verdict: RateLimitVerdict, que: string): ActionState {
  const minutos = Math.max(1, Math.ceil(verdict.retryAfterSecs / 60));
  return {
    status: 'error',
    message: `Demasiados intentos de ${que}. Espera ${minutos} minuto${minutos === 1 ? '' : 's'} y vuelve a intentar.`,
  };
}

/**
 * Registro con verificación diferida: la cuenta y la sesión se crean de
 * inmediato (estado REGISTERED_UNVERIFIED); el correo de verificación se
 * envía sin bloquear el flujo. Ver docs/Flujo_App_YaEntre_v1.0.md §4.1.
 */
export async function signUpAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = signUpSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    acceptTerms: formData.get('acceptTerms'),
  });

  if (!parsed.success) {
    return { status: 'error', fieldErrors: parsed.error.flatten().fieldErrors };
  }

  // G65: registro masivo por IP. Va DESPUÉS de validar la forma (no gasta
  // presupuesto en un correo mal escrito) y ANTES de tocar Supabase.
  const gate = await consumeRateLimit('SIGN_UP', await currentClientIp());
  if (!gate.allowed) return tooManyAttempts(gate, 'registro');

  const { email, password } = parsed.data;
  // Registro de tutor (F16): un query param en /registro?role=tutor marca un
  // hidden field `role=PARENT` en el form — cualquier otro valor (o ausente)
  // es el registro normal de alumno. El destino post-registro también
  // cambia: un tutor nunca debe aterrizar en /onboarding ni /app.
  const isParent = formData.get('role') === 'PARENT';
  const role = isParent ? 'PARENT' : 'STUDENT';
  const defaultNext = isParent ? '/tutor' : '/app';
  const next = safeInternalPath(formData.get('next'), defaultNext);
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${getSiteUrl()}/auth/confirm?next=${defaultNext}` },
  });

  if (error || !data.user) {
    return {
      status: 'error',
      message: 'No pudimos crear tu cuenta. Intenta de nuevo en unos minutos.',
    };
  }

  // Supabase no lanza un error explícito para un correo ya registrado y
  // confirmado (evita filtrar qué correos existen): en su lugar regresa un
  // usuario con `identities` vacío. Es la señal documentada para detectarlo.
  if (data.user.identities && data.user.identities.length === 0) {
    return {
      status: 'error',
      code: 'DUPLICATE_EMAIL',
      message: 'Ya existe una cuenta con este correo.',
    };
  }

  let session = data.session;

  // El producto exige sesión inmediata sin esperar la verificación de
  // correo (REGISTERED_UNVERIFIED). Si el proyecto de Supabase no regresó
  // sesión en signUp, se intenta un login explícito a continuación.
  // TODO(infra): confirmar en el Supabase Dashboard (Authentication →
  // Settings) que esto funciona con la configuración real del proyecto;
  // ver docs/PROGRESO_SPRINT0.md → CC-02.
  if (!session) {
    const signInResult = await supabase.auth.signInWithPassword({ email, password });
    session = signInResult.data.session;
  }

  // Atribución de marketing (F24): la cookie de `proxy.ts` trae los
  // parámetros de campaña de la PRIMERA visita de este visitante (si llegó
  // desde un anuncio). Se lee AQUÍ (server-side, vía `next/headers`) y se
  // graba SOLO en el `create` del upsert — un usuario que ya tenía perfil
  // (login repetido a través de este mismo Server Action, caso raro) nunca
  // sobreescribe su atribución original.
  const attributionCookie = (await cookies()).get(ATTRIBUTION_COOKIE_NAME)?.value;
  const acquisitionSource = parseAttributionCookie(attributionCookie);

  let profile;
  try {
    profile = await prisma.userProfile.upsert({
      where: { userId: data.user.id },
      create: {
        userId: data.user.id,
        role,
        onboardingStep: 0,
        ...(acquisitionSource
          ? { acquisitionSource: acquisitionSource as unknown as Prisma.InputJsonValue }
          : {}),
      },
      update: {},
    });
  } catch {
    return {
      status: 'error',
      message:
        'Tu cuenta se creó, pero no pudimos preparar tu perfil. Intenta iniciar sesión en un momento.',
    };
  }

  await trackServerEvent(profile.id, 'signup_completed', { role });

  // Marca `signup=1` en el destino para que `SignupConversionTracker` (F24,
  // en el layout raíz) dispare el evento de conversión "registro completado"
  // hacia los píxeles de publicidad — un Server Action que redirige no puede
  // devolverle datos al cliente en la rama de éxito, así que la señal viaja
  // en la URL del propio redirect en vez de en el valor de retorno.
  if (!session) {
    redirect(withQueryParam('/login?registered=1', 'signup', '1'));
  }

  redirect(withQueryParam(next, 'signup', '1'));
}

export async function signInAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = signInSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return { status: 'error', fieldErrors: parsed.error.flatten().fieldErrors };
  }

  // G65 — fuerza bruta de contraseñas. Se comprobó en vivo que Supabase Auth
  // acepta 25 intentos fallidos seguidos sin devolver 429, y que el limitador
  // en memoria de `proxy.ts` ni siquiera cubre esta ruta (es una Server Action,
  // no `/api`). Sin esto, adivinar la contraseña de una cuenta es cuestión de
  // dejar corriendo un script.
  //
  // DOS presupuestos, y se consumen los dos:
  //   • por CUENTA — frena el ataque dirigido a un alumno concreto, aunque el
  //     atacante rote de IP;
  //   • por IP — frena el "password spraying" (una contraseña común contra
  //     miles de correos distintos), que el presupuesto por cuenta no ve.
  const ip = await currentClientIp();
  const gate = await consumeAll([
    ['SIGN_IN', emailSubject(parsed.data.email)],
    ['SIGN_IN', `ip:${ip}`],
  ]);
  if (!gate.allowed) return tooManyAttempts(gate, 'inicio de sesión');

  // `next` explícito (p. ej. `/login?next=/tutor` cuando un guard redirige
  // aquí) siempre gana. Sin uno, el destino depende del ROL (F16): un tutor
  // jamás debe aterrizar en /app (ahí lo esperaría el onboarding de alumno).
  const rawNext = formData.get('next');
  const explicitNext =
    typeof rawNext === 'string' && rawNext.length > 0
      ? safeInternalPath(rawNext, '')
      : '';
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error || !data.user) {
    // Nunca revelar si fue el correo o la contraseña (Flujo_App §4.2).
    return { status: 'error', message: 'Correo o contraseña incorrectos.' };
  }

  if (explicitNext) {
    redirect(explicitNext);
  }

  const profile = await prisma.userProfile.findUnique({
    where: { userId: data.user.id },
    select: { role: true },
  });
  redirect(profile?.role === 'PARENT' ? '/tutor' : '/app');
}

export async function signOutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect('/login');
}

export async function forgotPasswordAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get('email') });

  if (!parsed.success) {
    return { status: 'error', fieldErrors: parsed.error.flatten().fieldErrors };
  }

  // G65: sin límite, este formulario es un cañón de correo apuntado a la
  // bandeja de cualquier persona cuyo correo se conozca (y una factura de
  // Resend). Se limita por cuenta y por IP; la respuesta genérica de abajo se
  // conserva intacta para no filtrar qué correos existen.
  const gate = await consumeAll([
    ['PASSWORD_RESET', emailSubject(parsed.data.email)],
    ['PASSWORD_RESET', `ip:${await currentClientIp()}`],
  ]);
  if (!gate.allowed) return tooManyAttempts(gate, 'recuperación');

  const supabase = await createSupabaseServerClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${getSiteUrl()}/auth/confirm?next=/actualizar-password`,
  });

  // Respuesta genérica siempre: no revela si el correo existe en el sistema.
  return {
    status: 'success',
    message: 'Si el correo existe, te enviamos un enlace para restablecer tu contraseña.',
  };
}

export async function updatePasswordAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = updatePasswordSchema.safeParse({ password: formData.get('password') });

  if (!parsed.success) {
    return { status: 'error', fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const gate = await consumeRateLimit('PASSWORD_CHANGE', `ip:${await currentClientIp()}`);
  if (!gate.allowed) return tooManyAttempts(gate, 'cambio de contraseña');

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  if (error) {
    return {
      status: 'error',
      message: 'No pudimos actualizar tu contraseña. Solicita un nuevo enlace.',
    };
  }

  redirect('/login?passwordUpdated=1');
}

export async function resendVerificationAction(
  _prevState: ActionState,
  _formData: FormData
): Promise<ActionState> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { status: 'error', message: 'No pudimos identificar tu cuenta.' };
  }

  // G65: el botón "reenviar" con sesión abierta no debe poder usarse como
  // remitente masivo hacia el propio correo (ni agotar el cupo de Resend).
  const gate = await consumeRateLimit('RESEND_VERIFICATION', emailSubject(user.email));
  if (!gate.allowed) return tooManyAttempts(gate, 'reenvío');

  const { error } = await supabase.auth.resend({ type: 'signup', email: user.email });

  if (error) {
    return {
      status: 'error',
      message: 'No pudimos reenviar el correo. Intenta de nuevo en unos minutos.',
    };
  }

  return { status: 'success', message: 'Te reenviamos el enlace de verificación.' };
}
