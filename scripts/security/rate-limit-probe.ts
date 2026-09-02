import '../lib/env';

/**
 * G65 — Sonda ACTIVA del límite de tasa distribuido.
 *
 * Comprueba contra la base REAL que el contador de `app_security.rate_limit_hits`
 * (migración 0013) hace lo que dice: cuenta, bloquea en el presupuesto exacto,
 * separa sujetos, y —lo que el limitador en memoria NO hacía— sobrevive a que
 * el conteo venga de "instancias" distintas, simulado aquí con llamadas
 * concurrentes contra el mismo cubo.
 *
 * Uso: pnpm security:ratelimit
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });

const results: Array<{ id: string; ok: boolean; detalle: string }> = [];
function record(id: string, ok: boolean, detalle: string): void {
  results.push({ id, ok, detalle });
}

async function main(): Promise<void> {
  const { consumeRateLimit, resetRateLimit, RATE_LIMITS } = await import('../../src/lib/rate-limit/store');

  const sujeto = `g65-probe-${Date.now()}`;

  // ── 1. El presupuesto de login bloquea exactamente en el límite ────────────
  {
    const { limit } = RATE_LIMITS.SIGN_IN;
    await resetRateLimit('SIGN_IN', sujeto);
    const veredictos = [];
    for (let i = 0; i < limit + 3; i++) {
      veredictos.push(await consumeRateLimit('SIGN_IN', sujeto));
    }
    const permitidos = veredictos.filter((v) => v.allowed).length;
    record(
      'L1-corta-en-el-limite',
      permitidos === limit,
      `${permitidos} permitidos de ${limit + 3} intentos (presupuesto ${limit})`
    );
    const bloqueado = veredictos[veredictos.length - 1];
    record(
      'L2-retry-after',
      !bloqueado.allowed && bloqueado.retryAfterSecs > 0,
      `el bloqueo informa Retry-After = ${bloqueado.retryAfterSecs} s`
    );
    await resetRateLimit('SIGN_IN', sujeto);
  }

  // ── 2. Sujetos distintos no comparten cubo ────────────────────────────────
  {
    const otro = `${sujeto}-otro`;
    await resetRateLimit('SIGN_IN', sujeto);
    await resetRateLimit('SIGN_IN', otro);
    for (let i = 0; i < RATE_LIMITS.SIGN_IN.limit + 1; i++) {
      await consumeRateLimit('SIGN_IN', sujeto);
    }
    const v = await consumeRateLimit('SIGN_IN', otro);
    record('L3-aisla-sujetos', v.allowed, `el segundo sujeto sigue permitido (${v.hits} usos)`);
    await resetRateLimit('SIGN_IN', sujeto);
    await resetRateLimit('SIGN_IN', otro);
  }

  // ── 3. Alcances distintos no comparten cubo ───────────────────────────────
  {
    await resetRateLimit('SIGN_IN', sujeto);
    await resetRateLimit('PARENT_LINK_REDEEM', sujeto);
    for (let i = 0; i < RATE_LIMITS.SIGN_IN.limit + 1; i++) {
      await consumeRateLimit('SIGN_IN', sujeto);
    }
    const v = await consumeRateLimit('PARENT_LINK_REDEEM', sujeto);
    record('L4-aisla-alcances', v.allowed, `otro alcance para el mismo sujeto sigue permitido`);
    await resetRateLimit('SIGN_IN', sujeto);
    await resetRateLimit('PARENT_LINK_REDEEM', sujeto);
  }

  // ── 4. Concurrencia: es lo que el contador en memoria no podía ─────────────
  //
  // 30 llamadas EN PARALELO contra el mismo cubo. Con un contador por proceso
  // (leer-modificar-escribir en un Map, o una instancia Edge por petición) el
  // conteo se pierde; con el INSERT .. ON CONFLICT atómico tienen que salir 30
  // usos consecutivos, sin repetidos ni huecos.
  {
    await resetRateLimit('ADAPTIVE', sujeto);
    const veredictos = await Promise.all(
      Array.from({ length: 30 }, () => consumeRateLimit('ADAPTIVE', sujeto))
    );
    const hits = veredictos.map((v) => v.hits).sort((a, b) => a - b);
    const esperado = Array.from({ length: 30 }, (_, i) => i + 1);
    const exacto = hits.join(',') === esperado.join(',');
    record(
      'L5-atomico-en-paralelo',
      exacto,
      exacto
        ? '30 llamadas concurrentes → contadores 1..30 sin colisiones'
        : `contadores observados: ${hits.join(',')}`
    );
    await resetRateLimit('ADAPTIVE', sujeto);
  }

  // ── 5. El canje del código parental: presupuesto contra fuerza bruta ───────
  {
    const { limit, windowSecs } = RATE_LIMITS.PARENT_LINK_REDEEM;
    const intentosPorVentana = limit;
    // 10^6 combinaciones; TTL del código = 10 min = la ventana del límite.
    const probabilidadPorVentana = intentosPorVentana / 1_000_000;
    record(
      'L6-codigo-parental',
      probabilidadPorVentana < 0.0001,
      `${intentosPorVentana} intentos por ventana de ${windowSecs} s ⇒ ` +
        `probabilidad de acertar un código vivo ≈ 1 entre ${Math.round(1 / probabilidadPorVentana).toLocaleString('es-MX')}`
    );
  }

  console.log('G65 — sonda del límite de tasa distribuido\n');
  console.log('┌─ Resultado ──────────────────────────────────────────────────');
  for (const r of results) {
    console.log(`│ ${r.ok ? '✅' : '❌'} ${r.id.padEnd(24)} ${r.detalle}`);
  }
  console.log('└──────────────────────────────────────────────────────────────');
  if (results.some((r) => !r.ok)) process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
