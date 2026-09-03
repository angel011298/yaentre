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
    // G67 🔴 — CORREGIDO: esto usaba `$queryRaw`, y `pg_advisory_xact_lock`
    // devuelve `void`. Prisma no sabe deserializar una columna `void` y
    // LANZA en cada llamada: "Failed to deserialize column of type 'void'".
    // Confirmado contra la base real, sin ninguna condición especial —
    // rompía el 100% de las veces, no un caso raro.
    //
    // Alcance real: esta función es TODO el candado de G60 contra el doble
    // simulacro gratis y la doble sesión de diagnóstico
    // (`startSimulation`/`startDiagnosticSession`, los únicos dos
    // llamadores). Como el candado se creó el 31 de agosto y los datos de
    // prueba más recientes de sesiones son del 25 de julio, **ninguna sesión
    // de simulacro o diagnóstico se pudo abrir exitosamente desde que G60 se
    // desplegó** — no era una condición de carrera sin cerrar del todo, era
    // el flujo completo caído. `$executeRaw` no intenta deserializar
    // columnas (solo informa cuántas filas tocó la sentencia), así que
    // esquiva el problema sin cambiar la semántica de la sentencia. Verificado
    // en vivo: (1) ya no lanza, (2) el candado SÍ serializa de verdad — una
    // segunda transacción con la misma clave esperó a que la primera hiciera
    // commit antes de adquirirlo (`pnpm security:abuse`).
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${userProfileId}::text, 0))`;
    return fn(tx);
  });
}
