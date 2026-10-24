/**
 * G103 — DISPONIBILIDAD SEMANAL DEL PROFESOR (spec §1.3). Módulo PURO.
 *
 * Bloques recurrentes en hora de la Ciudad de México, de 1 a 4 horas, en
 * múltiplos de 30 minutos, entre 7:00 y 22:00. Correcciones a la spec:
 *  - `"HH:mm"` se valida con una expresión estricta antes de partirlo (la
 *    spec hacía `split(':').map(Number)`, que acepta `"9:5"`, `"25:00"` o
 *    `"aa:bb"` → NaN y todas las comparaciones dan falso, o sea, «válido»);
 *  - además del bloque suelto se valida la SEMANA: bloques encimados del
 *    mismo día y el tope de 35 bloques.
 */

export const AVAILABILITY_RULES = {
  MIN_BLOCK_MINUTES: 60,
  MAX_BLOCK_MINUTES: 240,
  SLOT_GRANULARITY_MINUTES: 30,
  EARLIEST_HOUR: 7,
  LATEST_HOUR: 22,
  MIN_BOOKING_ADVANCE_HOURS: 4,
  MAX_BOOKING_ADVANCE_DAYS: 30,
  MAX_WEEKLY_BLOCKS: 35,
} as const;

export interface AvailabilityBlock {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** `"09:30"` → 570; `null` si no es una hora válida. */
export function parseHHmm(value: string): number | null {
  const m = HHMM.exec(value);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

export function formatHHmm(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

export const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'] as const;

export function validateAvailabilityBlock(block: AvailabilityBlock): { valid: boolean; error?: string } {
  if (!Number.isInteger(block.dayOfWeek) || block.dayOfWeek < 0 || block.dayOfWeek > 6) {
    return { valid: false, error: 'Día inválido' };
  }
  const start = parseHHmm(block.startTime);
  const end = parseHHmm(block.endTime);
  if (start === null || end === null) return { valid: false, error: 'Hora inválida (usa HH:mm)' };

  const { EARLIEST_HOUR, LATEST_HOUR, MIN_BLOCK_MINUTES, MAX_BLOCK_MINUTES, SLOT_GRANULARITY_MINUTES } =
    AVAILABILITY_RULES;
  if (start < EARLIEST_HOUR * 60) return { valid: false, error: `Horario más temprano: ${EARLIEST_HOUR}:00` };
  if (end > LATEST_HOUR * 60) return { valid: false, error: `Horario más tarde: ${LATEST_HOUR}:00` };

  const duration = end - start;
  if (duration < MIN_BLOCK_MINUTES) return { valid: false, error: `Mínimo ${MIN_BLOCK_MINUTES} minutos por bloque` };
  if (duration > MAX_BLOCK_MINUTES) {
    return { valid: false, error: `Máximo ${MAX_BLOCK_MINUTES / 60} horas por bloque` };
  }
  if (start % SLOT_GRANULARITY_MINUTES !== 0 || end % SLOT_GRANULARITY_MINUTES !== 0) {
    return { valid: false, error: 'Los bloques deben ser en intervalos de 30 minutos' };
  }
  return { valid: true };
}

export type WeekValidation = { ok: true } | { ok: false; error: string };

/** La semana completa que se guarda en lote (reemplazo total). */
export function validateWeeklyAvailability(blocks: AvailabilityBlock[]): WeekValidation {
  if (blocks.length > AVAILABILITY_RULES.MAX_WEEKLY_BLOCKS) {
    return { ok: false, error: `Máximo ${AVAILABILITY_RULES.MAX_WEEKLY_BLOCKS} bloques por semana` };
  }
  for (const b of blocks) {
    const v = validateAvailabilityBlock(b);
    if (!v.valid) return { ok: false, error: `${DAY_NAMES[b.dayOfWeek] ?? 'Día'} ${b.startTime}–${b.endTime}: ${v.error}` };
  }
  for (let day = 0; day < 7; day++) {
    const sameDay = blocks
      .filter((b) => b.dayOfWeek === day)
      .map((b) => ({ start: parseHHmm(b.startTime)!, end: parseHHmm(b.endTime)! }))
      .sort((a, b) => a.start - b.start);
    for (let i = 1; i < sameDay.length; i++) {
      if (sameDay[i].start < sameDay[i - 1].end) {
        return { ok: false, error: `${DAY_NAMES[day]}: hay bloques encimados` };
      }
    }
  }
  return { ok: true };
}

// ─────────────── Cuadrícula del editor (celdas de 30 min) ───────────────

/** Celdas por día entre 7:00 y 22:00: 30 celdas de 30 minutos. */
export const GRID_SLOTS_PER_DAY =
  ((AVAILABILITY_RULES.LATEST_HOUR - AVAILABILITY_RULES.EARLIEST_HOUR) * 60) /
  AVAILABILITY_RULES.SLOT_GRANULARITY_MINUTES;

export function cellStartMinutes(cellIndex: number): number {
  return AVAILABILITY_RULES.EARLIEST_HOUR * 60 + cellIndex * AVAILABILITY_RULES.SLOT_GRANULARITY_MINUTES;
}

/** `selected[day]` = conjunto de índices de celda marcados. */
export type CellSelection = Array<Set<number>>;

export function emptySelection(): CellSelection {
  return Array.from({ length: 7 }, () => new Set<number>());
}

/**
 * Celdas → bloques: cada racha CONTIGUA de un día es un bloque. No se parten
 * rachas largas: si una pasa de 4 h, `validateWeeklyAvailability` la rechaza
 * con un mensaje que dice cuál es (la spec fija 4 h continuas como máximo).
 */
export function cellsToBlocks(selection: CellSelection): AvailabilityBlock[] {
  const blocks: AvailabilityBlock[] = [];
  selection.forEach((cells, dayOfWeek) => {
    const sorted = [...cells].filter((c) => c >= 0 && c < GRID_SLOTS_PER_DAY).sort((a, b) => a - b);
    let runStart: number | null = null;
    let prev = -2;
    for (const c of [...sorted, Number.POSITIVE_INFINITY]) {
      if (c !== prev + 1) {
        if (runStart !== null) {
          blocks.push({
            dayOfWeek,
            startTime: formatHHmm(cellStartMinutes(runStart)),
            endTime: formatHHmm(cellStartMinutes(prev + 1)),
          });
        }
        runStart = c;
      }
      prev = c;
    }
  });
  return blocks;
}

export function blocksToCells(blocks: AvailabilityBlock[]): CellSelection {
  const selection = emptySelection();
  for (const b of blocks) {
    const start = parseHHmm(b.startTime);
    const end = parseHHmm(b.endTime);
    if (start === null || end === null || b.dayOfWeek < 0 || b.dayOfWeek > 6) continue;
    for (let m = start; m < end; m += AVAILABILITY_RULES.SLOT_GRANULARITY_MINUTES) {
      const idx = (m - AVAILABILITY_RULES.EARLIEST_HOUR * 60) / AVAILABILITY_RULES.SLOT_GRANULARITY_MINUTES;
      if (Number.isInteger(idx) && idx >= 0 && idx < GRID_SLOTS_PER_DAY) selection[b.dayOfWeek].add(idx);
    }
  }
  return selection;
}
