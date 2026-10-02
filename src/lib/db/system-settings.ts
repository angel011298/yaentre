import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';

/**
 * G100 — ajustes del sistema (`system_settings`). Las claves son un tipo
 * cerrado aquí, no un enum de base: añadir una no exige migración, y un typo
 * no compila.
 */
export type SystemSettingKey =
  /** Último inicio del job horario de recordatorios: `{ at: ISO }`. */
  'cron.reminders.lastRunAt';

export async function readSystemSetting(key: SystemSettingKey): Promise<Prisma.JsonValue | null> {
  const row = await prisma.systemSetting.findUnique({ where: { key }, select: { value: true } });
  return row?.value ?? null;
}

export async function writeSystemSetting(
  key: SystemSettingKey,
  value: Prisma.InputJsonValue,
  updatedBy: string | null = null
): Promise<void> {
  await prisma.systemSetting.upsert({
    where: { key },
    create: { key, value, updatedBy },
    update: { value, updatedBy },
  });
}

export async function readTimestampSetting(key: SystemSettingKey): Promise<Date | null> {
  const value = await readSystemSetting(key);
  if (value && typeof value === 'object' && !Array.isArray(value) && typeof value.at === 'string') {
    const d = new Date(value.at);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}
