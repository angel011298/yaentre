import { getClassroomProvider } from '@/lib/classroom/google-calendar';
import { getStripe } from '@/lib/stripe/client';
import type { CancellationDeps } from './cancellation';

/** Dependencias reales (Stripe, aula, reloj) de las operaciones que cancelan o reembolsan una clase. */
export function classRuntimeDeps(now: Date = new Date()): CancellationDeps {
  return { stripe: getStripe(), classroom: getClassroomProvider(), now };
}
