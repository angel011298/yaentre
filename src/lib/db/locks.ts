import { Prisma } from '@prisma/client';
import { prisma } from './prisma';

/**
 * Bloqueo de aplicación por usuario (G60). Serializa operaciones que, corridas
 * en paralelo para el MISMO usuario, romperían una invariante de negocio —
 * p. ej. dos pestañas abriendo un simulacro a la vez (un usuario FREE se
 * llevaría dos simulacros gratis) o dos cargas de /diagnostico creando dos
 * sesiones diagnósticas.
 *
 * Usa `pg_advisory_xact_lock`: el lock se toma DENTRO de la transacción y se
 * libera solo en COMMIT/ROLLBACK, así que es seguro con Supavisor en modo
 * transacción (`?pgbouncer=true`, ver G59 §6) — nunca queda un lock colgado
 * entre transacciones reasignadas. La clave es el hash de 64 bits del
 * `userProfileId`; una colisión de hash solo causaría una espera extra entre
 * dos usuarios distintos, jamás un dato incorrecto.
 *
 * Regla: hacer el trabajo de solo-lectura y sin efectos (resolver el contexto,
 * armar el set de reactivos) FUERA del `fn`; dentro del `fn`, únicamente la
 * re-verificación y la escritura que deben ser atómicas.
 */
export function withUserAdvisoryLock<T>(
  userProfileId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${userProfileId}::text, 0))`;
    return fn(tx);
  });
}
