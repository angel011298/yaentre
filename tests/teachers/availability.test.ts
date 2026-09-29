import { describe, expect, it } from 'vitest';
import {
  MAX_AVAILABILITY_BLOCKS,
  availabilitySchema,
  isWithinAvailability,
  normalizeAvailability,
  parseStoredAvailability,
  weeklyAvailableHours,
} from '@/lib/teachers/availability';

const H = (h: number, min = 0) => h * 60 + min;

describe('esquema de bloques', () => {
  it('acepta un bloque válido dentro de 8:00–22:00 y en rejilla de 30 min', () => {
    expect(
      availabilitySchema.safeParse([{ weekday: 1, startMinute: H(9), endMinute: H(13, 30) }]).success
    ).toBe(true);
  });

  it.each([
    ['empieza antes de las 8:00', { weekday: 1, startMinute: H(7, 30), endMinute: H(10) }],
    ['termina después de las 22:00', { weekday: 1, startMinute: H(20), endMinute: H(22, 30) }],
    ['fin antes del inicio', { weekday: 1, startMinute: H(12), endMinute: H(10) }],
    ['bloque vacío', { weekday: 1, startMinute: H(10), endMinute: H(10) }],
    ['fuera de la rejilla de 30 min', { weekday: 1, startMinute: H(9, 15), endMinute: H(11) }],
    ['día 7', { weekday: 7, startMinute: H(9), endMinute: H(11) }],
    ['día negativo', { weekday: -1, startMinute: H(9), endMinute: H(11) }],
    ['minutos fraccionarios', { weekday: 1, startMinute: 540.5, endMinute: 660 }],
  ])('rechaza un bloque que %s', (_n, block) => {
    expect(availabilitySchema.safeParse([block]).success).toBe(false);
  });

  it('acota la cantidad de bloques', () => {
    const many = Array.from({ length: MAX_AVAILABILITY_BLOCKS + 1 }, () => ({
      weekday: 1,
      startMinute: H(9),
      endMinute: H(10),
    }));
    expect(availabilitySchema.safeParse(many).success).toBe(false);
  });
});

describe('normalizeAvailability', () => {
  it('ordena y fusiona bloques traslapados o que se tocan, por día', () => {
    expect(
      normalizeAvailability([
        { weekday: 2, startMinute: H(15), endMinute: H(17) },
        { weekday: 1, startMinute: H(10), endMinute: H(12) },
        { weekday: 1, startMinute: H(9), endMinute: H(10, 30) },
        { weekday: 1, startMinute: H(12), endMinute: H(13) },
      ])
    ).toEqual([
      { weekday: 1, startMinute: H(9), endMinute: H(13) },
      { weekday: 2, startMinute: H(15), endMinute: H(17) },
    ]);
  });

  it('no fusiona días distintos aunque las horas coincidan, ni bloques con hueco', () => {
    expect(
      normalizeAvailability([
        { weekday: 1, startMinute: H(9), endMinute: H(10) },
        { weekday: 2, startMinute: H(10), endMinute: H(11) },
        { weekday: 1, startMinute: H(11), endMinute: H(12) },
      ])
    ).toHaveLength(3);
  });

  it('no muta la entrada', () => {
    const input = [
      { weekday: 1, startMinute: H(9), endMinute: H(11) },
      { weekday: 1, startMinute: H(10), endMinute: H(12) },
    ];
    const copy = JSON.parse(JSON.stringify(input));
    normalizeAvailability(input);
    expect(input).toEqual(copy);
  });
});

describe('isWithinAvailability (hora de México)', () => {
  // Lunes 2026-10-05. 15:00Z = 09:00 México.
  const blocks = [{ weekday: 1, startMinute: H(9), endMinute: H(12) }];

  it('una clase que cabe entera en el bloque sí', () => {
    expect(isWithinAvailability(blocks, new Date('2026-10-05T15:00:00Z'), 50)).toBe(true); // 9:00–9:50
    expect(isWithinAvailability(blocks, new Date('2026-10-05T17:10:00Z'), 50)).toBe(true); // 11:10–12:00 justo
  });

  it('una que se sale por el final NO', () => {
    expect(isWithinAvailability(blocks, new Date('2026-10-05T17:30:00Z'), 50)).toBe(false); // 11:30–12:20
  });

  it('una en otro día o antes del bloque NO', () => {
    expect(isWithinAvailability(blocks, new Date('2026-10-06T15:00:00Z'), 50)).toBe(false); // martes
    expect(isWithinAvailability(blocks, new Date('2026-10-05T14:30:00Z'), 50)).toBe(false); // 8:30
  });

  it('una clase cabe en dos bloques CONTIGUOS porque se fusionan', () => {
    const contiguos = [
      { weekday: 1, startMinute: H(9), endMinute: H(10) },
      { weekday: 1, startMinute: H(10), endMinute: H(11) },
    ];
    expect(isWithinAvailability(contiguos, new Date('2026-10-05T15:30:00Z'), 80)).toBe(true); // 9:30–10:50
  });

  it('sin bloques nunca hay disponibilidad', () => {
    expect(isWithinAvailability([], new Date('2026-10-05T15:00:00Z'), 50)).toBe(false);
  });
});

describe('utilidades', () => {
  it('parseStoredAvailability descarta lo corrupto sin lanzar', () => {
    expect(parseStoredAvailability('basura')).toEqual([]);
    expect(parseStoredAvailability([{ weekday: 99 }])).toEqual([]);
    expect(parseStoredAvailability([{ weekday: 1, startMinute: H(9), endMinute: H(10) }])).toHaveLength(1);
  });

  it('weeklyAvailableHours suma sobre los bloques ya fusionados', () => {
    expect(
      weeklyAvailableHours([
        { weekday: 1, startMinute: H(9), endMinute: H(11) },
        { weekday: 1, startMinute: H(10), endMinute: H(12) },
        { weekday: 3, startMinute: H(16), endMinute: H(17, 30) },
      ])
    ).toBe(4.5);
  });
});
