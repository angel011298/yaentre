/**
 * Catálogo tipado de eventos de producto (F20 tarea 2). Un solo lugar con
 * el nombre de cada evento y la forma exacta de sus propiedades — así ningún
 * call-site puede mandar un nombre mal escrito o, más importante, un campo
 * con PII por accidente: cada tipo de propiedades aquí es explícito y
 * deliberadamente NO incluye correo, nombre, IP ni ningún otro dato personal.
 *
 * `distinctId` (siempre `UserProfile.id`, nunca el correo/uid de Supabase)
 * viaja aparte en cada llamada a `trackServerEvent`/`posthog.capture`, no
 * como propiedad del evento.
 */

export interface AnalyticsEvents {
  // ── Registro y onboarding ──
  signup_completed: { role: 'STUDENT' | 'PARENT' };
  onboarding_completed: Record<string, never>;

  /**
   * G74 — un alumno pidió aviso para un área que todavía no se puede ofrecer
   * (`AreaCoverage.status = COMING_SOON`). Es la LISTA DE ESPERA real de esa
   * rama: `distinctId` es el `UserProfile.id`, así que el correo se resuelve
   * después con `app_security.auth_emails_for_profiles` (G73) sin que ningún
   * dato personal viaje en el evento. Ver docs/ESTADO.md §G74 para por qué
   * vive aquí y no en una tabla propia.
   */
  area_waitlist_joined: {
    areaCode: string;
    examLabel: string;
    coveredPct: number;
    pendingSubjects: number;
  };

  // ── Núcleo de estudio (finishSession, un solo dispatcher por modo) ──
  diagnostic_completed: { score: number; totalQuestions: number; durationSecs: number };
  practice_completed: {
    mode: 'TOPIC_DRILL' | 'AREA_PRACTICE';
    score: number;
    totalQuestions: number;
    durationSecs: number;
  };
  /** El indicador más importante del negocio (F20): un simulacro terminado. */
  simulation_completed: {
    score: number;
    totalQuestions: number;
    durationSecs: number;
    status: string;
    timeExceeded: boolean;
  };

  // ── Monetización ──
  paywall_shown: { trigger: string | null };
  checkout_started: { plan: string; season: string };
  purchase_completed: {
    plan: string;
    season: string;
    amountMxn: number | null;
    method: string;
    isEarlyBird: boolean;
  };

  // ── Retención ──
  streak_milestone: { days: number };
  badge_earned: { badgeType: 'MATERIA_DOMINADA' | 'EARLY_BIRD' };
}

export type AnalyticsEventName = keyof AnalyticsEvents;
