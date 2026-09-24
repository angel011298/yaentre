import { describe, expect, it } from 'vitest';
import {
  canAccessParentDashboard,
  canAnswerDrillQuestion,
  canStartFullSimulation,
  canViewExplanationLayer,
  drillQuestionsRemainingToday,
  FREE_DRILL_DAILY_LIMIT,
  FREE_FULL_SIMULATION_LIMIT,
  FREE_HALF_SIMULATION_QUESTION_COUNT,
  simulationQuestionTarget,
  simulationTimeLimitSecs,
} from '@/lib/paywall/gates';

describe('canStartFullSimulation — 1 simulacro completo gratis', () => {
  it('primer simulacro (0 completados) se permite', () => {
    expect(canStartFullSimulation({ isPaid: false, completedCount: 0 })).toEqual({ allowed: true });
  });

  it('segundo intento (1 ya completado) dispara el paywall', () => {
    expect(canStartFullSimulation({ isPaid: false, completedCount: 1 })).toEqual({
      allowed: false,
      trigger: 'FULL_SIMULATION_LIMIT',
    });
  });

  it('más de 1 completado sigue bloqueado (no se "recupera" el gratis)', () => {
    expect(canStartFullSimulation({ isPaid: false, completedCount: 5 }).allowed).toBe(false);
  });

  it('un usuario con plan pagado nunca choca el muro, sin importar el conteo', () => {
    expect(canStartFullSimulation({ isPaid: true, completedCount: 0 })).toEqual({ allowed: true });
    expect(canStartFullSimulation({ isPaid: true, completedCount: 99 })).toEqual({ allowed: true });
  });

  it('el límite gratuito documentado es exactamente 1', () => {
    expect(FREE_FULL_SIMULATION_LIMIT).toBe(1);
  });
});

describe('canAnswerDrillQuestion / drillQuestionsRemainingToday — 10/día', () => {
  it('permite responder hasta el 10º reactivo del día', () => {
    for (let answered = 0; answered < 10; answered++) {
      expect(canAnswerDrillQuestion({ isPaid: false, answeredToday: answered })).toEqual({
        allowed: true,
      });
    }
  });

  it('el 11º intento (10 ya respondidos) dispara el paywall', () => {
    expect(canAnswerDrillQuestion({ isPaid: false, answeredToday: 10 })).toEqual({
      allowed: false,
      trigger: 'DRILL_DAILY_LIMIT',
    });
  });

  it('drillQuestionsRemainingToday cuenta correctamente hacia 0, nunca negativo', () => {
    expect(drillQuestionsRemainingToday({ isPaid: false, answeredToday: 0 })).toBe(10);
    expect(drillQuestionsRemainingToday({ isPaid: false, answeredToday: 7 })).toBe(3);
    expect(drillQuestionsRemainingToday({ isPaid: false, answeredToday: 10 })).toBe(0);
    expect(drillQuestionsRemainingToday({ isPaid: false, answeredToday: 15 })).toBe(0);
  });

  it('un plan pagado no tiene límite diario (null = ilimitado)', () => {
    expect(canAnswerDrillQuestion({ isPaid: true, answeredToday: 999 })).toEqual({ allowed: true });
    expect(drillQuestionsRemainingToday({ isPaid: true, answeredToday: 999 })).toBeNull();
  });

  it('el límite gratuito documentado es exactamente 10', () => {
    expect(FREE_DRILL_DAILY_LIMIT).toBe(10);
  });
});

describe('simulationQuestionTarget / simulationTimeLimitSecs — medio simulacro Free (Bloque 1)', () => {
  it('el medio simulacro documentado es exactamente 60 reactivos', () => {
    expect(FREE_HALF_SIMULATION_QUESTION_COUNT).toBe(60);
  });

  it('Free sirve 60 reactivos; pagado sirve el total oficial (UNAM 120, IPN 140)', () => {
    expect(simulationQuestionTarget({ isPaid: false, officialTotal: 120 })).toBe(60);
    expect(simulationQuestionTarget({ isPaid: false, officialTotal: 140 })).toBe(60);
    expect(simulationQuestionTarget({ isPaid: true, officialTotal: 120 })).toBe(120);
    expect(simulationQuestionTarget({ isPaid: true, officialTotal: 140 })).toBe(140);
  });

  it('si el examen oficial tuviera menos de 60, no se inventan reactivos', () => {
    expect(simulationQuestionTarget({ isPaid: false, officialTotal: 40 })).toBe(40);
  });

  it('el tiempo Free es proporcional a los reactivos servidos; el pagado es completo', () => {
    // UNAM: 120 reactivos / 180 min → medio = 60 reactivos / 90 min.
    expect(
      simulationTimeLimitSecs({
        isPaid: false,
        officialTotal: 120,
        officialDurationMins: 180,
        servedTarget: 60,
      })
    ).toBe(90 * 60);
    expect(
      simulationTimeLimitSecs({
        isPaid: true,
        officialTotal: 120,
        officialDurationMins: 180,
        servedTarget: 120,
      })
    ).toBe(180 * 60);
  });

  it('nunca divide entre cero si el total oficial fuera 0', () => {
    expect(
      simulationTimeLimitSecs({
        isPaid: false,
        officialTotal: 0,
        officialDurationMins: 180,
        servedTarget: 0,
      })
    ).toBe(180 * 60);
  });
});

describe('canViewExplanationLayer — Capa 1 siempre gratis, 2+ requiere plan', () => {
  it('Capa 1 siempre se permite, con o sin plan', () => {
    expect(canViewExplanationLayer({ isPaid: false, layer: 1 })).toEqual({ allowed: true });
    expect(canViewExplanationLayer({ isPaid: true, layer: 1 })).toEqual({ allowed: true });
  });

  it('Capa 2, 3 y 4 requieren plan pagado', () => {
    for (const layer of [2, 3, 4]) {
      expect(canViewExplanationLayer({ isPaid: false, layer })).toEqual({
        allowed: false,
        trigger: 'EXPLANATION_LAYER',
      });
      expect(canViewExplanationLayer({ isPaid: true, layer })).toEqual({ allowed: true });
    }
  });
});

describe('canAccessParentDashboard — requiere Pase o Premium (Mensual NO alcanza)', () => {
  it('Pase de Temporada y Premium activos desbloquean el panel', () => {
    expect(canAccessParentDashboard({ plan: 'SEASON_PASS', isActive: true })).toEqual({
      allowed: true,
    });
    expect(canAccessParentDashboard({ plan: 'PREMIUM', isActive: true })).toEqual({ allowed: true });
  });

  it('Mensual activo NO desbloquea el panel parental', () => {
    expect(canAccessParentDashboard({ plan: 'MONTHLY', isActive: true })).toEqual({
      allowed: false,
      trigger: 'PARENT_DASHBOARD',
    });
  });

  it('sin plan activo, bloqueado sin importar el plan guardado', () => {
    expect(canAccessParentDashboard({ plan: 'PREMIUM', isActive: false })).toEqual({
      allowed: false,
      trigger: 'PARENT_DASHBOARD',
    });
    expect(canAccessParentDashboard({ plan: null, isActive: false })).toEqual({
      allowed: false,
      trigger: 'PARENT_DASHBOARD',
    });
  });
});
