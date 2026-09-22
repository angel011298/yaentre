import { describe, expect, it } from 'vitest';
import {
  evaluateMasterAdmin,
  isMasterAdminEmail,
  parseMasterAdminList,
} from '@/lib/admin/master';

/**
 * G99 — la compuerta de admin maestro, enumerada.
 *
 * Es una función pura y total, así que la matriz se lista ENTERA y por nombre.
 * Un `if` añadido más tarde no puede abrir una celda sin romper una prueba con
 * nombre propio — misma disciplina que `tests/sales/sales-switch.test.ts` (G98).
 *
 * La celda que más importa es la primera: **lista ausente ⇒ CERRADO**. Si esa
 * se invierte, olvidar una variable de entorno abre todas las acciones
 * destructivas del panel a cualquier ADMIN.
 */

const MASTER = 'jefa@yaentre.com';
const OTHER = 'ayudante@yaentre.com';

describe('parseMasterAdminList', () => {
  it('lista vacía cuando la variable no existe', () => {
    expect(parseMasterAdminList(undefined)).toEqual([]);
  });

  it('lista vacía cuando la variable es cadena vacía', () => {
    expect(parseMasterAdminList('')).toEqual([]);
  });

  it('lista vacía cuando solo hay comas y espacios', () => {
    expect(parseMasterAdminList('  , ,, ')).toEqual([]);
  });

  it('descarta entradas sin @ para que una coma de más no cree un comodín', () => {
    expect(parseMasterAdminList('*,jefa@yaentre.com,admin')).toEqual(['jefa@yaentre.com']);
  });

  it('normaliza mayúsculas y espacios', () => {
    expect(parseMasterAdminList('  JEFA@YaEntre.com , Ayudante@yaentre.COM ')).toEqual([
      'jefa@yaentre.com',
      'ayudante@yaentre.com',
    ]);
  });
});

describe('isMasterAdminEmail', () => {
  it('CERRADO: variable ausente, aunque el correo sea el del dueño', () => {
    expect(isMasterAdminEmail(MASTER, undefined)).toBe(false);
  });

  it('CERRADO: variable vacía', () => {
    expect(isMasterAdminEmail(MASTER, '')).toBe(false);
  });

  it('CERRADO: variable solo con basura sin @', () => {
    expect(isMasterAdminEmail(MASTER, 'todos,*')).toBe(false);
  });

  it('CERRADO: correo nulo', () => {
    expect(isMasterAdminEmail(null, MASTER)).toBe(false);
  });

  it('CERRADO: correo indefinido', () => {
    expect(isMasterAdminEmail(undefined, MASTER)).toBe(false);
  });

  it('CERRADO: correo que no está en la lista', () => {
    expect(isMasterAdminEmail(OTHER, MASTER)).toBe(false);
  });

  it('CERRADO: coincidencia parcial no cuenta (sufijo)', () => {
    expect(isMasterAdminEmail('otrajefa@yaentre.com', MASTER)).toBe(false);
  });

  it('CERRADO: coincidencia parcial no cuenta (prefijo)', () => {
    expect(isMasterAdminEmail(MASTER, 'jefa@yaentre.com.mx')).toBe(false);
  });

  it('ABIERTO: correo exacto en una lista de uno', () => {
    expect(isMasterAdminEmail(MASTER, MASTER)).toBe(true);
  });

  it('ABIERTO: correo exacto en una lista de varios', () => {
    expect(isMasterAdminEmail(OTHER, `${MASTER},${OTHER}`)).toBe(true);
  });

  it('ABIERTO: mayúsculas y espacios a ambos lados', () => {
    expect(isMasterAdminEmail('  JEFA@YaEntre.COM ', ' jefa@yaentre.com ')).toBe(true);
  });
});

describe('evaluateMasterAdmin — distingue "no hay lista" de "no estás en ella"', () => {
  it('sin lista devuelve NOT_CONFIGURED, que es lo que se reporta a Sentry', () => {
    expect(evaluateMasterAdmin(MASTER, undefined)).toEqual({
      ok: false,
      reason: 'NOT_CONFIGURED',
    });
  });

  it('con lista pero fuera de ella devuelve NOT_MASTER, que NO se reporta', () => {
    expect(evaluateMasterAdmin(OTHER, MASTER)).toEqual({ ok: false, reason: 'NOT_MASTER' });
  });

  it('dentro de la lista devuelve ok', () => {
    expect(evaluateMasterAdmin(MASTER, MASTER)).toEqual({ ok: true });
  });
});

/**
 * EL ROJO ES ALCANZABLE (G71 §6 D6). Si alguien "arreglara" el default para
 * que una lista vacía deje pasar a todos, esta prueba lo dice explícitamente:
 * la única forma de que `isMasterAdminEmail` devuelva `true` es que el correo
 * esté en una lista no vacía.
 */
describe('mutación: el default nunca puede invertirse sin romper esto', () => {
  it('ninguna combinación con lista vacía devuelve true', () => {
    const emails = [MASTER, OTHER, '', null, undefined, 'cualquiera@ejemplo.com'];
    const emptyLists = [undefined, null, '', '   ', ',,,', ' , '];
    for (const email of emails) {
      for (const list of emptyLists) {
        expect(isMasterAdminEmail(email, list)).toBe(false);
      }
    }
  });
});
