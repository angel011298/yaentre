import 'server-only';
import { prisma } from './prisma';

/**
 * G99 — capa de datos de la bóveda.
 *
 * 🔒 Requisito explícito del dueño: **los archivos subidos se guardan hasta que
 * el admin maestro los elimine.** En este archivo eso se traduce en que la
 * ÚNICA función que marca `deletedAt` es `softDeleteFile`, a la que solo llega
 * `deleteVaultFileAction` tras pasar la compuerta de maestro. No hay barrido,
 * ni caducidad, ni borrado por antigüedad, ni nada que corra solo.
 */

export interface VaultFileRow {
  id: string;
  path: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  uploadedByEmail: string | null;
  createdAt: Date;
}

/** Archivos vivos, más reciente primero. Los borrados quedan fuera. */
export async function listVaultFiles(): Promise<VaultFileRow[]> {
  return prisma.adminFile.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      path: true,
      originalName: true,
      mimeType: true,
      sizeBytes: true,
      sha256: true,
      uploadedByEmail: true,
      createdAt: true,
    },
  });
}

/** Total ocupado por los archivos VIVOS (el borrado lógico también quita el
 *  objeto del bucket, así que no cuenta). */
export async function vaultUsedBytes(): Promise<number> {
  const agg = await prisma.adminFile.aggregate({
    where: { deletedAt: null },
    _sum: { sizeBytes: true },
  });
  return agg._sum.sizeBytes ?? 0;
}

/** Un archivo vivo por id. `null` si no existe o ya se borró. */
export async function getVaultFile(id: string): Promise<VaultFileRow | null> {
  return prisma.adminFile.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      path: true,
      originalName: true,
      mimeType: true,
      sizeBytes: true,
      sha256: true,
      uploadedByEmail: true,
      createdAt: true,
    },
  });
}

export async function recordVaultFile(input: {
  path: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  uploadedById: string;
  uploadedByEmail: string | null;
}): Promise<{ id: string }> {
  return prisma.adminFile.create({ data: input, select: { id: true } });
}

/**
 * Borrado LÓGICO, condicionado a que siguiera vivo: si dos administradores
 * pulsan Borrar a la vez, solo uno ve `count === 1` y solo uno escribe la fila
 * de bitácora del borrado.
 */
export async function softDeleteFile(id: string): Promise<boolean> {
  const updated = await prisma.adminFile.updateMany({
    where: { id, deletedAt: null },
    data: { deletedAt: new Date() },
  });
  return updated.count === 1;
}

/** Revierte el borrado lógico: se usa si el objeto NO se pudo quitar del
 *  bucket, para que el listado no mienta diciendo que ya no está. */
export async function undoSoftDelete(id: string): Promise<void> {
  await prisma.adminFile.updateMany({ where: { id }, data: { deletedAt: null } });
}
