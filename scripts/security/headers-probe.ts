import '../lib/env';
import { posthogCspHosts } from '../../src/lib/analytics/posthog-hosts';

/**
 * G65 — Verificación de cabeceras de seguridad contra la URL PÚBLICA REAL.
 *
 * No lee `next.config.ts`: pide la página a https://yaentre.com y comprueba lo
 * que de verdad llega al navegador. Es la diferencia entre "está configurado"
 * y "está activo" — un `headers()` de Next puede quedar anulado por la CDN,
 * por un rewrite o por un despliegue que no incluyó el cambio.
 *
 * Uso:  pnpm security:headers  [--url https://otra-url]
 */

const argUrl = process.argv.indexOf('--url');
const BASE = argUrl > -1 ? process.argv[argUrl + 1] : 'https://yaentre.com';

interface Check {
  cabecera: string;
  ok: boolean;
  detalle: string;
}

const checks: Check[] = [];

/** Mismo criterio que el cliente: una llave placeholder no inicializa PostHog. */
function isPostHogConfigured(): boolean {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  return Boolean(key) && !key!.startsWith('your-') && !key!.includes('placeholder');
}

function must(headers: Headers, name: string, predicado: (v: string) => boolean, esperado: string): void {
  const value = headers.get(name);
  if (!value) {
    checks.push({ cabecera: name, ok: false, detalle: `AUSENTE (se esperaba ${esperado})` });
    return;
  }
  checks.push({
    cabecera: name,
    ok: predicado(value),
    detalle: predicado(value) ? value.slice(0, 120) : `${value.slice(0, 120)} — se esperaba ${esperado}`,
  });
}

async function main(): Promise<void> {
  console.log(`G65 — cabeceras de seguridad en vivo contra ${BASE}\n`);

  const res = await fetch(BASE, { redirect: 'follow' });
  const h = res.headers;
  const csp = h.get('content-security-policy') ?? '';

  must(h, 'strict-transport-security', (v) => /max-age=(\d+)/.test(v) && Number(/max-age=(\d+)/.exec(v)![1]) >= 15552000, 'max-age ≥ 180 días');
  must(h, 'x-content-type-options', (v) => v.toLowerCase() === 'nosniff', 'nosniff');
  must(h, 'x-frame-options', (v) => /deny|sameorigin/i.test(v), 'DENY');
  must(h, 'referrer-policy', (v) => v.length > 0, 'una política definida');
  must(h, 'permissions-policy', (v) => v.length > 0, 'una política definida');
  must(h, 'content-security-policy', (v) => v.includes("default-src 'self'"), "default-src 'self'");

  // Directivas concretas de la CSP.
  for (const [directiva, esperado] of [
    ['frame-ancestors', "frame-ancestors 'none'"],
    ['object-src', "object-src 'none'"],
    ['base-uri', "base-uri 'self'"],
    ['form-action', "form-action 'self'"],
  ] as const) {
    checks.push({
      cabecera: `CSP ${directiva}`,
      ok: csp.includes(esperado),
      detalle: csp.includes(esperado) ? esperado : `falta "${esperado}"`,
    });
  }

  // G71: la CSP tiene que permitir los DOS orígenes de PostHog. Permitir solo
  // el de ingesta dejaba `config.js` bloqueado en cada carga de página, sin
  // más señal que un error de consola — los eventos seguían llegando, así que
  // ninguna métrica lo delataba.
  if (isPostHogConfigured()) {
    const [apiHost, assetsHost] = posthogCspHosts(process.env.NEXT_PUBLIC_POSTHOG_HOST);
    const scriptSrc = /(?:^|;)\s*script-src\s([^;]*)/.exec(csp)?.[1] ?? '';
    const connectSrc = /(?:^|;)\s*connect-src\s([^;]*)/.exec(csp)?.[1] ?? '';
    checks.push({
      cabecera: 'CSP connect-src PostHog',
      ok: connectSrc.includes(apiHost),
      detalle: connectSrc.includes(apiHost) ? apiHost : `falta ${apiHost} en connect-src`,
    });
    if (assetsHost && assetsHost !== apiHost) {
      const ok = scriptSrc.includes(assetsHost) && connectSrc.includes(assetsHost);
      checks.push({
        cabecera: 'CSP assets de PostHog',
        ok,
        detalle: ok
          ? `${assetsHost} permitido en script-src y connect-src`
          : `falta ${assetsHost} (script-src: ${scriptSrc.includes(assetsHost)}, connect-src: ${connectSrc.includes(assetsHost)}) — config.js queda bloqueado`,
      });
    }
  }

  // Lo que NO debe estar.
  const powered = h.get('x-powered-by');
  checks.push({
    cabecera: 'x-powered-by',
    ok: powered === null,
    detalle: powered === null ? 'ausente (correcto)' : `expone "${powered}"`,
  });

  // HTTP debe redirigir a HTTPS.
  const plano = await fetch(BASE.replace('https://', 'http://'), { redirect: 'manual' });
  const location = plano.headers.get('location') ?? '';
  checks.push({
    cabecera: 'http → https',
    ok: plano.status >= 300 && plano.status < 400 && location.startsWith('https://'),
    detalle: `HTTP ${plano.status} → ${location || '(sin Location)'}`,
  });

  console.log('┌─ Resultado ──────────────────────────────────────────────────');
  for (const c of checks) {
    console.log(`│ ${c.ok ? '✅' : '❌'} ${c.cabecera.padEnd(30)} ${c.detalle}`);
  }
  console.log('└──────────────────────────────────────────────────────────────');
  const fallos = checks.filter((c) => !c.ok);
  console.log(`\n${checks.length - fallos.length}/${checks.length} comprobaciones en verde.`);
  if (fallos.length > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
