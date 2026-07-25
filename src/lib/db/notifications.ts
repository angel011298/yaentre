import type { NotificationType } from '@prisma/client';
import { prisma } from './prisma';
import { isNotificationEnabled } from '@/lib/notifications/preferences';

/**
 * Orquestación de preferencias de notificación (F16). Capa fina sobre
 * `NotificationPreference` — la regla de qué significa "sin fila" (opt-in vs.
 * prendido por defecto) vive en el módulo puro `src/lib/notifications/preferences.ts`.
 */

export async function isNotificationTypeEnabled(
  userProfileId: string,
  type: NotificationType
): Promise<boolean> {
  const pref = await prisma.notificationPreference.findUnique({
    where: { userProfileId_type: { userProfileId, type } },
    select: { enabled: true },
  });
  return isNotificationEnabled(pref, type);
}

export async function setNotificationPreference(
  userProfileId: string,
  type: NotificationType,
  enabled: boolean
): Promise<void> {
  await prisma.notificationPreference.upsert({
    where: { userProfileId_type: { userProfileId, type } },
    create: { userProfileId, type, enabled },
    update: { enabled },
  });
}

/** IDs de perfiles con este tipo de notificación activo, de una lista candidata.
 *  Usado por los jobs de correo (cron, F16 tarea 8) para filtrar destinatarios
 *  sin cargar cada preferencia una por una. */
export async function filterEnabledForType(
  userProfileIds: string[],
  type: NotificationType
): Promise<Set<string>> {
  if (userProfileIds.length === 0) return new Set();

  const rows = await prisma.notificationPreference.findMany({
    where: { userProfileId: { in: userProfileIds }, type },
    select: { userProfileId: true, enabled: true },
  });
  const byId = new Map(rows.map((r) => [r.userProfileId, r.enabled]));

  const enabled = new Set<string>();
  for (const id of userProfileIds) {
    const pref = byId.has(id) ? { enabled: byId.get(id) as boolean } : null;
    if (isNotificationEnabled(pref, type)) enabled.add(id);
  }
  return enabled;
}
