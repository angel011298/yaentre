import type { RefundDenial } from '@/lib/admin/capabilities';

/**
 * LA VÁLVULA DE REEMBOLSO (handoff §3.1: «48 h con consumo cero, no publicada
 * como derecho, discrecional»). Módulo PURO.
 *
 * El acceso se activa de inmediato y no aplica el derecho de revocación del art.
 * 56 LFPC (Bloque 1, consentimiento en el checkout), así que un reembolso NO es
 * una obligación: es una decisión. La válvula fija cuándo esa decisión se le
 * delega a soporte —dentro de ella— y cuándo es de admin maestro.
 *
 * «CONSUMO CERO» el contexto maestro no lo define. Aquí se mide, y se declara
 * como pregunta abierta en el retorno, como CERO SESIONES DE ESTUDIO iniciadas
 * desde que se activó el plan (diagnóstico, práctica y simulacros todas cuentan).
 * Es un proxy conservador: la persona que abrió un simulacro y lo dejó ya
 * consumió contenido (los reactivos se sirvieron completos al abrirlo, G67).
 */

export const REFUND_VALVE_HOURS = 48;

const HOUR_MS = 60 * 60 * 1000;

export interface ValveFacts {
  /** Cuándo se COBRÓ (`payments.paidAt`). Sin fecha de cobro no hay válvula. */
  paidAt: Date | null;
  now: Date;
  /** Sesiones de estudio iniciadas desde que se activó el plan. */
  sessionsSinceActivation: number;
}

export type ValveVerdict =
  | { inside: true }
  | { inside: false; reason: 'NO_PAYMENT_DATE' | 'TOO_LATE' | 'CONSUMED' };

export function evaluateValve(facts: ValveFacts): ValveVerdict {
  if (!facts.paidAt) return { inside: false, reason: 'NO_PAYMENT_DATE' };
  // Un reloj que va hacia atrás no abre la válvula: se compara con `<=` sobre una diferencia no negativa.
  const elapsed = facts.now.getTime() - facts.paidAt.getTime();
  if (elapsed < 0 || elapsed > REFUND_VALVE_HOURS * HOUR_MS) return { inside: false, reason: 'TOO_LATE' };
  if (facts.sessionsSinceActivation > 0) return { inside: false, reason: 'CONSUMED' };
  return { inside: true };
}

/** Mensajes al agente de soporte (voz de la interfaz: qué pasó y cómo seguir). */
export const REFUND_DENIAL_MESSAGE: Record<RefundDenial, string> = {
  ROLE_NOT_ALLOWED: 'Tu rol no puede emitir reembolsos.',
  MASTER_REQUIRED: 'Emitir un reembolso lo hace solo el administrador maestro.',
  OUTSIDE_VALVE:
    'Este plan ya salió de la válvula de 48 horas o ya se usó. Un reembolso fuera de ella lo decide el administrador maestro: escálalo con el motivo.',
};

/** Por qué NO está dentro de la válvula, para mostrarlo en la ficha. */
export const VALVE_REASON_LABEL = {
  NO_PAYMENT_DATE: 'sin fecha de cobro',
  TOO_LATE: 'pasaron más de 48 horas desde el cobro',
  CONSUMED: 'ya inició sesiones de estudio',
} as const;
