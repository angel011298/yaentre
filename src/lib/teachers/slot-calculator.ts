import { fromZonedTime } from 'date-fns-tz';
import { MEXICO_TIME_ZONE } from '@/lib/paywall/mexico-time';
import { mexicoDayKey } from '@/lib/subscriptions/access-check';
import { AVAILABILITY_RULES, formatHHmm, parseHHmm, type AvailabilityBlock } from './availability';
import { hasConflict, type ExistingBooking } from './conflict-prevention';
import { advanceCategoryFor, type AdvanceCategory, type ClassDuration, type ScheduleCategory } from './tariff';

/**
 * G103 — MOTOR DE HORARIOS DISPONIBLES (spec §1.4). Módulo PURO.
 *
 * ── Corrección obligatoria a la spec ────────────────────────────────────────
 * La spec construía cada horario con `new Date(\`${dateStr}T${time}:00\`)`, que
 * interpreta la hora en la zona del SERVIDOR. Vercel corre en UTC: un bloque
 * de 9:00 del profesor se ofrecía como 9:00 UTC = 3:00 en la Ciudad de México,
 * y la anticipación mínima de 4 h se medía contra otra hora. Aquí cada horario
 * se construye con `fromZonedTime(…, 'America/Mexico_City')` y se devuelve el
 * instante en UTC (`startsAt`), que es lo que se guarda en `scheduledAt`. El
 * día de la semana sale de la FECHA local, no de `getDay()` del servidor.
 *
 * Excluye: fechas bloqueadas, horarios que chocan con clases que ocupan el
 * horario (con 10 min de margen), menos de 4 h de anticipación y más de 30
 * días.
 */

export interface AvailableSlot {
  /** `YYYY-MM-DD` en la Ciudad de México. */
  date: string;
  startTime: string;
  endTime: string;
  /** Instante de inicio, ISO en UTC (lo que se manda para reservar). */
  startsAt: string;
  dayOfWeek: number;
  scheduleCategory: ScheduleCategory;
  advanceCategory: AdvanceCategory;
}

/**
 * H_horario. Sábado y domingo = fin de semana; L-V de 8:00 a 17:59 = diurno; el
 * resto = nocturno. ⚠️ La spec no define las 7:00-7:59 entre semana y su código
 * las deja como nocturno (×1.08): se respeta tal cual y queda anotado como
 * decisión para Ángel en el retorno.
 */
export function getScheduleCategory(dayOfWeek: number, hour: number): ScheduleCategory {
  if (dayOfWeek === 0 || dayOfWeek === 6) return 'WEEKEND';
  if (hour >= 8 && hour < 18) return 'DAYTIME';
  return 'EVENING';
}

/** Día de la semana (0 = domingo) de una fecha `YYYY-MM-DD`, sin zona del sistema. */
export function dayOfWeekOf(dateKey: string): number {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** `YYYY-MM-DD` + n días de calendario. */
export function addDaysToKey(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Instante UTC de una fecha y hora LOCALES de la Ciudad de México. */
export function mexicoLocalToInstant(dateKey: string, hhmm: string): Date {
  return fromZonedTime(`${dateKey}T${hhmm}:00`, MEXICO_TIME_ZONE);
}

export function calculateAvailableSlots(params: {
  availability: Array<AvailabilityBlock & { isActive?: boolean }>;
  /** Fechas bloqueadas como `YYYY-MM-DD`. */
  blockedDates: string[];
  existingBookings: ExistingBooking[];
  durationMinutes: ClassDuration;
  now: Date;
  /** Primer día a consultar (`YYYY-MM-DD`); por defecto, hoy en México. */
  fromDate?: string;
  daysAhead?: number;
}): AvailableSlot[] {
  const { now, durationMinutes } = params;
  const daysAhead = Math.min(
    Math.max(1, params.daysAhead ?? AVAILABILITY_RULES.MAX_BOOKING_ADVANCE_DAYS),
    AVAILABILITY_RULES.MAX_BOOKING_ADVANCE_DAYS + 1
  );
  const earliest = now.getTime() + AVAILABILITY_RULES.MIN_BOOKING_ADVANCE_HOURS * 3_600_000;
  const latest = now.getTime() + AVAILABILITY_RULES.MAX_BOOKING_ADVANCE_DAYS * 86_400_000;
  const blocked = new Set(params.blockedDates);
  const today = mexicoDayKey(now);
  const start = params.fromDate && params.fromDate > today ? params.fromDate : today;

  const slots: AvailableSlot[] = [];
  for (let d = 0; d < daysAhead; d++) {
    const date = addDaysToKey(start, d);
    if (blocked.has(date)) continue;
    const dow = dayOfWeekOf(date);

    const dayBlocks = params.availability
      .filter((a) => a.dayOfWeek === dow && a.isActive !== false)
      .map((a) => ({ start: parseHHmm(a.startTime), end: parseHHmm(a.endTime) }))
      .filter((a): a is { start: number; end: number } => a.start !== null && a.end !== null)
      .sort((a, b) => a.start - b.start);

    for (const block of dayBlocks) {
      for (
        let m = block.start;
        m + durationMinutes <= block.end;
        m += AVAILABILITY_RULES.SLOT_GRANULARITY_MINUTES
      ) {
        const startTime = formatHHmm(m);
        const startsAt = mexicoLocalToInstant(date, startTime);
        const t = startsAt.getTime();
        if (t < earliest || t > latest) continue;
        if (
          hasConflict({
            scheduledAt: startsAt,
            durationMinutes,
            existingBookings: params.existingBookings,
            now,
          })
        ) {
          continue;
        }
        slots.push({
          date,
          startTime,
          endTime: formatHHmm(m + durationMinutes),
          startsAt: startsAt.toISOString(),
          dayOfWeek: dow,
          scheduleCategory: getScheduleCategory(dow, Math.floor(m / 60)),
          advanceCategory: advanceCategoryFor(startsAt, now),
        });
      }
    }
  }
  return slots;
}

/** ¿El instante pedido es EXACTAMENTE uno de los horarios ofrecidos? */
export function findSlot(slots: AvailableSlot[], startsAt: Date): AvailableSlot | null {
  const iso = startsAt.toISOString();
  return slots.find((s) => s.startsAt === iso) ?? null;
}
