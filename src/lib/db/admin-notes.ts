import 'server-only';
import { prisma } from './prisma';

/**
 * Notas del panel de administración — apartado dentro de /admin/boveda.
 *
 * Persistidas en Postgres: es lo que hace que sean las MISMAS sin importar en
 * qué dispositivo o sesión se abran, en el momento que sea. localStorage
 * queda descartado por diseño para esto — vive por navegador, no por cuenta,
 * y no sobrevive a abrir el panel en un equipo distinto.
 */

export interface AdminNoteRow {
  id: string;
  content: string;
  authorEmail: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const SELECT_FIELDS = {
  id: true,
  content: true,
  authorEmail: true,
  createdAt: true,
  updatedAt: true,
} as const;

/** Tope de listado: son apuntes internos, no un archivo que crezca sin fin,
 *  pero una cota evita que una sesión descontrolada vuelva la consulta cara. */
const NOTES_LIST_LIMIT = 300;

export async function listNotes(): Promise<AdminNoteRow[]> {
  return prisma.adminNote.findMany({
    orderBy: { createdAt: 'desc' },
    take: NOTES_LIST_LIMIT,
    select: SELECT_FIELDS,
  });
}

export async function createNote(input: {
  content: string;
  authorId: string;
  authorEmail: string | null;
}): Promise<AdminNoteRow> {
  return prisma.adminNote.create({
    data: {
      content: input.content,
      authorId: input.authorId,
      authorEmail: input.authorEmail,
    },
    select: SELECT_FIELDS,
  });
}

/**
 * Devuelve la nota borrada (para el metadato de la bitácora) o `null` si ya
 * no existía. Se comprueba la existencia ANTES de borrar en vez de atrapar el
 * error de Prisma: mismo estilo que `cancelSubscription` en
 * `src/lib/db/admin-users.ts`.
 */
export async function deleteNote(id: string): Promise<AdminNoteRow | null> {
  const existing = await prisma.adminNote.findUnique({ where: { id }, select: SELECT_FIELDS });
  if (!existing) return null;
  await prisma.adminNote.delete({ where: { id } });
  return existing;
}
