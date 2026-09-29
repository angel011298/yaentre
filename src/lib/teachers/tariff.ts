/**
 * TABULADOR DE TARIFAS DE CLASES — Bloque 2 (spec §5). Módulo PURO y
 * determinista: sin DB, sin Stripe, sin `Date.now()` implícito, sin IA.
 *
 *   Tarifa = B_materia × N_profesor × D_duración × A_anticipación × H_horario × Q_demanda
 *   con tope duro de 1.5× la tarifa base.
 *
 * ── LA REGLA INVIOLABLE (contexto maestro §4.3, spec §5.3 y §13) ────────────
 *
 * El algoritmo le pone precio a la CLASE, nunca al COMPRADOR. Ninguna entrada
 * de este módulo puede ser un dato de la persona que compra: ni su historial,
 * ni su dispositivo, ni su ubicación, ni lo que haya gastado, ni su plan
 * (art. 26-II LFPDPPP y 76 Bis V y VII LFPC). Dos alumnos distintos que piden
 * la MISMA clase, al mismo profesor, al mismo tiempo y con la misma
 * anticipación, pagan EXACTAMENTE lo mismo. `calculateTariff` lo hace cumplir
 * en tiempo de ejecución con `validateTariffInput`, no solo con tipos: un
 * campo de más que viaje en un objeto se rechaza aunque TypeScript no lo vea.
 *
 * ── LA REGLA DE PRESENTACIÓN (spec §5.0) ────────────────────────────────────
 *
 * La fórmula y los multiplicadores son INTERNOS. El alumno JAMÁS ve la fórmula
 * ni los factores: ve el precio final, y en el directorio un «Desde $X». Por
 * eso este módulo separa dos funciones:
 *
 *   · `calculateTariff`  — devuelve el desglose COMPLETO. Solo lo usan el
 *                          servidor (para sellar la fila de la clase) y las
 *                          pruebas. NUNCA se serializa hacia un cliente.
 *   · `quoteTariff`      — devuelve ÚNICAMENTE `{ priceCents }`. Es lo que
 *                          usan los endpoints y las páginas de cara al alumno.
 *
 * ── ARITMÉTICA ENTERA ───────────────────────────────────────────────────────
 *
 * Los multiplicadores se guardan en CENTÉSIMAS (1.15 → 115) y todo el cálculo
 * es entero exacto con BigInt. Con `Number` un producto como 1.15 × 1.05 × 1.08
 * acumula error de punto flotante y un precio puede salir un centavo distinto
 * según el orden de las multiplicaciones — inaceptable en algo que cobra
 * dinero y que después se audita.
 */

/** Centavos MXN. Todas las tarifas base entran en el rango 260–340 pesos (§4.3). */
export const BASE_RATES = {
  matematicas: 30000, //          $300
  fisica: 30000, //               $300
  quimica: 28000, //              $280
  biologia: 28000, //             $280
  espanol: 26000, //              $260
  ingles: 30000, //               $300
  historia: 26000, //             $260
  geografia: 26000, //            $260
  filosofia: 26000, //            $260
  literatura: 26000, //           $260
  // IPN específicas
  habilidad_verbal: 28000, //     $280
  habilidad_matematica: 30000, // $300
  // Agrupaciones futuras
  ciencias_sociales: 26000, //    $260
  razonamiento: 34000, //         $340 — mayor demanda/dificultad
} as const;

export type SubjectKey = keyof typeof BASE_RATES;

export function isSubjectKey(value: string): value is SubjectKey {
  return Object.prototype.hasOwnProperty.call(BASE_RATES, value);
}

/** Nombre visible de cada materia del catálogo. */
export const SUBJECT_LABELS: Record<SubjectKey, string> = {
  matematicas: 'Matemáticas',
  fisica: 'Física',
  quimica: 'Química',
  biologia: 'Biología',
  espanol: 'Español',
  ingles: 'Inglés',
  historia: 'Historia',
  geografia: 'Geografía',
  filosofia: 'Filosofía',
  literatura: 'Literatura',
  habilidad_verbal: 'Habilidad verbal',
  habilidad_matematica: 'Habilidad matemática',
  ciencias_sociales: 'Ciencias sociales',
  razonamiento: 'Razonamiento',
};

export const SUBJECT_KEYS = Object.keys(BASE_RATES) as SubjectKey[];

export type TeacherLevelKey = 'INICIAL' | 'VERIFICADO' | 'DESTACADO';
export type DurationMinutes = 50 | 80;
export type AdvanceCategory = 'EARLY' | 'STANDARD' | 'LAST_MINUTE';
export type ScheduleCategory = 'DAYTIME' | 'EVENING' | 'WEEKEND';
export type DemandCategory = 'LOW' | 'NORMAL' | 'HIGH';

/**
 * Multiplicadores en CENTÉSIMAS (115 = ×1.15). Ver «ARITMÉTICA ENTERA».
 * Los valores son los de la spec §5.2 / contexto maestro §4.3.
 */
export const MULTIPLIERS_HUNDREDTHS = {
  level: { INICIAL: 100, VERIFICADO: 115, DESTACADO: 130 },
  duration: { 50: 100, 80: 150 },
  advance: { EARLY: 100, STANDARD: 105, LAST_MINUTE: 112 },
  schedule: { DAYTIME: 100, EVENING: 108, WEEKEND: 112 },
  demand: { LOW: 95, NORMAL: 100, HIGH: 110 },
} as const;

/** Tope duro: nunca más de 1.5× la tarifa base (contexto maestro §4.3). */
export const TARIFF_CAP_HUNDREDTHS = 150;

/** Comisión de YaEntre: 25% del valor de la clase (contexto maestro §4.4). */
export const COMMISSION_RATE_PERCENT = 25;

// El `target` del proyecto es ES2017: los LITERALES bigint (`100n`) y `**` entre
// bigints no compilan con `tsc`, aunque Vitest (esbuild) sí los acepte. Se usa
// `BigInt(…)`, cuyo tipo sí existe porque `lib` incluye `esnext`. Ambas
// constantes caben exactas en un `Number` (< 2^53), así que la conversión no
// pierde nada.
const BIG_2 = BigInt(2);
const BIG_100 = BigInt(100);
/** 100^5 = 10^10: cinco factores en centésimas (nivel, duración, anticipación, horario, demanda). */
const SCALE = BigInt(10_000_000_000);
/** 100^4 = 10^8: el tope en centésimas se compara contra un producto de CINCO factores. */
const CAP_SCALE_UNIT = BigInt(100_000_000);

/**
 * Categorías de demanda que la operación tiene ACTIVAS hoy.
 *
 * ⚠️ DECISIÓN ABIERTA (ver RETORNO_BLOQUE2.md): ni el contexto maestro ni la
 * spec dicen CÓMO se decide si un bloque horario es de demanda baja, normal o
 * alta — solo que son «3 escalones». Inventar un umbral con 3 profesores
 * onboardeados produciría ruido, y ese ruido se cobraría. Por eso Q queda en
 * NORMAL (×1.00) hasta que CFO/CMO fijen la regla, y esta constante lo dice en
 * voz alta: el «Desde $X» del directorio se calcula sobre lo que de verdad se
 * puede cobrar, no sobre escalones que aún no se usan.
 */
export const ACTIVE_DEMAND_CATEGORIES: readonly DemandCategory[] = ['NORMAL'];

/** Decide la categoría de demanda de un bloque. Hoy siempre NORMAL. */
export function resolveDemandCategory(): DemandCategory {
  return 'NORMAL';
}

// ─────────────────────── Anti-discriminación (spec §5.3) ───────────────────────

/**
 * Claves que JAMÁS pueden entrar al cálculo. Es la lista de la spec más las
 * variantes con las que este repo nombra a una persona (`studentProfileId`,
 * `userProfileId`, `email`…) y los datos de contexto del comprador (IP, ciudad,
 * plan). El rechazo es por NOMBRE de campo: si alguien añade un dato del alumno
 * al objeto, revienta aquí en vez de colarse en el precio.
 */
export const FORBIDDEN_TARIFF_KEYS = [
  'userId',
  'userProfileId',
  'studentUserId',
  'studentProfileId',
  'parentProfileId',
  'authUserId',
  'studentId',
  'buyerName',
  'buyerId',
  'userPlan',
  'plan',
  'userHistory',
  'userDevice',
  'device',
  'userLocation',
  'location',
  'city',
  'ip',
  'ipAddress',
  'userSpend',
  'userAge',
  'birthDate',
  'userGender',
  'gender',
  'email',
] as const;

export class TariffGuardrailError extends Error {
  constructor(key: string) {
    super(
      `GUARDRAIL VIOLATION: el tabulador no puede usar datos del comprador (${key}). ` +
        `Art. 26-II LFPDPPP + 76 Bis V y VII LFPC.`
    );
    this.name = 'TariffGuardrailError';
  }
}

/**
 * Lanza si el objeto trae CUALQUIER dato del comprador. Comprueba las claves
 * propias (no las heredadas) sin importar mayúsculas: `StudentId` y `studentid`
 * no son una salida.
 */
export function validateTariffInput(params: Record<string, unknown>): void {
  const forbidden = new Set(FORBIDDEN_TARIFF_KEYS.map((k) => k.toLowerCase()));
  for (const key of Object.keys(params)) {
    if (forbidden.has(key.toLowerCase())) throw new TariffGuardrailError(key);
  }
}

// ─────────────────────────────── Cálculo ───────────────────────────────

export interface TariffParams {
  subjectKey: SubjectKey;
  teacherLevel: TeacherLevelKey;
  durationMinutes: DurationMinutes;
  advanceCategory: AdvanceCategory;
  scheduleCategory: ScheduleCategory;
  demandCategory: DemandCategory;
}

export interface TariffBreakdown {
  baseCents: number;
  finalCents: number;
  /** Multiplicadores como decimales (1.15) — son lo que se sella en la fila de la clase. */
  multipliers: {
    level: number;
    duration: number;
    advance: number;
    schedule: number;
    demand: number;
  };
  capped: boolean;
}

/** Divide entre `den` redondeando a la mitad hacia arriba, con enteros positivos. */
function divRound(num: bigint, den: bigint): bigint {
  return (BIG_2 * num + den) / (BIG_2 * den);
}

/**
 * Desglose COMPLETO. Uso interno del servidor y de las pruebas: NUNCA se
 * serializa hacia el cliente (para eso, `quoteTariff`).
 */
export function calculateTariff(params: TariffParams): TariffBreakdown {
  validateTariffInput(params as unknown as Record<string, unknown>);

  if (!isSubjectKey(params.subjectKey)) {
    throw new Error(`Materia desconocida: ${String(params.subjectKey)}`);
  }
  const baseCents = BASE_RATES[params.subjectKey];

  const level = MULTIPLIERS_HUNDREDTHS.level[params.teacherLevel];
  const duration = MULTIPLIERS_HUNDREDTHS.duration[params.durationMinutes];
  const advance = MULTIPLIERS_HUNDREDTHS.advance[params.advanceCategory];
  const schedule = MULTIPLIERS_HUNDREDTHS.schedule[params.scheduleCategory];
  const demand = MULTIPLIERS_HUNDREDTHS.demand[params.demandCategory];
  if ([level, duration, advance, schedule, demand].some((m) => m === undefined)) {
    throw new Error('Categoría de tarifa inválida.');
  }

  const rawScaled = BigInt(level) * BigInt(duration) * BigInt(advance) * BigInt(schedule) * BigInt(demand);
  const capScaled = BigInt(TARIFF_CAP_HUNDREDTHS) * CAP_SCALE_UNIT; // 1.5 × 10^10
  const capped = rawScaled > capScaled;
  const scaled = capped ? capScaled : rawScaled;

  const finalCents = Number(divRound(BigInt(baseCents) * scaled, SCALE));

  return {
    baseCents,
    finalCents,
    multipliers: {
      level: level / 100,
      duration: duration / 100,
      advance: advance / 100,
      schedule: schedule / 100,
      demand: demand / 100,
    },
    capped,
  };
}

/**
 * Lo ÚNICO que ve el alumno de una tarifa: el precio final (spec §5.0).
 * Deliberadamente NO tiene campo de multiplicadores, de tope ni de base.
 */
export interface TariffQuote {
  priceCents: number;
}

export function quoteTariff(params: TariffParams): TariffQuote {
  return { priceCents: calculateTariff(params).finalCents };
}

// ─────────────────────── Reparto comisión / profesor ───────────────────────

export interface TariffSplit {
  commissionCents: number;
  teacherPayCents: number;
}

/**
 * 25% para YaEntre y el resto para el profesor, sobre un monto RETENIDO. La
 * comisión se redondea a la mitad hacia arriba y la parte del profesor es el
 * REMANENTE, así que `commission + teacherPay === amount` SIEMPRE: ni un
 * centavo se pierde ni se inventa en el reparto.
 */
export function splitTariff(amountCents: number): TariffSplit {
  if (!Number.isInteger(amountCents) || amountCents < 0) {
    throw new Error('El monto debe ser un entero de centavos no negativo.');
  }
  const commissionCents = Number(divRound(BigInt(amountCents) * BigInt(COMMISSION_RATE_PERCENT), BIG_100));
  return { commissionCents, teacherPayCents: amountCents - commissionCents };
}

// ─────────────────────────── Rangos para mostrar ───────────────────────────

/**
 * Piso REAL de una materia para un nivel: el precio más bajo que se puede
 * llegar a cobrar hoy (clase de 50 min, con ≥48 h de anticipación, en horario
 * diurno y con la demanda más baja ACTIVA). Es lo que respalda un «Desde $X»:
 * anunciar un piso que nadie puede pagar sería publicidad engañosa.
 */
export function priceFloorCents(subjectKey: SubjectKey, level: TeacherLevelKey = 'INICIAL'): number {
  const lowestDemand = ACTIVE_DEMAND_CATEGORIES.reduce((min, c) =>
    MULTIPLIERS_HUNDREDTHS.demand[c] < MULTIPLIERS_HUNDREDTHS.demand[min] ? c : min
  );
  return calculateTariff({
    subjectKey,
    teacherLevel: level,
    durationMinutes: 50,
    advanceCategory: 'EARLY',
    scheduleCategory: 'DAYTIME',
    demandCategory: lowestDemand,
  }).finalCents;
}

/** Techo de una materia: el tope duro de 1.5× (siempre alcanzable con 80 min). */
export function priceCeilingCents(subjectKey: SubjectKey): number {
  return calculateTariff({
    subjectKey,
    teacherLevel: 'DESTACADO',
    durationMinutes: 80,
    advanceCategory: 'LAST_MINUTE',
    scheduleCategory: 'WEEKEND',
    demandCategory: 'HIGH',
  }).finalCents;
}

/**
 * Rango «$X–$Y/clase» de una materia, para la página de transparencia y para
 * el onboarding (spec §3.1 y §5.0). Sin fórmula y sin multiplicadores.
 */
export function publicPriceRange(subjectKey: SubjectKey): { minCents: number; maxCents: number } {
  return { minCents: priceFloorCents(subjectKey, 'INICIAL'), maxCents: priceCeilingCents(subjectKey) };
}

/** «Desde $X» de un profesor: el piso más bajo entre las materias que imparte, a SU nivel. */
export function teacherFromPriceCents(subjectKeys: readonly SubjectKey[], level: TeacherLevelKey): number | null {
  if (subjectKeys.length === 0) return null;
  return Math.min(...subjectKeys.map((k) => priceFloorCents(k, level)));
}

/** Formato de pesos sin decimales cuando son redondos («$300»), con ellos si no («$247.50»). */
export function formatMxnFromCents(cents: number): string {
  const pesos = cents / 100;
  return pesos.toLocaleString('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: Number.isInteger(pesos) ? 0 : 2,
    maximumFractionDigits: 2,
  });
}
