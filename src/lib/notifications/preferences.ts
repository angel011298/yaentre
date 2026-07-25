import type { NotificationType } from '@prisma/client';

/**
 * Preferencias de notificación (F16 tarea 8/9). Módulo PURO: decide si un
 * tipo de correo está activo para un usuario a partir de la fila
 * `NotificationPreference` (o su ausencia).
 *
 * `NotificationPreference.enabled` por defecto es `true` a nivel de schema,
 * pero la regla de negocio (Flujo_App §13, "regla anti-spam") es que las
 * notificaciones MOTIVACIONALES son opt-in: sin fila = apagado. Los
 * recordatorios informativos (cuenta regresiva) están prendidos por
 * defecto, igual que el default del schema. La distinción vive aquí, no en
 * el schema, para no tener que tocar `prisma/schema.prisma`.
 */

const OPT_IN_TYPES: readonly NotificationType[] = ['PARENT_WEEKLY', 'STREAK_RISK'];

export function isOptInType(type: NotificationType): boolean {
  return OPT_IN_TYPES.includes(type);
}

export function isNotificationEnabled(
  pref: { enabled: boolean } | null,
  type: NotificationType
): boolean {
  if (pref) return pref.enabled;
  return !isOptInType(type);
}
