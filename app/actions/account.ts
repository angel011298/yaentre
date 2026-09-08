'use server';

import { redirect } from 'next/navigation';
import { AuthError } from '@/lib/auth/errors';
import { requireUser } from '@/lib/auth/guards';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { getSupabaseAdmin } from '@/lib/auth/supabase-admin';
import { anonymizeAndDeletePersonalData } from '@/lib/db/account';
import type { ActionState } from '@/lib/auth/types';
import { reportControlFailure } from '@/lib/observability/report';

/**
 * Eliminar cuenta (F17 tarea 3). Confirmación FUERTE: escribir el correo
 * exacto de la cuenta (no un simple checkbox) — mismo nivel de fricción
 * deliberada que usan Gmail/GitHub para esta acción irreversible.
 *
 * Anonimiza en vez de borrar los registros de pago que deben conservarse
 * (`anonymizeAndDeletePersonalData`, F17); la identidad de Auth (correo,
 * login) se borra aparte con privilegios de administrador. Si esa llamada
 * falla (p. ej. falta `SUPABASE_SERVICE_ROLE_KEY` en este entorno), los
 * datos personales YA se anonimizaron de todas formas — nunca se bloquea al
 * usuario por una dependencia de infraestructura opcional.
 */
export async function deleteAccountAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  let authUser;
  let profileId: string;
  try {
    const result = await requireUser();
    authUser = result.authUser;
    profileId = result.profile.id;
  } catch (err) {
    if (err instanceof AuthError) {
      return { status: 'error', message: err.message };
    }
    throw err;
  }

  const typedEmail = String(formData.get('confirmEmail') ?? '').trim().toLowerCase();
  const realEmail = authUser.email?.trim().toLowerCase();
  if (!realEmail || typedEmail !== realEmail) {
    return { status: 'error', message: 'Escribe tu correo exactamente para confirmar.' };
  }

  await anonymizeAndDeletePersonalData(profileId);

  try {
    await getSupabaseAdmin().auth.admin.deleteUser(authUser.id);
  } catch (err) {
    // G73b: la anonimización local ya corrió, pero la identidad en Auth sigue
    // viva. Eso es un borrado de datos INCOMPLETO —un derecho ARCO ejercido a
    // medias, con datos de un menor de por medio— y hasta ahora su único
    // rastro era un `console.error` mientras el usuario veía "cuenta
    // eliminada". Se sigue sin bloquear al usuario, pero ya no es invisible.
    reportControlFailure('account_deletion', 'degraded', err, { profileId });
  }

  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  redirect('/?accountDeleted=1');
}
