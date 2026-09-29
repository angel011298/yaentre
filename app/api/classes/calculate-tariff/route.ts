import { readJson, jsonOk } from '@/lib/api/respond';
import { studentRoute } from '@/lib/api/route-context';
import { bookingRuleError, evaluateBookingRequest } from '@/lib/classes/booking-rules';
import { MarketplaceError } from '@/lib/classes/errors';
import { quoteSchema } from '@/lib/classes/schemas';
import { getActivePremium, getTeacherForBooking } from '@/lib/db/classes';
import { parseStoredAvailability } from '@/lib/teachers/availability';
import { quoteTariff } from '@/lib/teachers/tariff';

/**
 * POST /api/classes/calculate-tariff (spec §11). Devuelve ÚNICAMENTE el precio
 * final: el alumno jamás ve la fórmula ni los multiplicadores (spec §5.0).
 * `quoteTariff` no expone otra cosa, así que ni por descuido se serializa el
 * desglose.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = studentRoute(
  'classes.calculate-tariff',
  { rateLimit: 'DIRECTORY_READ', requirePremium: true, requireOpen: true },
  async (ctx, request) => {
    const body = quoteSchema.parse(await readJson(request));
    const now = new Date();

    const teacher = await getTeacherForBooking(body.teacherId);
    if (!teacher) throw new MarketplaceError('NOT_FOUND', 'Ese profesor ya no está disponible.');
    const premium = await getActivePremium(ctx.profile.id, now);

    const rules = evaluateBookingRequest({
      subjectKey: body.subjectKey,
      durationMinutes: body.durationMinutes,
      scheduledAt: body.scheduledAt,
      now,
      offeredSubjects: teacher.subjects,
      availability: parseStoredAvailability(teacher.availability),
      teacherLevel: teacher.level,
      planExpiresAt: premium?.expiresAt ?? null,
    });
    if (!rules.ok) throw bookingRuleError(rules.error);

    return jsonOk(quoteTariff(rules.tariffParams));
  }
);
