'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { AuthError } from '@/lib/auth/errors';
import { requireUser, requireUserPendingMfa } from '@/lib/auth/guards';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { getSiteUrl } from '@/lib/auth/site-url';
import { safeInternalPath } from '@/lib/auth/safe-redirect';
import { hasVerifiedTotp, normalizeTotpCode } from '@/lib/auth/mfa';
import { isGoogleAuthEnabled } from '@/lib/auth/google';
import { verifyPassword } from '@/lib/auth/verify-password';
import type { ActionState } from '@/lib/auth/types';
import { consumeAll, consumeRateLimit } from '@/lib/rate-limit/store';
import { currentClientIp } from '@/lib/rate-limit/request';
import type { ActionResult } from '@/lib/sessions/schemas';

/**
 * G100 — cuenta y seguridad: segundo factor (TOTP), Google y cambio de correo.
 *
 * Todo sale del guard (`requireUser` / `requireUserPendingMfa`): ningún
 * esquema recibe a quién afecta. Los ids de FACTOR que viajan (inscripción)
 * se comprueban contra los factores de la propia cuenta antes de usarse.
 */

function toError(err: unknown): { code: string; message: string } {
  if (err instanceof AuthError) return { code: err.code, message: err.message };
  return { code: 'UNKNOWN', message: 'Algo salió mal. Intenta de nuevo.' };
}

const TOO_MANY = 'Demasiados intentos con el código. Espera unos minutos y vuelve a intentar.';

// ─────────────────────────────── 2FA: activar ───────────────────────────────

export async function startTotpEnrollmentAction(): Promise<
  ActionResult<{ factorId: string; qrCode: string; secret: string }>
> {
  try {
    const { authUser } = await requireUser();
    if (hasVerifiedTotp(authUser.factors)) {
      return { ok: false, code: 'ALREADY_ENABLED', message: 'La verificación en dos pasos ya está activa.' };
    }
    const supabase = await createSupabaseServerClient();

    // Una inscripción abandonada deja un factor `unverified`; Supabase limita
    // cuántos puede haber, así que se limpian antes de empezar otra.
    for (const f of authUser.factors ?? []) {
      if (f.factor_type === 'totp' && f.status !== 'verified') {
        await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
    }

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      issuer: 'YaEntre',
      friendlyName: `YaEntre ${new Date().toISOString().slice(0, 10)}`,
    });
    if (error || !data) {
      return { ok: false, code: 'AUTH', message: 'No pudimos iniciar la activación. Intenta de nuevo.' };
    }
    return { ok: true, data: { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret } };
  } catch (err) {
    return { ok: false, ...toError(err) };
  }
}

const confirmSchema = z.object({ factorId: z.string().min(1).max(64), code: z.string().max(12) });

export async function confirmTotpEnrollmentAction(
  input: z.input<typeof confirmSchema>
): Promise<ActionResult<{ enabled: true }>> {
  try {
    const { authUser, profile } = await requireUser();
    const parsed = confirmSchema.safeParse(input);
    const code = parsed.success ? normalizeTotpCode(parsed.data.code) : null;
    if (!parsed.success || !code) {
      return { ok: false, code: 'VALIDATION', message: 'Escribe los 6 dígitos de tu app.' };
    }
    // El factor tiene que ser de ESTA cuenta (Supabase también lo exige).
    if (!(authUser.factors ?? []).some((f) => f.id === parsed.data.factorId)) {
      return { ok: false, code: 'VALIDATION', message: 'La activación expiró. Empieza de nuevo.' };
    }
    const gate = await consumeRateLimit('MFA_VERIFY', profile.id);
    if (!gate.allowed) return { ok: false, code: 'RATE_LIMIT', message: TOO_MANY };

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: parsed.data.factorId, code });
    if (error) {
      return { ok: false, code: 'BAD_CODE', message: 'Ese código no coincide. Revisa la hora de tu teléfono y vuelve a intentar.' };
    }
    return { ok: true, data: { enabled: true } };
  } catch (err) {
    return { ok: false, ...toError(err) };
  }
}

// ─────────────────────────────── 2FA: desactivar ───────────────────────────────

const disableSchema = z.object({ code: z.string().max(12) });

/** Exige un código vigente: con la sesión abierta en una computadora prestada
 *  no basta para quitarle el segundo factor a la cuenta. */
export async function disableTotpAction(
  input: z.input<typeof disableSchema>
): Promise<ActionResult<{ disabled: true }>> {
  try {
    const { authUser, profile } = await requireUser();
    const parsed = disableSchema.safeParse(input);
    const code = parsed.success ? normalizeTotpCode(parsed.data.code) : null;
    if (!code) return { ok: false, code: 'VALIDATION', message: 'Escribe los 6 dígitos de tu app.' };

    const factor = (authUser.factors ?? []).find((f) => f.factor_type === 'totp' && f.status === 'verified');
    if (!factor) return { ok: false, code: 'NOT_ENABLED', message: 'La verificación en dos pasos no está activa.' };

    const gate = await consumeRateLimit('MFA_VERIFY', profile.id);
    if (!gate.allowed) return { ok: false, code: 'RATE_LIMIT', message: TOO_MANY };

    const supabase = await createSupabaseServerClient();
    const verified = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
    if (verified.error) return { ok: false, code: 'BAD_CODE', message: 'Ese código no coincide.' };

    const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
    if (error) return { ok: false, code: 'AUTH', message: 'No pudimos desactivarla. Intenta de nuevo.' };
    return { ok: true, data: { disabled: true } };
  } catch (err) {
    return { ok: false, ...toError(err) };
  }
}

// ─────────────────────────────── 2FA: reto al iniciar sesión ───────────────────────────────

export async function verifyMfaChallengeAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  let session;
  try {
    session = await requireUserPendingMfa();
  } catch {
    redirect('/login');
  }
  const next = safeInternalPath(formData.get('next'), session.profile.role === 'PARENT' ? '/tutor' : '/app');
  if (!session.mfaPending) redirect(next);

  const code = normalizeTotpCode(formData.get('code'));
  if (!code) return { status: 'error', message: 'Escribe los 6 dígitos de tu app de autenticación.' };

  const gate = await consumeAll([
    ['MFA_VERIFY', session.profile.id],
    ['MFA_VERIFY_IP', `ip:${await currentClientIp()}`],
  ]);
  if (!gate.allowed) return { status: 'error', message: TOO_MANY };

  const factor = (session.authUser.factors ?? []).find((f) => f.factor_type === 'totp' && f.status === 'verified');
  if (!factor) redirect(next);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
  if (error) return { status: 'error', message: 'Ese código no coincide. Usa el más reciente de tu app.' };

  redirect(next);
}

// ─────────────────────────────── Google ───────────────────────────────

/** Desde /login y /registro. `next` se sanea a ruta interna (G60). */
export async function signInWithGoogleAction(formData: FormData): Promise<void> {
  if (!isGoogleAuthEnabled()) redirect('/login?error=google_disabled');
  const next = safeInternalPath(formData.get('next'), '');
  const callback = new URL('/auth/callback', getSiteUrl());
  if (next) callback.searchParams.set('next', next);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: callback.toString(), queryParams: { prompt: 'select_account' } },
  });
  if (error || !data.url) redirect('/login?error=google_failed');
  redirect(data.url);
}

/** Vincula Google a la cuenta ACTUAL (requiere «Manual linking» en Supabase). */
export async function linkGoogleAction(): Promise<void> {
  if (!isGoogleAuthEnabled()) redirect('/app/perfil?google=disabled#seguridad');
  try {
    await requireUser();
  } catch {
    redirect('/login?next=/app/perfil');
  }
  const callback = new URL('/auth/callback', getSiteUrl());
  callback.searchParams.set('next', '/app/perfil?google=linked#seguridad');

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.linkIdentity({
    provider: 'google',
    options: { redirectTo: callback.toString() },
  });
  if (error || !data.url) redirect('/app/perfil?google=failed#seguridad');
  redirect(data.url);
}

export async function unlinkGoogleAction(): Promise<ActionResult<{ unlinked: true }>> {
  try {
    const { authUser } = await requireUser();
    const identities = authUser.identities ?? [];
    const google = identities.find((i) => i.provider === 'google');
    if (!google) return { ok: false, code: 'NOT_LINKED', message: 'Google no está vinculado.' };
    // Sin otra forma de entrar, desvincular dejaría la cuenta inaccesible.
    if (identities.length < 2) {
      return {
        ok: false,
        code: 'LAST_IDENTITY',
        message: 'Crea una contraseña antes de desvincular Google, o te quedarías sin forma de entrar.',
      };
    }
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.unlinkIdentity(google);
    if (error) return { ok: false, code: 'AUTH', message: 'No pudimos desvincular Google. Intenta de nuevo.' };
    return { ok: true, data: { unlinked: true } };
  } catch (err) {
    return { ok: false, ...toError(err) };
  }
}

// ─────────────────────────────── Cambio de correo ───────────────────────────────

const emailChangeSchema = z.object({
  newEmail: z.string().trim().toLowerCase().email('Escribe un correo válido.').max(254),
  currentPassword: z.string().max(72).optional(),
});

/**
 * Supabase manda confirmación al correo NUEVO y al ACTUAL («Secure email
 * change»); el cambio se aplica al confirmar, por `/auth/confirm` con
 * `type=email_change` (plantilla en docs/CORREOS_AUTH.md §4.4). Con
 * contraseña, se pide la actual: una sesión abierta en otro equipo no basta
 * para llevarse la cuenta a otro correo.
 */
export async function changeEmailAction(
  input: z.input<typeof emailChangeSchema>
): Promise<ActionResult<{ pendingEmail: string }>> {
  try {
    const { authUser, profile } = await requireUser();
    const parsed = emailChangeSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, code: 'VALIDATION', message: parsed.error.issues[0]?.message ?? 'Correo inválido.' };
    }
    const { newEmail, currentPassword } = parsed.data;
    if (newEmail === authUser.email?.toLowerCase()) {
      return { ok: false, code: 'VALIDATION', message: 'Ese ya es tu correo.' };
    }

    const gate = await consumeRateLimit('EMAIL_CHANGE', profile.id);
    if (!gate.allowed) {
      return { ok: false, code: 'RATE_LIMIT', message: 'Demasiados intentos. Espera un rato y vuelve a intentar.' };
    }

    const hasPassword = (authUser.identities ?? []).some((i) => i.provider === 'email');
    if (hasPassword) {
      if (!authUser.email || !currentPassword || !(await verifyPassword(authUser.email, currentPassword))) {
        return { ok: false, code: 'BAD_CURRENT_PASSWORD', message: 'Tu contraseña actual no coincide.' };
      }
    }

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.updateUser(
      { email: newEmail },
      { emailRedirectTo: `${getSiteUrl()}/auth/confirm?next=/app/perfil` }
    );
    if (error) {
      // No revelar si el correo ya pertenece a otra cuenta.
      return { ok: false, code: 'AUTH', message: 'No pudimos iniciar el cambio con ese correo. Revisa que esté bien escrito.' };
    }
    return { ok: true, data: { pendingEmail: newEmail } };
  } catch (err) {
    return { ok: false, ...toError(err) };
  }
}

// ─────────────────────────────── Sesiones ───────────────────────────────

/**
 * Cierra la sesión en TODOS los dispositivos (revoca los refresh tokens de la
 * cuenta). Es la respuesta a «dejé abierta mi sesión en la compu de la
 * prepa»: el token de acceso de los otros equipos deja de renovarse.
 */
export async function signOutEverywhereAction(): Promise<void> {
  try {
    await requireUser();
  } catch {
    redirect('/login');
  }
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut({ scope: 'global' });
  redirect('/login?signedOutEverywhere=1');
}
