import { PrismaClient } from '@prisma/client';
import { serverlessDatabaseUrl } from './connection-url';

/**
 * Singleton de Prisma para TODO el runtime de la app (RSC, Server Actions,
 * Route Handlers). Ver `./connection-url.ts` para la política de pool.
 *
 * G59: dos cambios respecto de la versión anterior, ambos por el entorno
 * serverless de Vercel:
 *
 * 1. La cadena de conexión se normaliza (`connection_limit`, `pool_timeout`,
 *    `connect_timeout`) en vez de confiar en los defaults de Prisma. Se hace
 *    en CÓDIGO y no solo en la variable de entorno porque `DATABASE_URL` vive
 *    en el panel de Vercel: si alguien la reescribe sin los parámetros, la
 *    app se degrada en silencio hasta el primer pico de tráfico.
 *
 * 2. El cliente se cachea en `globalThis` SIEMPRE, no solo fuera de
 *    producción. El patrón original (cachear solo en dev) existe para que el
 *    HMR de Next no acumule clientes; pero en producción cada bundle de ruta
 *    puede evaluar este módulo por separado dentro de la MISMA instancia
 *    lambda, y cada evaluación abriría otro pool. Cachearlo siempre hace que
 *    una instancia tenga exactamente un pool, que es justo lo que el pooler
 *    espera. Nunca se llama `$disconnect()`: en serverless la conexión debe
 *    sobrevivir entre invocaciones de la misma instancia.
 */

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient(): PrismaClient {
  const url = serverlessDatabaseUrl(process.env.DATABASE_URL);
  return url ? new PrismaClient({ datasourceUrl: url }) : new PrismaClient();
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

globalForPrisma.prisma = prisma;
