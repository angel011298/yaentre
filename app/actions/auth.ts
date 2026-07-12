'use server';

import { redirect } from 'next/navigation';
import { getSiteUrl } from '@/lib/auth/site-url';
import {
  forgotPasswordSchema,
  signInSchema,
  signUpSchema,
  updatePasswordSchema,
} from '@/lib/auth/schemas';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import type { ActionState } from '@/lib/auth/types';
import { prisma } from '@/lib/db/prisma';

/**
 * Registro con verificación diferida: la cuenta y la sesión se crean de
 * inmediato (estado REGISTERED_UNVERIFIED); el correo de verificación se
 * envía sin bloquear el flujo. Ver docs/Flujo_App_Acierta_v1.0.md §4.1.
 */
export async function signUpAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = signUpSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return { status: 'error', fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { email, password } = parsed.data;
  const next = (formData.get('next') as string) || '/app';
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${getSiteUrl()}/auth/confirm?next=/app` },
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

  try {
    await prisma.userProfile.upsert({
      where: { userId: data.user.id },
      create: { userId: data.user.id, role: 'STUDENT', onboardingStep: 0 },
      update: {},
    });
  } catch {
    return {
      status: 'error',
      message:
        'Tu cuenta se creó, pero no pudimos preparar tu perfil. Intenta iniciar sesión en un momento.',
    };
  }

  if (!session) {
    redirect('/login?registered=1');
  }

  redirect(next);
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

  const next = (formData.get('next') as string) || '/app';
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    // Nunca revelar si fue el correo o la contraseña (Flujo_App §4.2).
    return { status: 'error', message: 'Correo o contraseña incorrectos.' };
  }

  redirect(next);
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

  const { error } = await supabase.auth.resend({ type: 'signup', email: user.email });

  if (error) {
    return {
      status: 'error',
      message: 'No pudimos reenviar el correo. Intenta de nuevo en unos minutos.',
    };
  }

  return { status: 'success', message: 'Te reenviamos el enlace de verificación.' };
}
