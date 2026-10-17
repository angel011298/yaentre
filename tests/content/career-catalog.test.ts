import { describe, expect, it } from 'vitest';
import {
  IPN_CAREERS,
  RETIRED_CAREER_NAMES,
  UNAM_CAREERS,
  campusesFor,
  catalogForArea,
  nonDefaultModalities,
  type CatalogCareer,
} from '@/lib/content/career-catalog';
import { planCareerSync, planHasChanges } from '@/lib/content/career-sync';

/**
 * G101 — el catálogo oficial de carreras, completo y sin basura.
 *
 * Los conteos están escritos a mano a propósito: son los de la fuente oficial
 * del 2026-10-17 (DGAE: 128 licenciaturas; IPN: 72 carreras). Si alguien
 * borra una carrera por accidente, o la mete en el área equivocada, esto se
 * pone rojo con el área exacta.
 */

const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}]/u;

describe('conteos de la fuente oficial', () => {
  it.each([
    ['AREA_1', 39],
    ['AREA_2', 31],
    ['AREA_3', 24],
    ['AREA_4', 34],
  ] as const)('UNAM %s tiene %d carreras', (code, n) => {
    expect(UNAM_CAREERS[code]).toHaveLength(n);
  });

  it('UNAM suma las 128 licenciaturas de la DGAE', () => {
    expect(Object.values(UNAM_CAREERS).flat()).toHaveLength(128);
  });

  it.each([
    ['IPN_FISMAT', 46],
    ['IPN_MEDBIO', 12],
    ['IPN_SOCADM', 14],
  ] as const)('IPN %s tiene %d carreras', (code, n) => {
    expect(IPN_CAREERS[code]).toHaveLength(n);
  });

  it('IPN suma las 72 carreras de su oferta', () => {
    expect(Object.values(IPN_CAREERS).flat()).toHaveLength(72);
  });
});

const ALL_AREAS: Array<[string, readonly CatalogCareer[]]> = [
  ...Object.entries(UNAM_CAREERS),
  ...Object.entries(IPN_CAREERS),
];

describe('calidad de cada entrada', () => {
  for (const [code, careers] of ALL_AREAS) {
    it(`${code}: nombres únicos, completos y limpios`, () => {
      const names = careers.map((c) => c.name);
      expect(new Set(names).size).toBe(names.length);
      for (const c of careers) {
        expect(c.name).toBe(c.name.trim());
        expect(c.name).not.toMatch(/\s{2,}/);
        // Los nombres de la fuente llegan abreviados («Ing. Civil»).
        expect(c.name).not.toMatch(/^Ing\. /);
        // Sin plantel pegado al nombre: eso fue lo que dejó «(CIMA)» en la base.
        expect(c.name).not.toMatch(/\(.*\)/);
        expect(c.name).not.toMatch(EMOJI);
        expect(c.modalities.length).toBeGreaterThan(0);
      }
    });
  }

  it('todas las carreras de la UNAM llevan su clave DGAE de 3 dígitos, única', () => {
    const codes = Object.values(UNAM_CAREERS)
      .flat()
      .map((c) => c.officialCode);
    expect(codes.every((c) => /^\d{3}$/.test(c ?? ''))).toBe(true);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('la clave DGAE empieza con el número de su área', () => {
    for (const [code, careers] of Object.entries(UNAM_CAREERS)) {
      const area = code.slice(-1);
      for (const c of careers) expect(c.officialCode?.[0]).toBe(area);
    }
  });

  it('todas las carreras tienen al menos un plantel o unidad académica', () => {
    for (const [, careers] of ALL_AREAS) {
      for (const c of careers) expect(c.campuses.length).toBeGreaterThan(0);
    }
  });
});

describe('las carreras ancla de producción siguen existiendo con su nombre', () => {
  // Las que tenían alumnos o aciertos mínimos antes de G101: si cambian de
  // nombre en el catálogo sin `formerNames`, la sincronización las duplicaría.
  it.each([
    ['AREA_1', 'Ingeniería en Computación'],
    ['AREA_1', 'Física'],
    ['AREA_1', 'Ingeniería Eléctrica Electrónica'],
    ['AREA_2', 'Médico Cirujano'],
    ['AREA_3', 'Ciencias de la Comunicación'],
    ['AREA_4', 'Lengua y Literaturas Hispánicas'],
    ['IPN_FISMAT', 'Ingeniería en Sistemas Computacionales'],
    ['IPN_MEDBIO', 'Médico Cirujano Partero'],
    ['IPN_SOCADM', 'Contador Público'],
  ] as const)('%s · %s', (code, name) => {
    expect(catalogForArea(code)?.some((c) => c.name === name)).toBe(true);
  });

  it('las retiradas NO están en el catálogo', () => {
    for (const [code, names] of Object.entries(RETIRED_CAREER_NAMES)) {
      for (const name of names ?? []) {
        expect(catalogForArea(code)?.some((c) => c.name === name)).toBe(false);
      }
    }
  });
});

describe('ayudantes de la interfaz', () => {
  it('planteles de una carrera', () => {
    expect(campusesFor('AREA_1', 'Actuaría')).toEqual(['Facultad de Ciencias', 'FES Acatlán']);
    expect(campusesFor('AREA_1', 'No existe')).toEqual([]);
    expect(campusesFor('OTRA', 'Actuaría')).toEqual([]);
  });

  it('modalidades distintas de la presencial', () => {
    expect(nonDefaultModalities('AREA_3', 'Derecho')).toEqual(['Abierto', 'A distancia']);
    expect(nonDefaultModalities('AREA_1', 'Actuaría')).toEqual([]);
    expect(nonDefaultModalities('IPN_SOCADM', 'Contador Público')).toEqual(['No escolarizada']);
  });
});

describe('planCareerSync', () => {
  const catalog: CatalogCareer[] = [
    { name: 'Contador Público', campuses: ['ESCA'], modalities: ['Escolarizada'], formerNames: ['Contabilidad (CIMA)'] },
    { name: 'Licenciatura en Economía', campuses: ['ESE'], modalities: ['Escolarizada'] },
    { name: 'Licenciatura en Turismo', campuses: ['EST'], modalities: ['Escolarizada'] },
  ];

  it('renombra por nombre anterior conservando el id, crea lo que falta y retira lo inexistente sin alumnos', () => {
    const plan = planCareerSync({
      existing: [
        { id: 'a', name: 'Contabilidad (CIMA)', targetedBy: 3 },
        { id: 'b', name: 'Licenciatura en Economía', targetedBy: 0 },
        { id: 'c', name: 'Gestión y Dirección de Empresas', targetedBy: 0 },
      ],
      catalog,
      retired: ['Gestión y Dirección de Empresas'],
    });
    expect(plan.renames).toEqual([{ id: 'a', from: 'Contabilidad (CIMA)', to: 'Contador Público' }]);
    expect(plan.creates).toEqual(['Licenciatura en Turismo']);
    expect(plan.retires).toEqual([{ id: 'c', name: 'Gestión y Dirección de Empresas' }]);
    expect(plan.unknown).toEqual([]);
    expect(planHasChanges(plan)).toBe(true);
  });

  it('una retirada con alumnos NO se borra: se reporta', () => {
    const plan = planCareerSync({
      existing: [{ id: 'c', name: 'Gestión y Dirección de Empresas', targetedBy: 2 }],
      catalog: [],
      retired: ['Gestión y Dirección de Empresas'],
    });
    expect(plan.retires).toEqual([]);
    expect(plan.blockedRetires).toEqual([{ id: 'c', name: 'Gestión y Dirección de Empresas', targetedBy: 2 }]);
  });

  it('una fila desconocida se reporta y no se toca', () => {
    const plan = planCareerSync({ existing: [{ id: 'z', name: 'Inventada', targetedBy: 0 }], catalog });
    expect(plan.unknown).toEqual(['Inventada']);
    expect(plan.retires).toEqual([]);
  });

  it('si existen el nombre oficial y el anterior a la vez, no fusiona: reporta conflicto', () => {
    const plan = planCareerSync({
      existing: [
        { id: 'a', name: 'Contabilidad (CIMA)', targetedBy: 1 },
        { id: 'b', name: 'Contador Público', targetedBy: 1 },
      ],
      catalog,
    });
    expect(plan.renames).toEqual([]);
    expect(plan.conflicts).toEqual([{ official: 'Contador Público', former: 'Contabilidad (CIMA)' }]);
  });

  it('es idempotente: aplicado una vez, el segundo plan no cambia nada', () => {
    const existing = catalog.map((c, i) => ({ id: String(i), name: c.name, targetedBy: 0 }));
    expect(planHasChanges(planCareerSync({ existing, catalog }))).toBe(false);
  });

  it('un catálogo con nombres repetidos se rechaza', () => {
    expect(() =>
      planCareerSync({ existing: [], catalog: [...catalog, catalog[0]] })
    ).toThrow(/repite/);
  });
});
