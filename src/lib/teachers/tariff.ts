import type { ClassTrack, TeacherLevel } from '@prisma/client';

/**
 * TABULADOR DE CLASES EN VIVO — determinista, sin IA
 * (spec del marketplace §5; G103 añade la pista REGULARIZACION, spec §2.10).
 *
 *   Tarifa = B_materia × N_profesor × D_duración × A_anticipación × H_horario × Q_demanda
 *
 * con TOPE DURO de 1.5× la base. Regla inviolable: el algoritmo pone precio a
 * la CLASE, nunca al comprador (art. 26-II LFPDPPP + art. 76 Bis V y VII LFPC):
 * `validateTariffInput` lanza ante cualquier dato del alumno y
 * `calculateTariff` la llama SIEMPRE antes de calcular.
 *
 * La fórmula y los multiplicadores son INTERNOS: al alumno solo se le muestra
 * el precio final (nunca un desglose). Las dos pistas usan los MISMOS
 * multiplicadores y el MISMO tope; solo cambia la tabla B.
 */

/** B — pista ADMISION (centavos MXN). Spec del marketplace §5.1. */
export const BASE_RATES: Record<string, number> = {
  matematicas: 30_000,
  fisica: 30_000,
  quimica: 28_000,
  biologia: 28_000,
  espanol: 26_000,
  ingles: 30_000,
  historia: 26_000,
  geografia: 26_000,
  filosofia: 26_000,
  literatura: 26_000,
  habilidad_verbal: 28_000,
  habilidad_matematica: 30_000,
  ciencias_sociales: 26_000,
  razonamiento: 34_000,
};

/**
 * B — pista REGULARIZACION (centavos MXN). Spec §2.10.
 * ⚠️ DECISIÓN ABIERTA de Ángel (spec §8.5 «pendiente (a)»): valores propuestos
 * por el CFO. Esta tabla es el ÚNICO lugar que hay que editar para ajustarlos.
 */
export const BASE_RATES_REGULARIZACION: Record<string, number> = {
  reg_matematicas: 26_000,
  reg_algebra: 26_000,
  reg_calculo: 30_000,
  reg_estadistica: 28_000,
  reg_fisica: 28_000,
  reg_quimica: 26_000,
  reg_biologia: 24_000,
  reg_espanol: 22_000,
  reg_ingles: 26_000,
  reg_historia: 22_000,
  reg_geografia: 22_000,
};

export const MULTIPLIERS = {
  level: { INICIAL: 1.0, VERIFICADO: 1.15, DESTACADO: 1.3 },
  duration: { 50: 1.0, 80: 1.5 },
  advance: { EARLY: 1.0, STANDARD: 1.05, LAST_MINUTE: 1.12 },
  schedule: { DAYTIME: 1.0, EVENING: 1.08, WEEKEND: 1.12 },
  demand: { LOW: 0.95, NORMAL: 1.0, HIGH: 1.1 },
} as const;

export const TARIFF_CAP_MULTIPLIER = 1.5;

export type ClassDuration = 50 | 80;
export const CLASS_DURATIONS: readonly ClassDuration[] = [50, 80];
export type AdvanceCategory = keyof typeof MULTIPLIERS.advance;
export type ScheduleCategory = keyof typeof MULTIPLIERS.schedule;
export type DemandCategory = keyof typeof MULTIPLIERS.demand;

/**
 * Q_demanda — ⚠️ DECISIÓN ABIERTA: la spec define los tres escalones pero no
 * CÓMO medir la demanda de un bloque. Hasta que Ángel lo defina, toda clase
 * usa NORMAL (×1.00): el precio no sube ni baja por una regla que nadie ha
 * aprobado. Es la única constante a cambiar cuando exista la regla.
 */
export const DEFAULT_DEMAND_CATEGORY: DemandCategory = 'NORMAL';

export function baseRateTable(track: ClassTrack): Record<string, number> {
  return track === 'REGULARIZACION' ? BASE_RATES_REGULARIZACION : BASE_RATES;
}

export function baseRateFor(track: ClassTrack, subjectKey: string): number | null {
  const rate = baseRateTable(track)[subjectKey];
  return typeof rate === 'number' ? rate : null;
}

/** A_anticipación — por horas entre la reserva y el inicio de la clase. */
export function advanceCategoryFor(scheduledAt: Date, bookedAt: Date): AdvanceCategory {
  const hours = (scheduledAt.getTime() - bookedAt.getTime()) / 3_600_000;
  if (hours >= 48) return 'EARLY';
  if (hours >= 24) return 'STANDARD';
  return 'LAST_MINUTE';
}

/**
 * GUARDRAIL: el tabulador NUNCA usa datos del comprador. Lista negra de
 * claves de la spec + cualquier clave que empiece por `user`, `student`,
 * `buyer` o `customer`: es más estricta que la lista literal, para que un
 * campo nuevo con otro nombre del alumno tampoco pase.
 */
export const FORBIDDEN_TARIFF_KEYS = [
  'userId',
  'userPlan',
  'userHistory',
  'userDevice',
  'userLocation',
  'userSpend',
  'userAge',
  'userGender',
  'buyerName',
  'studentId',
] as const;

export function validateTariffInput(params: Record<string, unknown>): void {
  for (const key of Object.keys(params)) {
    if (
      (FORBIDDEN_TARIFF_KEYS as readonly string[]).includes(key) ||
      /^(user|student|buyer|customer|alumno|comprador)/i.test(key)
    ) {
      throw new Error(
        `GUARDRAIL VIOLATION: tariff cannot use buyer data (${key}). Art. 26-II LFPDPPP + 76 Bis V LFPC.`
      );
    }
  }
}

export interface TariffParams {
  track: ClassTrack;
  subjectKey: string;
  teacherLevel: TeacherLevel;
  durationMinutes: ClassDuration;
  advanceCategory: AdvanceCategory;
  scheduleCategory: ScheduleCategory;
  demandCategory: DemandCategory;
}

export interface TariffResult {
  baseCents: number;
  finalCents: number;
  multipliers: {
    level: number;
    duration: number;
    advance: number;
    schedule: number;
    demand: number;
  };
  capped: boolean;
}

export function calculateTariff(params: TariffParams): TariffResult {
  validateTariffInput(params as unknown as Record<string, unknown>);

  const baseCents = baseRateFor(params.track, params.subjectKey);
  if (baseCents === null) throw new Error(`Materia desconocida para ${params.track}: ${params.subjectKey}`);

  const m = {
    level: MULTIPLIERS.level[params.teacherLevel],
    duration: MULTIPLIERS.duration[params.durationMinutes],
    advance: MULTIPLIERS.advance[params.advanceCategory],
    schedule: MULTIPLIERS.schedule[params.scheduleCategory],
    demand: MULTIPLIERS.demand[params.demandCategory],
  };
  if (Object.values(m).some((v) => typeof v !== 'number')) {
    throw new Error('Parámetro de tarifa fuera del tabulador.');
  }

  const raw = m.level * m.duration * m.advance * m.schedule * m.demand;
  const capped = raw > TARIFF_CAP_MULTIPLIER;
  const applied = Math.min(raw, TARIFF_CAP_MULTIPLIER);
  return { baseCents, finalCents: Math.round(baseCents * applied), multipliers: m, capped };
}

/**
 * Rango público por materia (página de transparencia, spec §5.0): del menor
 * precio posible (50 min, Inicial, con anticipación, diurno, demanda normal) al
 * tope de 1.5×. Solo rangos: nunca la fórmula ni los factores.
 */
export function publicPriceRange(track: ClassTrack, subjectKey: string): { minCents: number; maxCents: number } | null {
  const base = baseRateFor(track, subjectKey);
  if (base === null) return null;
  return { minCents: base, maxCents: Math.round(base * TARIFF_CAP_MULTIPLIER) };
}
