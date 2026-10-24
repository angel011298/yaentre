import { prisma } from './prisma';
import { getAuthEmails } from './auth-users';
import { getSiteUrl } from '@/lib/auth/site-url';
import { sendEmail } from '@/lib/email/client';
import { accessNoticeEmail } from '@/lib/email/templates';
import { reportSilentDegradation } from '@/lib/observability/report';
import {
  checkAccessStatus,
  dueExpiryNotice,
  effectiveGraceEndsAt,
  expiryNoticeKey,
} from '@/lib/subscriptions/access-check';
import { ACCESS_DURATION, extensionPriceCents } from '@/lib/subscriptions/access-duration';

/**
 * G103 — AVISOS DE VIGENCIA (spec de temporalidad §3.5): 30, 7 y 1 día
 * antes, el día que expira y al terminar la gracia.
 *
 * ── Idempotencia (el cron puede correr dos veces, o dos rutas a la vez) ──
 *
 * Cada aviso se RECLAMA antes de mandarse con un UPDATE condicional sobre
 * `expiryNoticesSent` (`NOT has key` → `push key`): de dos corridas
 * simultáneas solo una obtiene `count = 1` y manda el correo. Si el envío
 * FALLA, la marca se quita para que la siguiente corrida reintente — un aviso
 * que nunca llegó no puede quedar registrado como enviado (G73b).
 *
 * Si un alumno tiene varias suscripciones (una vencida y una nueva), solo se
 * avisa sobre la que MÁS acceso le da: no tiene sentido decirle que su acceso
 * expira si compró otro plan que dura más.
 */

const WINDOW_DAYS = 30 + ACCESS_DURATION.GRACE_PERIOD_DAYS * 2;

export async function runAccessExpiryJob(now: Date = new Date()): Promise<number> {
  const horizon = new Date(now.getTime() + 31 * 24 * 3600 * 1000);
  const floor = new Date(now.getTime() - WINDOW_DAYS * 24 * 3600 * 1000);

  const candidates = await prisma.subscription.findMany({
    where: {
      status: 'ACTIVE',
      plan: { in: ['SEASON_PASS', 'PREMIUM'] },
      expiresAt: { gte: floor, lte: horizon },
    },
    select: {
      id: true,
      userProfileId: true,
      status: true,
      plan: true,
      expiresAt: true,
      graceEndsAt: true,
      expiryNoticesSent: true,
    },
  });
  if (candidates.length === 0) return 0;

  // ¿El alumno tiene OTRA suscripción con más acceso? Entonces esta no se avisa.
  const userIds = [...new Set(candidates.map((c) => c.userProfileId))];
  const allSubs = await prisma.subscription.findMany({
    where: { userProfileId: { in: userIds }, status: 'ACTIVE' },
    select: { id: true, userProfileId: true, status: true, plan: true, expiresAt: true, graceEndsAt: true },
  });
  const accessEnd = (s: (typeof allSubs)[number]) =>
    s.expiresAt === null ? Infinity : (effectiveGraceEndsAt(s)?.getTime() ?? 0);
  const bestByUser = new Map<string, string>();
  for (const s of allSubs) {
    const current = bestByUser.get(s.userProfileId);
    const currentSub = allSubs.find((x) => x.id === current);
    if (!currentSub || accessEnd(s) > accessEnd(currentSub)) bestByUser.set(s.userProfileId, s.id);
  }

  const due = candidates
    .filter((c) => bestByUser.get(c.userProfileId) === c.id)
    .map((c) => ({ sub: c, kind: dueExpiryNotice(c, now) }))
    .filter((d): d is { sub: (typeof candidates)[number]; kind: NonNullable<typeof d.kind> } => d.kind !== null)
    .filter((d) => !d.sub.expiryNoticesSent.includes(expiryNoticeKey(d.kind, d.sub.expiresAt!)));
  if (due.length === 0) return 0;

  const emails = await getAuthEmails([...new Set(due.map((d) => d.sub.userProfileId))]);
  if (emails.size < new Set(due.map((d) => d.sub.userProfileId)).size) {
    reportSilentDegradation(
      'email_recipients',
      new Error('Avisos de vigencia sin correo resoluble'),
      { job: 'accessExpiry', expected: due.length, resolved: emails.size }
    );
  }

  const site = getSiteUrl();
  let sent = 0;
  for (const { sub, kind } of due) {
    const to = emails.get(sub.userProfileId);
    if (!to) continue;
    const key = expiryNoticeKey(kind, sub.expiresAt!);

    // Reclamo atómico: solo una corrida gana esta llave.
    const claimed = await prisma.subscription.updateMany({
      where: { id: sub.id, NOT: { expiryNoticesSent: { has: key } } },
      data: { expiryNoticesSent: { push: key } },
    });
    if (claimed.count === 0) continue;

    const status = checkAccessStatus(sub, now);
    const { subject, html } = accessNoticeEmail({
      kind,
      expiresAt: sub.expiresAt!,
      graceEndsAt: effectiveGraceEndsAt(sub)!,
      extensionPriceCents: status === 'EXPIRED' ? null : extensionPriceCents(sub.plan),
      siteUrl: site,
    });

    const result = await sendEmail({ to, subject, html });
    if (result.ok) {
      sent++;
      continue;
    }
    // El envío falló: se suelta la llave para que la próxima corrida lo intente.
    const fresh = await prisma.subscription.findUnique({
      where: { id: sub.id },
      select: { expiryNoticesSent: true },
    });
    if (fresh) {
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { expiryNoticesSent: fresh.expiryNoticesSent.filter((k) => k !== key) },
      });
    }
  }
  return sent;
}
