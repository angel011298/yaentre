/**
 * scripts/g99b/ip-spoof-probe.mjs — G99b.  `pnpm security:ip-spoof [baseUrl]`
 *
 * ── VERIFICACIÓN POR EFECTO DE QUE LA IP DEL CLIENTE NO SE PUEDE FALSEAR ────
 *
 * Todo el límite de tasa por IP (el de memoria de `proxy.ts` y el compartido de
 * Postgres de login/registro/recuperación) cuelga de `resolveClientIp`
 * (src/lib/rate-limit/client-ip.ts). En Vercel la plataforma reescribe las
 * cabeceras de IP; detrás de Cloudflare Tunnel NO: Cloudflare deja pasar la
 * `x-vercel-forwarded-for` que mande el cliente y AÑADE en `x-forwarded-for`.
 * Por eso el contenedor corre con TRUSTED_PROXY=cloudflare y solo confía en
 * `cf-connecting-ip`, que el borde de Cloudflare sobreescribe siempre.
 *
 * La sonda manda 70 peticiones a una ruta `/api/…` que NO existe (ninguna llega
 * a un handler: solo pasa por el proxy, 404 hasta el límite de 60/min y 429
 * después), cambiando en cada petición las cabeceras que un atacante elegiría.
 * Si la IP se pudiera falsear, cada petición caería en un cubo distinto y
 * nunca aparecería un 429.
 *
 *   control       mismas cabeceras siempre          → DEBE bloquear
 *   rotar-*       cabeceras falseables rotando       → DEBE bloquear igual
 *
 * ── EL ROJO ES ALCANZABLE ───────────────────────────────────────────────────
 * Contra un build sin TRUSTED_PROXY=cloudflare (o el código anterior a G99b)
 * servido sin Vercel delante, `rotar-vercel` y `rotar-xff` dan 70×404 y
 * ningún 429 — medido en G99b. Contra producción a través del túnel, mandar
 * `cf-connecting-ip` a mano tampoco sirve: el borde la sobreescribe.
 *
 * Efecto secundario: deja el cubo de TU IP bloqueado ~1 minuto en esas rutas
 * inexistentes. No escribe en la base (el limitador de /api es el de memoria).
 *
 * Uso: pnpm security:ip-spoof https://nuevo.yaentre.com
 */
const base = (process.argv[2] ?? 'http://127.0.0.1:3000').replace(/\/$/, '');
const N = 70;

async function correr(modo) {
  const ruta = `/api/__sonda-ip-${modo}-${Date.now()}`; // cubo nuevo por corrida
  const statuses = {};
  let primer429 = null;
  for (let i = 1; i <= N; i++) {
    const falsa = `10.${(i >> 8) & 255}.${i & 255}.${(i * 7) & 255}`;
    const h = {};
    if (modo === 'control') {
      h['x-vercel-forwarded-for'] = '203.0.113.7';
      h['x-forwarded-for'] = '203.0.113.7';
    } else if (modo === 'rotar-vercel') {
      h['x-vercel-forwarded-for'] = falsa;
    } else if (modo === 'rotar-xff') {
      h['x-forwarded-for'] = `${falsa}, 198.51.100.23`;
    } else if (modo === 'rotar-cf') {
      // Solo tiene sentido a través de Cloudflare: ahí el borde la sobreescribe.
      h['cf-connecting-ip'] = falsa;
    } else if (modo === 'rotar-todas') {
      h['x-vercel-forwarded-for'] = falsa;
      h['x-forwarded-for'] = `${falsa}, 198.51.100.23`;
      h['x-real-ip'] = falsa;
    }
    const res = await fetch(base + ruta, { headers: h, redirect: 'manual' });
    statuses[res.status] = (statuses[res.status] ?? 0) + 1;
    if (res.status === 429 && primer429 === null) primer429 = i;
    await res.arrayBuffer();
  }
  return { modo, statuses, primer429, bloquea: primer429 !== null };
}

const viaCloudflare = /^https:\/\//.test(base) && !/localhost|127\.0\.0\.1/.test(base);
const modos = ['control', 'rotar-vercel', 'rotar-xff', 'rotar-todas', ...(viaCloudflare ? ['rotar-cf'] : [])];
const resultados = [];
for (const m of modos) resultados.push(await correr(m));
console.log(`Sonda de suplantación de IP contra ${base}`);
console.table(resultados.map((r) => ({ ...r, statuses: JSON.stringify(r.statuses) })));

const control = resultados.find((r) => r.modo === 'control');
if (!control.bloquea) {
  console.log('SIN CONCLUSIÓN: el control no llegó a 429 — el limitador no está actuando o la URL no es la app.');
  process.exit(2);
}
const evadidos = resultados.filter((r) => !r.bloquea);
if (evadidos.length > 0) {
  console.log(`ROJO: la IP se puede falsear con: ${evadidos.map((r) => r.modo).join(', ')}`);
  process.exit(1);
}
console.log('VERDE: ningún modo de suplantación evade el límite por IP.');
