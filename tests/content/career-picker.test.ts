import { describe, expect, it } from 'vitest';
import {
  filterCareers,
  normalizeForSearch,
  toCareerPickerItems,
} from '@/lib/content/career-picker';

/** G101 — búsqueda del selector de carrera (onboarding y perfil). */
const rows = [
  { id: '1', name: 'Ingeniería en Computación', minAciertos: 101, minAciertosYear: 2025, minAciertosConfidence: 'HIGH' as const },
  { id: '2', name: 'Actuaría', minAciertos: null, minAciertosYear: null, minAciertosConfidence: null },
  { id: '3', name: 'Física', minAciertos: 104, minAciertosYear: 2025, minAciertosConfidence: 'HIGH' as const },
];
const items = toCareerPickerItems('AREA_1', rows);

describe('toCareerPickerItems', () => {
  it('ordena alfabéticamente en español (la Á no va al final)', () => {
    expect(items.map((i) => i.name)).toEqual(['Actuaría', 'Física', 'Ingeniería en Computación']);
  });

  it('trae los planteles del catálogo oficial', () => {
    expect(items.find((i) => i.name === 'Actuaría')?.campuses).toEqual([
      'Facultad de Ciencias',
      'FES Acatlán',
    ]);
  });

  it('la meta solo aparece con dato; sin dato no se inventa', () => {
    expect(items.find((i) => i.name === 'Física')?.target).toEqual({
      label: '~104 aciertos',
      qualifier: 'Meta estimada',
    });
    expect(items.find((i) => i.name === 'Actuaría')?.target).toBeNull();
  });
});

describe('filterCareers', () => {
  it('sin acentos ni mayúsculas', () => {
    expect(filterCareers(items, 'INGENIERIA').map((i) => i.id)).toEqual(['1']);
    expect(filterCareers(items, 'actuaria').map((i) => i.id)).toEqual(['2']);
  });

  it('por plantel', () => {
    expect(filterCareers(items, 'acatlan').map((i) => i.name)).toContain('Actuaría');
  });

  it('varias palabras en cualquier orden', () => {
    expect(filterCareers(items, 'computacion ingenieria').map((i) => i.id)).toEqual(['1']);
  });

  it('consulta vacía devuelve todo; sin coincidencias, nada', () => {
    expect(filterCareers(items, '   ')).toHaveLength(3);
    expect(filterCareers(items, 'astrofísica cuántica')).toEqual([]);
  });

  it('normalizeForSearch', () => {
    expect(normalizeForSearch('  Órtesis y Prótesis ')).toBe('ortesis y protesis');
  });
});
