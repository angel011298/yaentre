/**
 * Límite de tasa básico (F20 tarea 5), ventana fija en memoria. Vive en el
 * mismo proceso Edge que corre `proxy.ts` — NO es distribuido: cada
 * instancia/región de Vercel Edge mantiene su propio conteo, así que el
 * límite real bajo tráfico multi-región es más generoso que el nominal.
 * Suficiente para frenar abuso evidente (scripts, fuerza bruta) sin depender
 * de infraestructura extra (Redis/Upstash) — pendiente documentado en
 * docs/ESTADO.md si el tráfico real algún día lo justifica.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Purga entradas vencidas de vez en cuando (no en cada request) para que el
// mapa no crezca sin límite en una instancia de larga vida.
const CLEANUP_INTERVAL_MS = 60_000;
let lastCleanup = 0;

function cleanupExpired(now: number): void {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  /** Segundos hasta que la ventana actual expire (0 si `allowed`). */
  retryAfterSecs: number;
}

/**
 * Ventana fija de `windowMs` por `key`: hasta `limit` peticiones, luego
 * bloquea hasta que la ventana expire. Simple y suficiente para un límite
 * "básico" — no es una ventana deslizante ni un token bucket.
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now()
): RateLimitResult {
  cleanupExpired(now);

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSecs: 0 };
  }

  if (bucket.count >= limit) {
    return { allowed: false, retryAfterSecs: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
  }

  bucket.count += 1;
  return { allowed: true, retryAfterSecs: 0 };
}

/** Solo para tests: limpia todo el estado en memoria entre casos. */
export function resetRateLimitState(): void {
  buckets.clear();
  lastCleanup = 0;
}
