import { describe, it, expect } from 'vitest';
import {
  serverlessDatabaseUrl,
  isTransactionPooler,
  SERVERLESS_POOL_DEFAULTS,
} from '@/lib/db/connection-url';

/**
 * G59. La cadena de conexión es la pieza que más barato se rompe y más caro se
 * paga: `DATABASE_URL` vive en el panel de Vercel, así que basta con que
 * alguien la reescriba sin parámetros para que la app se degrade en silencio
 * hasta el primer pico de tráfico. Estos casos fijan la política.
 */

const POOLED = 'postgresql://u.ref:pw@aws-0-us-east-1.pooler.supabase.com:6543/postgres';
const DIRECT = 'postgresql://u.ref:pw@aws-0-us-east-1.pooler.supabase.com:5432/postgres';

function params(url: string): URLSearchParams {
  return new URL(url).searchParams;
}

describe('serverlessDatabaseUrl', () => {
  it('rellena los parámetros de pool cuando la cadena va al pooler', () => {
    const p = params(serverlessDatabaseUrl(POOLED)!);
    for (const [key, value] of Object.entries(SERVERLESS_POOL_DEFAULTS)) {
      expect(p.get(key), key).toBe(value);
    }
  });

  it('mantiene pgbouncer=true — sin él, la concurrencia real rompe con 26000', () => {
    // Medido en G59: quitarlo es 4.7× más rápido en una conexión y falla en
    // las 8 con clientes en paralelo. Nunca debe desaparecer de la cadena.
    expect(params(serverlessDatabaseUrl(POOLED)!).get('pgbouncer')).toBe('true');
  });

  it('NO toca la conexión directa (migraciones y scripts offline)', () => {
    expect(serverlessDatabaseUrl(DIRECT)).toBe(DIRECT);
  });

  it('respeta un valor que el operador puso a mano', () => {
    const explicito = `${POOLED}?connection_limit=17&pgbouncer=true`;
    const p = params(serverlessDatabaseUrl(explicito)!);
    expect(p.get('connection_limit')).toBe('17');
    // Y aun así completa los que faltaban.
    expect(p.get('pool_timeout')).toBe(SERVERLESS_POOL_DEFAULTS.pool_timeout);
  });

  it('reconoce el pooler por el parámetro aunque el puerto sea otro', () => {
    const raro = 'postgresql://u:pw@proxy.interno:5432/postgres?pgbouncer=true';
    expect(params(serverlessDatabaseUrl(raro)!).get('connection_limit')).toBe(
      SERVERLESS_POOL_DEFAULTS.connection_limit
    );
  });

  it('devuelve la entrada tal cual si falta o es inválida (que se queje Prisma)', () => {
    expect(serverlessDatabaseUrl(undefined)).toBeUndefined();
    expect(serverlessDatabaseUrl('')).toBe('');
    expect(serverlessDatabaseUrl('no-es-una-url')).toBe('no-es-una-url');
  });

  it('es idempotente: aplicarla dos veces da lo mismo', () => {
    const una = serverlessDatabaseUrl(POOLED)!;
    expect(serverlessDatabaseUrl(una)).toBe(una);
  });
});

describe('isTransactionPooler', () => {
  it('detecta el puerto 6543 de Supavisor', () => {
    expect(isTransactionPooler(new URL(POOLED))).toBe(true);
  });

  it('no confunde la conexión directa del 5432', () => {
    expect(isTransactionPooler(new URL(DIRECT))).toBe(false);
  });
});
