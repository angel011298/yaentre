import '../lib/env';

/**
 * G65 — Sonda ACTIVA de aislamiento entre usuarios (capa RLS / PostgREST).
 *
 * Inicia sesión de verdad con tres cuentas de prueba contra Supabase Auth y,
 * con el JWT real de cada una, intenta por la API pública (`/rest/v1`, la
 * misma que alcanza cualquier navegador con `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
 * leer y ESCRIBIR datos de otro usuario. No lee código: manda peticiones.
 *
 * Uso: pnpm security:isolation
 * Requiere las 3 cuentas `rlsprobe.*@acierta-test.mx` con la contraseña de
 * `G65_PROBE_PASSWORD` (la fase la fija temporalmente y restaura el hash al
 * terminar — ver docs/AUDITORIA_SEGURIDAD.md §Método).
 */

const URL_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const PROBE_PASSWORD = process.env.G65_PROBE_PASSWORD ?? '';

const ACCOUNTS = {
  alumnoA: { email: 'rlsprobe.alumnoa@acierta-test.mx', profileId: 'rlsprobe_alumnoa' },
  alumnoB: { email: 'rlsprobe.alumnob@acierta-test.mx', profileId: 'rlsprobe_alumnob' },
  tutor: { email: 'rlsprobe.tutor@acierta-test.mx', profileId: 'rlsprobe_tutor' },
};

interface Token {
  jwt: string;
  sub: string;
}

interface RestResult {
  status: number;
  body: unknown;
}

async function signIn(email: string): Promise<Token> {
  const res = await fetch(`${URL_BASE}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON, 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: PROBE_PASSWORD }),
  });
  const body = (await res.json()) as { access_token?: string; user?: { id: string } };
  if (!res.ok || !body.access_token || !body.user) {
    throw new Error(`login ${email}: ${res.status} ${JSON.stringify(body)}`);
  }
  return { jwt: body.access_token, sub: body.user.id };
}

async function rest(
  token: string | null,
  method: string,
  path: string,
  body?: unknown
): Promise<RestResult> {
  const headers: Record<string, string> = { apikey: ANON, 'content-type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers.Prefer = 'return=representation';
  const res = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  let parsed: unknown = text;
  try {
    parsed = JSON.parse(text);
  } catch {
    /* cuerpo vacío o no-JSON */
  }
  return { status: res.status, body: parsed };
}

interface Check {
  id: string;
  descripcion: string;
  /** true = el intento ilegítimo fue BLOQUEADO (lo esperado). */
  bloqueado: boolean;
  detalle: string;
}

const checks: Check[] = [];

function record(id: string, descripcion: string, bloqueado: boolean, detalle: string): void {
  checks.push({ id, descripcion, bloqueado, detalle });
}

/** Una lectura ajena está bien SOLO si devuelve cero filas (o falla). */
function readBlocked(r: RestResult): boolean {
  if (r.status >= 400) return true;
  return Array.isArray(r.body) && r.body.length === 0;
}

/** Una escritura ajena está bien SOLO si el servidor no persistió nada. */
function writeBlocked(r: RestResult): boolean {
  if (r.status >= 400) return true;
  return Array.isArray(r.body) && r.body.length === 0;
}

function brief(r: RestResult): string {
  const s = typeof r.body === 'string' ? r.body : JSON.stringify(r.body);
  return `HTTP ${r.status} ${(s ?? '').slice(0, 200)}`;
}

async function firstExamId(): Promise<string> {
  const r = await rest(null, 'GET', 'exams?select=id&limit=1');
  return Array.isArray(r.body) && r.body.length > 0 ? (r.body[0] as { id: string }).id : 'sin-examen';
}

async function main(): Promise<void> {
  if (!PROBE_PASSWORD) {
    throw new Error('Falta G65_PROBE_PASSWORD (contraseña temporal de las cuentas de sondeo).');
  }
  console.log('G65 — sonda activa de aislamiento (PostgREST con JWT real)\n');

  const a = await signIn(ACCOUNTS.alumnoA.email);
  const t = await signIn(ACCOUNTS.tutor.email);
  console.log('Sesiones reales obtenidas para alumnoA y tutor.\n');

  const A = ACCOUNTS.alumnoA.profileId;
  const B = ACCOUNTS.alumnoB.profileId;
  const examId = await firstExamId();

  // ── 1. LECTURA de datos ajenos ────────────────────────────────────────────
  const lecturas: Array<[string, string]> = [
    ['user_profiles', `id=eq.${B}`],
    ['exam_sessions', `userProfileId=eq.${B}`],
    ['learning_profiles', `userProfileId=eq.${B}`],
    ['weak_topics', `userProfileId=eq.${B}`],
    ['streak_records', `userProfileId=eq.${B}`],
    ['subscriptions', `userProfileId=eq.${B}`],
    ['notification_preferences', `userProfileId=eq.${B}`],
    ['parent_link_codes', `studentProfileId=eq.${B}`],
  ];
  for (const [tabla, filtro] of lecturas) {
    const r = await rest(a.jwt, 'GET', `${tabla}?select=*&${filtro}`);
    record(`R-${tabla}`, `alumnoA lee ${tabla} de alumnoB`, readBlocked(r), brief(r));
  }

  {
    const r = await rest(a.jwt, 'GET', 'session_answers?select=*&limit=5');
    record('R-session_answers', 'alumnoA lista session_answers globales', readBlocked(r), brief(r));
  }

  // El banco NUNCA debe ser legible: `questions.options` trae `isCorrect`.
  {
    const r = await rest(a.jwt, 'GET', 'questions?select=id,options&limit=3');
    record('R-questions', 'alumnoA lee el banco de reactivos con su clave', readBlocked(r), brief(r));
    const r2 = await rest(a.jwt, 'GET', 'explanation_layers?select=*&limit=3');
    record('R-explanations', 'alumnoA lee las explicaciones', readBlocked(r2), brief(r2));
  }

  // ── 2. ESCALADA DE PRIVILEGIOS ────────────────────────────────────────────
  {
    const r = await rest(a.jwt, 'PATCH', `user_profiles?userId=eq.${a.sub}`, { role: 'ADMIN' });
    const escalado =
      Array.isArray(r.body) && r.body.some((x) => (x as { role?: string }).role === 'ADMIN');
    record('E-self-admin', 'alumnoA se asciende a sí mismo a ADMIN', !escalado, brief(r));
    if (escalado) {
      await rest(a.jwt, 'PATCH', `user_profiles?userId=eq.${a.sub}`, { role: 'STUDENT' });
      console.log('   (revertido a STUDENT)');
    }
  }

  // ── 3. ESCRITURA sobre datos ajenos / fabricados ──────────────────────────
  {
    const r = await rest(a.jwt, 'PATCH', `user_profiles?id=eq.${B}`, { displayName: 'G65-PROBE' });
    record('W-perfil-ajeno', 'alumnoA renombra el perfil de alumnoB', writeBlocked(r), brief(r));
  }

  // Vínculo parental fabricado: datos de un MENOR sin su código de 6 dígitos.
  {
    const r = await rest(t.jwt, 'POST', 'parent_links', {
      id: 'g65probe_link',
      parentProfileId: ACCOUNTS.tutor.profileId,
      studentProfileId: B,
    });
    const creado = r.status < 400 && Array.isArray(r.body) && r.body.length > 0;
    record(
      'W-vinculo-fabricado',
      'tutor se vincula a un alumno SIN el código de 6 dígitos',
      !creado,
      brief(r)
    );
    if (creado) await rest(t.jwt, 'DELETE', 'parent_links?id=eq.g65probe_link');
  }

  // Auto-otorgarse un plan de pago sin pasar por Stripe.
  {
    const r = await rest(a.jwt, 'POST', 'subscriptions', {
      id: 'g65probe_sub',
      userProfileId: A,
      plan: 'PREMIUM',
      status: 'ACTIVE',
      season: 'EARLY_BIRD',
    });
    const creado = r.status < 400 && Array.isArray(r.body) && r.body.length > 0;
    record('W-plan-gratis', 'alumnoA se activa un plan PREMIUM sin pagar', !creado, brief(r));
    if (creado) await rest(a.jwt, 'DELETE', 'subscriptions?id=eq.g65probe_sub');
  }

  // Insignias manipuladas en el propio perfil.
  {
    const r = await rest(a.jwt, 'PATCH', `user_profiles?userId=eq.${a.sub}`, {
      badges: ['EARLY_BIRD'],
    });
    const escrito = Array.isArray(r.body) && r.body.length > 0;
    record('W-insignias-propias', 'alumnoA se auto-otorga insignias por la API', !escrito, brief(r));
    if (escrito) await rest(a.jwt, 'PATCH', `user_profiles?userId=eq.${a.sub}`, { badges: [] });
  }

  // Simulacro fabricado (el score entra en el percentil de los demás).
  {
    const r = await rest(a.jwt, 'POST', 'exam_sessions', {
      id: 'g65probe_session',
      userProfileId: A,
      examId,
      mode: 'FULL_SIMULATION',
      status: 'COMPLETED',
      timeLimitSecs: 100,
      score: 999,
    });
    const creado = r.status < 400 && Array.isArray(r.body) && r.body.length > 0;
    record('W-simulacro-falso', 'alumnoA fabrica un simulacro con score 999', !creado, brief(r));
    if (creado) await rest(a.jwt, 'DELETE', 'exam_sessions?id=eq.g65probe_session');
  }

  // ── 4. Sin sesión (anónimo, solo la anon key del bundle) ──────────────────
  for (const tabla of [
    'user_profiles',
    'questions',
    'exam_sessions',
    'parent_links',
    'subscriptions',
  ]) {
    const r = await rest(null, 'GET', `${tabla}?select=*&limit=3`);
    record(`A-${tabla}`, `anónimo lee ${tabla}`, readBlocked(r), brief(r));
  }

  // ── Reporte ───────────────────────────────────────────────────────────────
  const fallos = checks.filter((c) => !c.bloqueado);
  console.log('┌─ Resultado ──────────────────────────────────────────────────');
  for (const c of checks) {
    const veredicto = c.bloqueado ? '✅ BLOQUEADO' : '❌ PERMITIDO';
    console.log(`│ ${veredicto}  ${c.id.padEnd(26)} ${c.descripcion}`);
    if (!c.bloqueado) console.log(`│      ↳ ${c.detalle}`);
  }
  console.log('└──────────────────────────────────────────────────────────────');
  console.log(`\n${checks.length - fallos.length}/${checks.length} intentos ilegítimos bloqueados.`);
  if (fallos.length > 0) {
    console.log(`\n⚠️  ${fallos.length} AGUJERO(S):`);
    for (const f of fallos) console.log(`   - ${f.id}: ${f.descripcion}`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
