import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * BARRIDO: TODA página, ruta y acción de las zonas de personal llama a su guard.
 *
 * `/fiscal` y `/soporte` tienen layout propio, pero un layout NO protege una
 * página, un Route Handler ni una Server Action (cada uno es su propio endpoint;
 * se alcanza sin renderizar ningún layout, y en la navegación del cliente el
 * layout ni siquiera se vuelve a ejecutar). Esta prueba recorre el código FUENTE
 * y se pone en rojo si alguien añade un archivo a una de estas zonas sin su
 * `requireCapability(...)` — que es justo el olvido que ninguna otra prueba vería.
 *
 * Con control POSITIVO y NEGATIVO del predicado: sin ellos, un regex roto
 * pasaría siempre (la lección de `C-sin-id-en-el-borde`, G99).
 */

const ROOT = process.cwd();

/** Árboles donde CADA archivo relevante debe llamar a `requireCapability`. */
const STAFF_TREES = ['app/fiscal', 'app/soporte', 'app/api/fiscal', 'app/api/support'];

/** Archivos sueltos, fuera de esos árboles, que también deben llamarlo. */
const STAFF_FILES = [
  'app/api/admin/resico/route.ts', // el contador lo llama: cae bajo /api/admin, cuyo layout no existe para rutas
  'app/actions/support.ts',
  'app/api/support/users/[id]/export/route.ts',
];

/**
 * Las acciones y rutas de SOPORTE son envoltorios delgados: el guard vive en el
 * servicio (`src/lib/support/service.ts`), que lo exige en la primera línea de CADA
 * función exportada — eso lo comprueba el último bloque de este archivo. Sin él,
 * «importar el servicio» sería una promesa que nada verifica.
 */
export function usesSupportService(source: string): boolean {
  return /from '@\/lib\/support\/service'/.test(source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1'));
}

const GUARDED_FILE = /(^|\/)(page\.tsx|route\.ts|layout\.tsx)$/;

export function callsCapabilityGuard(source: string): boolean {
  // Una llamada de verdad, no la mención en un comentario: se quitan los comentarios antes de buscar.
  const withoutComments = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  return /\brequireCapability\s*\(/.test(withoutComments);
}

function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

describe('el predicado del barrido (control positivo y negativo)', () => {
  it('reconoce una llamada real', () => {
    expect(callsCapabilityGuard("await requireCapability('fiscal.read');")).toBe(true);
  });

  it('NO se deja engañar por el guard mencionado en un comentario', () => {
    expect(callsCapabilityGuard("// TODO: requireCapability('fiscal.read')\nexport default function P() {}")).toBe(false);
    expect(callsCapabilityGuard("/* requireCapability('x') */ export default function P() {}")).toBe(false);
  });

  it('NO acepta un guard que no es de capacidad (requireUser deja pasar a cualquiera con sesión)', () => {
    expect(callsCapabilityGuard('await requireUser();')).toBe(false);
  });

  it('un archivo sin ningún guard falla', () => {
    expect(callsCapabilityGuard('export default function Page() { return null; }')).toBe(false);
  });
});

describe('las zonas de personal', () => {
  const files = [
    ...STAFF_TREES.flatMap((tree) => walk(join(ROOT, tree)).filter((f) => GUARDED_FILE.test(f))),
    ...STAFF_FILES.map((f) => join(ROOT, f)).filter((f) => existsSync(f)),
  ];

  it('el barrido encuentra archivos (si no, comprobaría nada)', () => {
    expect(files.length).toBeGreaterThanOrEqual(4);
  });

  for (const file of files) {
    const rel = relative(ROOT, file);
    it(`${rel} llama a requireCapability por su cuenta (o pasa por el servicio de soporte, que lo exige)`, () => {
      const src = readFileSync(file, 'utf8');
      expect(callsCapabilityGuard(src) || usesSupportService(src)).toBe(true);
    });
  }
});

describe('el servicio de soporte exige su guard en la primera línea de CADA función exportada', () => {
  const src = readFileSync(join(ROOT, 'src/lib/support/service.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
  const bodies = src.split(/\nexport async function /).slice(1);

  it('el predicado reconoce la importación y no se deja engañar por un comentario', () => {
    expect(usesSupportService("import { x } from '@/lib/support/service';")).toBe(true);
    expect(usesSupportService("// from '@/lib/support/service'")).toBe(false);
    expect(usesSupportService("import { x } from '@/lib/support/valve';")).toBe(false);
  });

  it('son las 5 funciones esperadas', () => {
    expect(bodies.map((b) => b.slice(0, b.indexOf('(')))).toEqual([
      'searchUsersForSupport',
      'loadFichaForSupport',
      'exportUserDataForSupport',
      'opposeMarketingForSupport',
      'issueRefundForSupport',
    ]);
  });

  for (const body of bodies) {
    const name = body.slice(0, body.indexOf('('));
    it(`${name} empieza por su guard`, () => {
      expect(/beginSupportAction\(|requireCapability\(/.test(body.slice(0, 500))).toBe(true);
    });
  }
});
