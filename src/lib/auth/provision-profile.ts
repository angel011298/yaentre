import 'server-only';
import type { Prisma, UserProfile } from '@prisma/client';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db/prisma';
import { ATTRIBUTION_COOKIE_NAME, parseAttributionCookie } from '@/lib/marketing/attribution';

/**
 * G100 — crea el `UserProfile` de una identidad de Auth si aún no existe.
 * Mismo upsert que el registro con contraseña (`signUpAction`): el rol solo
 * se fija al CREAR y la atribución de campaña (F24) se graba solo en el
 * `create`, nunca sobreescribe la original. Lo usa el retorno de Google, que
 * puede ser el primer contacto de la cuenta con la app.
 */
export async function ensureStudentProfile(authUserId: string): Promise<{ profile: UserProfile; created: boolean }> {
  const existing = await prisma.userProfile.findUnique({ where: { userId: authUserId } });
  if (existing) return { profile: existing, created: false };

  const acquisitionSource = parseAttributionCookie((await cookies()).get(ATTRIBUTION_COOKIE_NAME)?.value);
  const profile = await prisma.userProfile.upsert({
    where: { userId: authUserId },
    create: {
      userId: authUserId,
      role: 'STUDENT',
      onboardingStep: 0,
      ...(acquisitionSource
        ? { acquisitionSource: acquisitionSource as unknown as Prisma.InputJsonValue }
        : {}),
    },
    update: {},
  });
  return { profile, created: true };
}
