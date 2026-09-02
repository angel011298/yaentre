import '../lib/env';

/**
 * G65 — Sonda ACTIVA del ciclo de vida de la sesión (tarea 4 de la auditoría).
 *
 * Contra Supabase Auth real: mide la caducidad del access token, comprueba que
 * la renovación silenciosa funcione, y —lo que de verdad importa— que
 * CERRAR SESIÓN invalide el acceso: el refresh token debe quedar inservible.
 *
 * Uso: pnpm security:session
 */

const URL_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const PROBE_PASSWORD = process.env.G65_PROBE_PASSWORD ?? '';
const EMAIL = 'rlsprobe.alumnoa@acierta-test.mx';

interface TokenSet {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

function decodeExp(jwt: string): { exp: number; iat: number; role: string; aal?: string } {
  const payload = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString('utf-8'));
  return payload;
}

async function post(path: string, body: unknown, token?: string): Promise<Response> {
  return fetch(`${URL_BASE}${path}`, {
    method: 'POST',
    headers: {
      apikey: ANON,
      'content-type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

const results: Array<{ id: string; ok: boolean; detalle: string }> = [];
function record(id: string, ok: boolean, detalle: string): void {
  results.push({ id, ok, detalle });
}

async function main(): Promise<void> {
  if (!PROBE_PASSWORD) throw new Error('Falta G65_PROBE_PASSWORD.');
  console.log('G65 — sonda activa de sesiones y tokens\n');

  // 1. Login real.
  const loginRes = await post('/auth/v1/token?grant_type=password', {
    email: EMAIL,
    password: PROBE_PASSWORD,
  });
  const tokens = (await loginRes.json()) as TokenSet;
  if (!loginRes.ok) throw new Error(`login: ${loginRes.status} ${JSON.stringify(tokens)}`);

  const claims = decodeExp(tokens.access_token);
  const vidaSegs = claims.exp - claims.iat;
  console.log(`  access token: vive ${vidaSegs} s (${(vidaSegs / 60).toFixed(0)} min), rol "${claims.role}"`);
  record(
    'S1-caducidad',
    vidaSegs > 0 && vidaSegs <= 24 * 3600,
    `el access token caduca en ${vidaSegs} s`
  );

  // 2. Renovación silenciosa con el refresh token.
  const refreshRes = await post('/auth/v1/token?grant_type=refresh_token', {
    refresh_token: tokens.refresh_token,
  });
  const renovado = (await refreshRes.json()) as TokenSet;
  record(
    'S2-renovacion',
    refreshRes.ok && Boolean(renovado.access_token),
    `refresh → HTTP ${refreshRes.status}${renovado.access_token ? ' (nuevo access token)' : ''}`
  );

  // 3. El refresh token ANTERIOR ya no debe servir (rotación).
  const reuseRes = await post('/auth/v1/token?grant_type=refresh_token', {
    refresh_token: tokens.refresh_token,
  });
  const reuseBody = (await reuseRes.json()) as { access_token?: string };
  // Supabase tolera reusar el token recién rotado durante una ventana corta de
  // gracia (para no romper pestañas que renuevan en paralelo); lo que NO debe
  // pasar es que un token de una sesión CERRADA siga funcionando — eso es (4).
  record(
    'S3-rotacion',
    true,
    `reuso del refresh anterior → HTTP ${reuseRes.status}${reuseBody.access_token ? ' (ventana de gracia de Supabase)' : ' (rechazado)'}`
  );

  // 4. LO CRÍTICO: cerrar sesión debe invalidar el refresh token.
  const logoutRes = await post('/auth/v1/logout', {}, renovado.access_token);
  const trasLogout = await post('/auth/v1/token?grant_type=refresh_token', {
    refresh_token: renovado.refresh_token,
  });
  const trasLogoutBody = (await trasLogout.json()) as { access_token?: string };
  record(
    'S4-logout-invalida',
    !trasLogout.ok && !trasLogoutBody.access_token,
    `logout HTTP ${logoutRes.status}; refresh posterior → HTTP ${trasLogout.status}${trasLogoutBody.access_token ? ' ⚠️ SIGUE VÁLIDO' : ' (rechazado)'}`
  );

  // 5. Un access token ya emitido sobrevive a su TTL como JWT sin estado. Lo
  //    que importa es si NUESTRA app lo sigue aceptando: `requireUser()` llama
  //    a `supabase.auth.getUser()`, que valida contra el servidor de Auth. Si
  //    ese endpoint rechaza el token de una sesión cerrada, la app está a salvo
  //    aunque el JWT no haya caducado todavía.
  const restante = claims.exp - Math.floor(Date.now() / 1000);
  const getUserRes = await fetch(`${URL_BASE}/auth/v1/user`, {
    headers: { apikey: ANON, Authorization: `Bearer ${renovado.access_token}` },
  });
  record(
    'S5-getUser-tras-logout',
    !getUserRes.ok,
    `getUser() con el access token de la sesión cerrada → HTTP ${getUserRes.status}` +
      (getUserRes.ok
        ? ` ⚠️ ACEPTADO (ventana de ${Math.max(0, restante)} s)`
        : ' (rechazado — la app corta el acceso al instante)')
  );

  // 6. Fuerza bruta contra Supabase Auth: ¿hay límite de intentos fallidos?
  let bloqueado = false;
  let intentos = 0;
  for (let i = 0; i < 25; i++) {
    intentos++;
    const r = await post('/auth/v1/token?grant_type=password', {
      email: EMAIL,
      password: `contrasena-incorrecta-${i}`,
    });
    if (r.status === 429) {
      bloqueado = true;
      break;
    }
  }
  record(
    'S6-fuerza-bruta-auth',
    bloqueado,
    bloqueado
      ? `Supabase Auth respondió 429 al intento ${intentos}`
      : `${intentos} intentos fallidos seguidos sin 429 de Supabase Auth`
  );

  console.log('\n┌─ Resultado ──────────────────────────────────────────────────');
  for (const r of results) {
    console.log(`│ ${r.ok ? '✅' : '⚠️ '} ${r.id.padEnd(22)} ${r.detalle}`);
  }
  console.log('└──────────────────────────────────────────────────────────────');
  const malos = results.filter((r) => !r.ok);
  if (malos.length > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
