import 'server-only';
import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';

/**
 * G99 — lectura de la bitácora para `/admin/bitacora`.
 *
 * La tabla NO es legible desde el navegador: tiene RLS habilitada SIN ninguna
 * política permisiva y sin GRANT a `anon`/`authenticated` (migración 0016).
 * Todo lo que se ve en la pestaña pasa por aquí, es decir, por Prisma con el
 * rol de la app, detrás de `requireRole('ADMIN')`.
 */

export const AUDIT_PAGE_SIZE = 50;

export interface AuditRow {
  id: string;
  action: string;
  actorEmail: string | null;
  actorUserProfileId: string | null;
  targetUserProfileId: string | null;
  targetKind: string;
  reason: string | null;
  metadata: Prisma.JsonValue;
  createdAt: Date;
}

export interface AuditPage {
  rows: AuditRow[];
  total: number;
  page: number;
  pageSize: number;
  actions: string[];
}

export async function listAuditLog(input: {
  actor: string;
  action: string;
  target: string;
  page: number;
}): Promise<AuditPage> {
  const page = Math.max(1, input.page);

  const where: Prisma.AdminAuditLogWhereInput = {};
  if (input.actor.trim()) {
    where.actorEmail = { contains: input.actor.trim(), mode: 'insensitive' };
  }
  if (input.action.trim()) {
    where.action = input.action.trim();
  }
  if (input.target.trim()) {
    where.targetUserProfileId = input.target.trim();
  }

  const [total, rows, distinct] = await Promise.all([
    prisma.adminAuditLog.count({ where }),
    prisma.adminAuditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * AUDIT_PAGE_SIZE,
      take: AUDIT_PAGE_SIZE,
      select: {
        id: true,
        action: true,
        actorEmail: true,
        actorUserProfileId: true,
        targetUserProfileId: true,
        targetKind: true,
        reason: true,
        metadata: true,
        createdAt: true,
      },
    }),
    // Las acciones REALMENTE presentes, para poblar el filtro sin una lista
    // en código que se desincronice cuando se añada una acción nueva.
    prisma.adminAuditLog.findMany({
      distinct: ['action'],
      select: { action: true },
      orderBy: { action: 'asc' },
    }),
  ]);

  return {
    rows,
    total,
    page,
    pageSize: AUDIT_PAGE_SIZE,
    actions: distinct.map((d) => d.action),
  };
}
