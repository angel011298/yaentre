import { describe, expect, it } from 'vitest';
import {
  blocksToCells,
  cellsToBlocks,
  emptySelection,
  GRID_SLOTS_PER_DAY,
  parseHHmm,
  validateAvailabilityBlock,
  validateWeeklyAvailability,
} from '@/lib/teachers/availability';

describe('validateAvailabilityBlock (spec §1.3)', () => {
  it('acepta bloques de 1 a 4 horas en tramos de 30 min entre 7:00 y 22:00', () => {
    expect(validateAvailabilityBlock({ dayOfWeek: 1, startTime: '07:00', endTime: '08:00' }).valid).toBe(true);
    expect(validateAvailabilityBlock({ dayOfWeek: 6, startTime: '18:00', endTime: '22:00' }).valid).toBe(true);
    expect(validateAvailabilityBlock({ dayOfWeek: 0, startTime: '09:30', endTime: '11:00' }).valid).toBe(true);
  });

  it.each([
    [{ dayOfWeek: 7, startTime: '09:00', endTime: '10:00' }, 'Día inválido'],
    [{ dayOfWeek: -1, startTime: '09:00', endTime: '10:00' }, 'Día inválido'],
    [{ dayOfWeek: 1, startTime: '06:30', endTime: '08:00' }, 'temprano'],
    [{ dayOfWeek: 1, startTime: '21:00', endTime: '22:30' }, 'tarde'],
    [{ dayOfWeek: 1, startTime: '09:00', endTime: '09:30' }, 'Mínimo'],
    [{ dayOfWeek: 1, startTime: '09:00', endTime: '13:30' }, 'Máximo'],
    [{ dayOfWeek: 1, startTime: '09:15', endTime: '10:45' }, '30 minutos'],
  ])('rechaza %j', (block, msg) => {
    const r = validateAvailabilityBlock(block);
    expect(r.valid).toBe(false);
    expect(r.error).toContain(msg);
  });

  it('corrección a la spec: horas mal formadas se rechazan (la spec las daba por válidas con NaN)', () => {
    for (const bad of ['9:00', '25:00', 'aa:bb', '09:60', '', '09:00:00']) {
      expect(parseHHmm(bad), bad).toBeNull();
      expect(validateAvailabilityBlock({ dayOfWeek: 1, startTime: bad, endTime: '11:00' }).valid, bad).toBe(false);
    }
  });
});

describe('validateWeeklyAvailability — la semana que se guarda en lote', () => {
  it('detecta bloques encimados del mismo día', () => {
    const r = validateWeeklyAvailability([
      { dayOfWeek: 2, startTime: '09:00', endTime: '11:00' },
      { dayOfWeek: 2, startTime: '10:30', endTime: '12:00' },
    ]);
    expect(r.ok).toBe(false);
  });

  it('permite bloques contiguos y en días distintos', () => {
    expect(
      validateWeeklyAvailability([
        { dayOfWeek: 2, startTime: '09:00', endTime: '11:00' },
        { dayOfWeek: 2, startTime: '11:00', endTime: '12:00' },
        { dayOfWeek: 3, startTime: '09:00', endTime: '11:00' },
      ]).ok
    ).toBe(true);
  });

  it('tope de 35 bloques por semana', () => {
    const blocks = Array.from({ length: 36 }, (_, i) => ({
      dayOfWeek: i % 7,
      startTime: `${String(7 + Math.floor(i / 7) * 3).padStart(2, '0')}:00`,
      endTime: `${String(8 + Math.floor(i / 7) * 3).padStart(2, '0')}:00`,
    }));
    expect(validateWeeklyAvailability(blocks).ok).toBe(false);
  });
});

describe('cuadrícula del editor: celdas ↔ bloques', () => {
  it('30 celdas de 30 min entre 7:00 y 22:00', () => {
    expect(GRID_SLOTS_PER_DAY).toBe(30);
  });

  it('cada racha contigua es un bloque; ida y vuelta sin pérdida', () => {
    const sel = emptySelection();
    [4, 5, 6, 7].forEach((c) => sel[1].add(c)); // lunes 9:00–11:00
    [20, 21].forEach((c) => sel[1].add(c)); // lunes 17:00–18:00
    [0, 1, 2, 3, 4, 5, 6, 7].forEach((c) => sel[6].add(c)); // sábado 7:00–11:00
    const blocks = cellsToBlocks(sel);
    expect(blocks).toEqual([
      { dayOfWeek: 1, startTime: '09:00', endTime: '11:00' },
      { dayOfWeek: 1, startTime: '17:00', endTime: '18:00' },
      { dayOfWeek: 6, startTime: '07:00', endTime: '11:00' },
    ]);
    expect(cellsToBlocks(blocksToCells(blocks))).toEqual(blocks);
  });

  it('una racha de más de 4 h NO se parte en silencio: la validación la nombra', () => {
    const sel = emptySelection();
    for (let c = 4; c < 16; c++) sel[3].add(c); // miércoles 9:00–15:00
    const r = validateWeeklyAvailability(cellsToBlocks(sel));
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toContain('Miércoles 09:00–15:00');
  });
});
