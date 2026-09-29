import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * BARRIDO: TODA página, ruta y acción del programa de referidos llama a su guard,
 * y ningún esquema del borde acepta un identificador de usuario.
 *
 * Un layout no protege una página, un Route Handler ni una Server Action (cada uno
 * es su propio endpoint). Esta prueba recorre el código FUENTE y se pone en rojo si
 * alguien añade un archivo sin su guard — el olvido que ninguna otra prueba vería.
 * Con control POSITIVO y NEGATIVO del predicado (lección de `C-sin-id-en-el-borde`, G99).
 */

const ROOT = process.cwd();

const USER_TREES = ['app/api/referrals', 'app/(app)/app/invitar', 'app/tutor/invitar'];
const ADMIN_TREES = ['app/api/admin/referrals', 'app/admin/referidos'];
const GUARDED_FILE = /(^|\/)(page\.tsx|route\.ts)$/;

const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
const callsRoleGuard = (s: string) => /\brequireRole\s*\(/.test(stripComments(s));
const usesAdminService = (s: string) => /from '@\/lib\/referrals\/admin-service'/.test(stripComments(s));

function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}
const rel = (f: string) => f.slice(ROOT.length + 1);

describe('los predicados del barrido (control positivo y negativo)', () => {
  it('reconoce una llamada real y no se deja engañar por un comentario', () => {
    expect(callsRoleGuard("await requireRole('ADMIN');")).toBe(true);
    expect(callsRoleGuard("await requireRole([...REFERRAL_ROLES]);")).toBe(true);
    expect(callsRoleGuard("// requireRole('ADMIN')\nexport default 1")).toBe(false);
    expect(callsRoleGuard("/* requireRole('x') */")).toBe(false);
    expect(callsRoleGuard('await requireUser();')).toBe(false);
  });

  it('reconoce la importación del servicio de administración', () => {
    expect(usesAdminService("import { x } from '@/lib/referrals/admin-service';")).toBe(true);
    expect(usesAdminService("// from '@/lib/referrals/admin-service'")).toBe(false);
    expect(usesAdminService("import { x } from '@/lib/db/referrals';")).toBe(false);
  });
});

describe('rutas y páginas del usuario: cada archivo llama a requireRole', () => {
  const files = USER_TREES.flatMap((t) => walk(join(ROOT, t))).filter((f) => GUARDED_FILE.test(f));

  it('el barrido encuentra las 4 rutas y las 2 páginas', () => {
    expect(files.map(rel).sort()).toEqual([
      'app/(app)/app/invitar/page.tsx',
      'app/api/referrals/generate/route.ts',
      'app/api/referrals/history/route.ts',
      'app/api/referrals/qr/[code]/route.ts',
      'app/api/referrals/stats/route.ts',
      'app/tutor/invitar/page.tsx',
    ]);
  });

  for (const f of files) {
    it(`${rel(f)} llama a su guard`, () => {
      expect(callsRoleGuard(readFileSync(f, 'utf8'))).toBe(true);
    });
  }
});

describe('administración: cada ruta pasa por el servicio (que exige rol) o lo exige ella misma', () => {
  const files = ADMIN_TREES.flatMap((t) => walk(join(ROOT, t))).filter((f) => GUARDED_FILE.test(f));

  it('el barrido encuentra las 5 rutas y la página', () => {
    expect(files).toHaveLength(6);
  });

  for (const f of files) {
    it(`${rel(f)} exige ADMIN`, () => {
      const src = readFileSync(f, 'utf8');
      expect(usesAdminService(src) || callsRoleGuard(src)).toBe(true);
    });
  }

  it('TODA función exportada del servicio empieza por su guard (begin… o requireRole)', () => {
    const src = stripComments(readFileSync(join(ROOT, 'src/lib/referrals/admin-service.ts'), 'utf8'));
    const bodies = src.split(/\nexport async function /).slice(1);
    expect(bodies.length).toBe(5);
    for (const body of bodies) {
      const name = body.slice(0, body.indexOf('('));
      const firstCall = body.slice(0, 700);
      expect(/beginReferralAdminAction\(|requireRole\(/.test(firstCall), name).toBe(true);
    }
  });

  it('las Server Actions son envoltorios delgados: no escriben en la base por su cuenta', () => {
    const src = stripComments(readFileSync(join(ROOT, 'app/actions/admin-referrals.ts'), 'utf8'));
    expect(src).not.toMatch(/prisma\./);
    expect(src).toMatch(/@\/lib\/referrals\/admin-service/);
  });
});

describe('ningún esquema del borde acepta un identificador de usuario', () => {
  const FORBIDDEN = /\b(userProfileId|studentProfileId|parentProfileId|authUserId|userId)\s*:\s*(z\.|cuidSchema)/;
  const files = [
    ...USER_TREES.flatMap((t) => walk(join(ROOT, t))),
    ...ADMIN_TREES.flatMap((t) => walk(join(ROOT, t))),
    join(ROOT, 'app/actions/admin-referrals.ts'),
    join(ROOT, 'src/lib/referrals/admin-service.ts'),
    join(ROOT, 'src/lib/admin/referral-guard.ts'),
  ];

  it('el predicado detecta un esquema con id de usuario (control positivo)', () => {
    expect(FORBIDDEN.test('const s = z.object({ userProfileId: z.string() })')).toBe(true);
    expect(FORBIDDEN.test('z.object({ userProfileId: cuidSchema })')).toBe(true);
    expect(FORBIDDEN.test('where: { userProfileId: profile.id }')).toBe(false);
  });

  it('ni las rutas de usuario, ni las de administración, ni sus servicios', () => {
    expect(files.length).toBeGreaterThan(10);
    const offenders = files.filter((f) => FORBIDDEN.test(readFileSync(f, 'utf8')));
    expect(offenders.map(rel)).toEqual([]);
  });

  it('los esquemas nuevos de admin usan referralId/saleId (los ids de a qué afectan), no un id de usuario', () => {
    const src = readFileSync(join(ROOT, 'src/lib/admin/schemas.ts'), 'utf8');
    const block = src.slice(src.indexOf('Programa de referidos (Bloque 3)'));
    expect(block).toMatch(/referralId: referralCuidSchema/);
    expect(block).toMatch(/saleId: referralCuidSchema/);
    expect(FORBIDDEN.test(block)).toBe(false);
  });
});
