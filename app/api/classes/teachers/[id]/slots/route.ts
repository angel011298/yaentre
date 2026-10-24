import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { AuthError } from '@/lib/auth/errors';
import { requireUser } from '@/lib/auth/guards';
import { getBookableTeacher, loadSlotInputs } from '@/lib/db/classes';
import { hasPremiumAccess } from '@/lib/db/premium-access';
import { readMarketplaceFlags } from '@/lib/marketplace/flags';
import { consumeRateLimit } from '@/lib/rate-limit/store';
import { currentClientIp } from '@/lib/rate-limit/request';
import { mexicoDayKey } from '@/lib/subscriptions/access-check';
import { AVAILABILITY_RULES } from '@/lib/teachers/availability';
import { calculateAvailableSlots } from '@/lib/teachers/slot-calculator';
import { calculateTariff, DEFAULT_DEMAND_CATEGORY } from '@/lib/teachers/tariff';
import { canSeeTrack, TRACK_DENIAL_MESSAGES } from '@/lib/teachers/track-access';

/**
 * G103 — GET /api/classes/teachers/{id}/slots (spec §1.8).
 *
 * Horarios disponibles de un profesor con el PRECIO FINAL de cada uno (nunca
 * la fórmula ni los multiplicadores: el alumno solo ve cuánto paga). El
 * precio se calcula en el servidor con el tabulador; el cliente no manda
 * montos. Pista ADMISION: solo con Premium vigente (el servidor lo exige; la
 * interfaz solo lo refleja).
 */
export const dynamic = 'force-dynamic';

const querySchema = z
  .object({
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    days: z.coerce.number().int().min(1).max(AVAILABILITY_RULES.MAX_BOOKING_ADVANCE_DAYS + 1).optional(),
    duration: z.coerce.number().pipe(z.union([z.literal(50), z.literal(80)])),
    subject: z.string().min(2).max(40).regex(/^[a-z_]+$/),
    track: z.enum(['ADMISION', 'REGULARIZACION']).default('ADMISION'),
  })
  .strict();

const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store', ...extra } });

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const flags = readMarketplaceFlags();
  if (!flags.liveClasses) return json({ error: 'No encontrado.' }, 404);

  const { id } = await params;
  if (!/^c[a-z0-9]{20,40}$/.test(id)) return json({ error: 'No encontrado.' }, 404);

  let profileId: string;
  try {
    profileId = (await requireUser()).profile.id;
  } catch (err) {
    if (err instanceof AuthError) return json({ error: err.message }, 401);
    throw err;
  }

  const ip = await currentClientIp();
  const limit = await consumeRateLimit('SLOTS_READ_IP', ip);
  if (!limit.allowed) {
    return json({ error: 'Demasiadas consultas. Espera un momento.' }, 429, {
      'Retry-After': String(limit.retryAfterSecs),
    });
  }

  const parsed = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) return json({ error: 'Consulta inválida.' }, 400);
  const q = parsed.data;

  if (!canSeeTrack(q.track, flags)) return json({ error: TRACK_DENIAL_MESSAGES.TRACK_DISABLED }, 404);
  if (q.track === 'ADMISION' && !(await hasPremiumAccess(profileId))) {
    return json({ error: TRACK_DENIAL_MESSAGES.PREMIUM_REQUIRED, code: 'PREMIUM_REQUIRED' }, 403);
  }

  const teacher = await getBookableTeacher(id, q.track);
  if (!teacher || !teacher.subjects.some((s) => s.subjectKey === q.subject)) {
    return json({ error: 'Este profesor no da esa materia.' }, 404);
  }

  const now = new Date();
  const inputs = await loadSlotInputs(teacher.id, now);
  const slots = calculateAvailableSlots({
    availability: inputs.availability,
    blockedDates: inputs.blockedDates,
    existingBookings: inputs.bookings,
    durationMinutes: q.duration,
    now,
    fromDate: q.from,
    daysAhead: q.days,
  });

  return json({
    teacherId: teacher.id,
    timezone: 'America/Mexico_City',
    today: mexicoDayKey(now),
    duration: q.duration,
    slots: slots.map((s) => ({
      date: s.date,
      startTime: s.startTime,
      endTime: s.endTime,
      startsAt: s.startsAt,
      priceCents: calculateTariff({
        track: q.track,
        subjectKey: q.subject,
        teacherLevel: teacher.level,
        durationMinutes: q.duration,
        advanceCategory: s.advanceCategory,
        scheduleCategory: s.scheduleCategory,
        demandCategory: DEFAULT_DEMAND_CATEGORY,
      }).finalCents,
    })),
  });
}
