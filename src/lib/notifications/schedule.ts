import { startOfMexicoDay } from '@/lib/paywall/mexico-time';

/**
 * Cadencia de los correos programados (F16 tarea 8). Módulo PURO — separado
 * de `src/lib/db/notification-jobs.ts` a propósito: ese módulo importa
 * `src/lib/email/client.ts` (que trae `import 'server-only'`), lo que rompe
 * si se importa desde un test de Vitest sin el runtime de Next.js. Esta
 * regla de fecha no depende de nada de eso, así que vive aparte y se puede
 * probar sin tocar Prisma ni el cliente de correo.
 */
export function isMondayInMexico(now: Date): boolean {
  return startOfMexicoDay(now).getUTCDay() === 1;
}
