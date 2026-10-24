import { loadAccessSummary } from './access-summary';
import { hasPaidAccess } from '@/lib/subscriptions/access-check';

/**
 * G103 — ¿el alumno tiene Premium con acceso vigente (ACTIVE o en gracia)?
 * Es el requisito de la pista ADMISION de las clases en vivo. Premium ABRE el
 * acceso; cada clase se cobra aparte (regla inviolable del CONTEXTO §3.2).
 */
export async function hasPremiumAccess(userProfileId: string, now: Date = new Date()): Promise<boolean> {
  const summary = await loadAccessSummary(userProfileId, now);
  return summary.plan === 'PREMIUM' && hasPaidAccess(summary.accessStatus);
}
