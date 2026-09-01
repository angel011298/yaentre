/**
 * Normalización de la cadena de conexión para el entorno serverless (G59).
 *
 * Módulo PURO: sin Prisma, sin red — se puede testear con casos fijos.
 *
 * ── El problema ──
 * En Vercel cada invocación corre en una instancia efímera con su propio pool
 * de Prisma. Si la cadena no lleva parámetros explícitos, Prisma abre hasta
 * `núcleos * 2 + 1` conexiones por instancia y espera como máximo 10 s por una
 * conexión libre antes de tirar `P2024`. Con un pico de tráfico (miles de
 * aspirantes abriendo el simulador a la misma hora) eso se traduce en errores
 * 500 que NO son de la base de datos: son de la cola del cliente.
 *
 * ── La política ──
 * Solo se tocan las conexiones que van al pooler en modo transacción (puerto
 * 6543 de Supavisor / `pgbouncer=true`). La conexión DIRECTA (`DIRECT_URL`,
 * puerto 5432) se deja intacta: la usan `prisma migrate` y los scripts
 * offline, donde un pool chico sería contraproducente.
 *
 * Nunca se sobreescribe un valor que el operador ya puso explícitamente en la
 * variable de entorno — solo se rellenan los que faltan.
 */

/** Puerto del pooler de Supabase (Supavisor) en modo transacción. */
export const TRANSACTION_POOLER_PORT = '6543';

/**
 * Valores por defecto que se inyectan cuando la cadena apunta al pooler.
 *
 * `pgbouncer=true`: OBLIGATORIO, y no es negociable por más tentador que se
 * vea quitarlo. Hace que Prisma desactive las sentencias preparadas con
 * nombre, al precio de envolver cada operación en
 * `BEGIN` / `DEALLOCATE ALL` / … / `COMMIT` — cuatro viajes de red por
 * consulta en vez de uno. Medido en G59 (`scripts/perf-pool-probe.ts`):
 * quitarlo baja a 1.0 viajes por operación y es 4.7× más rápido… en una sola
 * conexión secuencial. Con 8 clientes en paralelo, que es lo que de verdad
 * pasa con varias instancias lambda, los 8 fallaron con
 * `26000 prepared statement "sNN" does not exist` y
 * `42P05 ... already exists`: Supavisor reasigna la conexión de servidor entre
 * transacciones y la sentencia preparada ya no está ahí. O sea: el atajo se ve
 * perfecto en una prueba de escritorio y tumba el sitio bajo carga.
 *
 * La consecuencia de aceptar ese costo fijo es que la única palanca real es
 * hacer MENOS operaciones de Prisma por petición — de ahí el trabajo de N+1 de
 * G59 (ver docs/AUDITORIA_BACKEND.md).
 *
 * `connection_limit=5`: acotado pero suficiente para el paralelismo REAL de
 * una petición — el dashboard y la pantalla de progreso disparan sus loaders
 * con `Promise.all`, así que un límite de 1 (la receta clásica de Prisma para
 * lambdas) los serializaría y multiplicaría la latencia de la página. En modo
 * transacción el pooler multiplexa: estas 5 son conexiones al POOLER, no a
 * Postgres, así que no compiten contra `max_connections` (60 en esta
 * instancia, verificado en vivo).
 *
 * `pool_timeout=20`: el doble del default. Bajo pico es preferible encolar
 * 20 s que devolver `P2024` al alumno a media sesión.
 *
 * `connect_timeout=10`: margen para el arranque en frío de una lambda.
 */
export const SERVERLESS_POOL_DEFAULTS: Readonly<Record<string, string>> = {
  pgbouncer: 'true',
  connection_limit: '5',
  pool_timeout: '20',
  connect_timeout: '10',
};

/** ¿La cadena apunta al pooler en modo transacción? */
export function isTransactionPooler(url: URL): boolean {
  return url.port === TRANSACTION_POOLER_PORT || url.searchParams.get('pgbouncer') === 'true';
}

/**
 * Devuelve la cadena lista para el pool de una función serverless. Si la
 * cadena falta, es inválida o es una conexión directa, se devuelve tal cual —
 * este módulo nunca es el que decide si hay o no base de datos.
 */
export function serverlessDatabaseUrl(raw: string | undefined): string | undefined {
  if (!raw) return raw;

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return raw; // cadena rara: que Prisma se queje con su propio mensaje
  }

  if (!isTransactionPooler(url)) return raw;

  for (const [key, value] of Object.entries(SERVERLESS_POOL_DEFAULTS)) {
    if (!url.searchParams.has(key)) url.searchParams.set(key, value);
  }

  return url.toString();
}
