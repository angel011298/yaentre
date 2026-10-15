import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

/**
 * G100 🔴 — UNA PÁGINA PROTEGIDA LLAMA A SU GUARD ANTES DE LEER UN SOLO DATO.
 *
 * El defecto que esto cierra estaba en producción: cinco páginas de /admin
 * (usuarios, bitácora, cola de revisión, reportes, cobertura) y la ficha de un
 * reactivo confiaban en `app/admin/layout.tsx`. Next renderiza layout y página
 * EN PARALELO, así que la página consultaba la base aunque el layout
 * redirigiera, y el 307 que recibía un ALUMNO llevaba en el cuerpo la página
 * ya renderizada: 25 correos de cuentas reales en `/admin/bitacora`, 6 en
 * `/admin/usuarios`, y la cola de reactivos sin publicar.
 *
 * La regla, por archivo: dentro del componente de la página, todo `await`
 * anterior al guard solo puede ser `params`/`searchParams` (no leen datos).
 * Es un chequeo de texto a propósito — como `security:authz` — para que una
 * página NUEVA quede cubierta sin que nadie se acuerde de añadirla aquí.
 */

const ROOT = join(process.cwd(), 'app');

/** Prefijos (relativos a app/) de las zonas privadas y el guard que vale ahí. */
const ZONES: Array<{ prefix: string; guards: RegExp }> = [
  { prefix: 'admin', guards: /\bgetAdminContext\(\)/ },
  { prefix: '(app)', guards: /\b(requireOnboarding|requireUser|requireRole|requirePaidPlan)\(/ },
  { prefix: 'tutor', guards: /\b(requireUser|requireRole|requireParent\w*)\(/ },
  { prefix: 'onboarding', guards: /\b(requireUser|requireOnboarding)\(/ },
  { prefix: 'simulador', guards: /\b(requireOnboarding|requireUser)\(/ },
];

function pages(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...pages(full));
    else if (name === 'page.tsx') out.push(full);
  }
  return out;
}

/** Cuerpo del `export default async function` (hasta el cierre de su llave). */
function defaultExportBody(source: string): string | null {
  const m = source.match(/export default async function \w*\s*\(/);
  if (!m || m.index === undefined) return null;
  const open = source.indexOf('{', source.indexOf(')', m.index) + 1);
  // El primer `{` tras la firma puede ser el de un tipo de props en línea:
  // se busca el `{` que sigue a `) {` / `}) {`.
  const sig = source.slice(m.index).match(/\)\s*(?::\s*[^{]+)?\{/);
  const start = sig && sig.index !== undefined ? m.index + sig.index + sig[0].length : open + 1;
  let depth = 1;
  for (let i = start; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}' && --depth === 0) return source.slice(start, i);
  }
  return null;
}

/** Devuelve el primer `await` de datos anterior al guard, o null si no hay. */
export function firstUnguardedAwait(body: string, guards: RegExp): string | null {
  const guardAt = body.search(guards);
  if (guardAt === -1) return '(la página no llama a ningún guard)';
  const before = body.slice(0, guardAt);
  for (const m of before.matchAll(/await\s+([^;\n]+)/g)) {
    if (!/^(params|searchParams)\b/.test(m[1].trim())) return m[0].trim();
  }
  return null;
}

const protectedPages = pages(ROOT)
  .map((file) => ({ file, rel: relative(ROOT, file).split(sep).join('/') }))
  .map((p) => ({ ...p, zone: ZONES.find((z) => p.rel.startsWith(`${z.prefix}/`)) }))
  .filter((p): p is typeof p & { zone: (typeof ZONES)[number] } => Boolean(p.zone));

describe('toda página privada verifica su guard antes de leer datos', () => {
  it('encuentra las páginas (control: el barrido no está vacío)', () => {
    expect(protectedPages.length).toBeGreaterThanOrEqual(20);
    expect(protectedPages.filter((p) => p.zone.prefix === 'admin').length).toBeGreaterThanOrEqual(10);
  });

  for (const page of protectedPages) {
    it(page.rel, () => {
      const body = defaultExportBody(readFileSync(page.file, 'utf8'));
      // Una página que solo redirige (sin `await`) no lee nada.
      if (body === null || !/\bawait\b/.test(body)) return;
      expect(firstUnguardedAwait(body, page.zone.guards)).toBeNull();
    });
  }
});

describe('control positivo: el chequeo SÍ detecta el defecto de G100', () => {
  const guards = ZONES[0].guards;

  it('la forma vieja de /admin/usuarios (datos sin guard) se marca', () => {
    const old = `
      const sp = await searchParams;
      const result = await searchUsers({ q, page });`;
    expect(firstUnguardedAwait(old, guards)).toBe('(la página no llama a ningún guard)');
  });

  it('un dato leído ANTES del guard se marca', () => {
    const late = `
      const result = await searchUsers({ q });
      await getAdminContext();`;
    expect(firstUnguardedAwait(late, guards)).toBe('await searchUsers({ q })');
  });

  it('params antes del guard está permitido', () => {
    const ok = `
      const { id } = await params;
      await getAdminContext();
      const d = await getUserDetail(id);`;
    expect(firstUnguardedAwait(ok, guards)).toBeNull();
  });
});
