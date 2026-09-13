import type { TinoState } from '@/components/mascot/Tino';
import type { PaywallTrigger } from '@/lib/paywall/gates';

/**
 * Diccionario centralizado de la voz de Tino (F15 tarea 4). TODO texto que
 * "dice" Tino en la app vive aquí — no repartido por el código — para que la
 * personalidad se mantenga consistente sin copiar/pegar frases entre
 * componentes. Personalidad (UIUX §2.1): motivador, cercano, español
 * mexicano, NUNCA regaña ni usa culpa. Cada entrada trae el `state` de Tino
 * que le corresponde, para que quien la use no tenga que adivinar la
 * expresión correcta.
 *
 * Copy EXACTO tomado de UIUX Spec §10 donde existe una tabla explícita; el
 * resto sigue el mismo tono, migrado desde donde vivía disperso antes de
 * esta fase (ver ESTADO.md F15 para el mapa completo de migraciones).
 */

export interface TinoLine {
  state: TinoState;
  message: string;
}

// ─────────────────────────────── Estados vacíos ───────────────────────────────

export function emptySimulations(): TinoLine {
  return { state: 'encouraging', message: '¡El primero es el más importante! 🦉' };
}

export function noWeakTopicsYet(): TinoLine {
  return {
    state: 'encouraging',
    message: 'Sigue practicando y aquí van a aparecer los temas donde más te conviene enfocarte.',
  };
}

export function noTargetChosen(context: 'practicar' | 'simulacro'): TinoLine {
  return {
    state: 'sleepy',
    message:
      context === 'practicar'
        ? 'Para practicar necesitamos saber a qué examen y carrera apuntas.'
        : 'Para hacer un simulacro necesitamos saber a qué examen y carrera apuntas.',
  };
}

export function diagnosticNotReady(code: 'NO_TARGET' | 'NO_CONTENT' | 'RATE_LIMIT'): TinoLine {
  if (code === 'RATE_LIMIT') {
    return {
      state: 'sleepy',
      message: 'Demasiados intentos seguidos. Espera unos minutos y vuelve a intentar.',
    };
  }
  return {
    state: 'sleepy',
    message:
      code === 'NO_TARGET'
        ? 'Necesitamos que termines de elegir tu examen y carrera antes de empezar.'
        : 'Aún no tenemos suficientes reactivos verificados para tu área. Estamos generando más contenido — vuelve pronto.',
  };
}

// ─────────────────────────────── Racha ───────────────────────────────

export function streakAtRisk(days: number): TinoLine {
  return {
    state: 'sleepy',
    message: `Tu racha de ${days} ${days === 1 ? 'día' : 'días'} está en riesgo. ¿Unos minutos hoy? 🔥`,
  };
}

const STREAK_MILESTONE_MESSAGE: Record<7 | 14 | 30, string> = {
  7: '¡Una semana completa! 7 días seguidos, no pares. 🔥',
  14: '¡14 días seguidos! Ya es un hábito de verdad. 🔥',
  30: '¡30 días! Un mes entero de racha — vas increíble. 🔥',
};

export function streakMilestone(days: 7 | 14 | 30): TinoLine {
  return { state: 'streak', message: STREAK_MILESTONE_MESSAGE[days] };
}

// ─────────────────────────────── Después de responder ───────────────────────────────

export function afterMistake(): TinoLine {
  return { state: 'encouraging', message: 'Uy, esa estuvo difícil. La volvemos a ver más adelante. 💪' };
}

// ─────────────────────────────── Celebraciones ───────────────────────────────

export function perfectRound(): TinoLine {
  return { state: 'celebrating', message: '¡Ronda perfecta! Vas imparable. 🎉' };
}

export function materiaDominada(subjectName: string): TinoLine {
  return {
    state: 'celebrating',
    message: `¡Dominaste ${subjectName}! Una menos, vamos por la siguiente. 🎓`,
  };
}

// ─────────────────────────────── Paywall ───────────────────────────────

export function paywallInvite(): TinoLine {
  return {
    state: 'encouraging',
    message: 'Desbloquea simulacros ilimitados y el examen completo. Tino te acompaña. 🦉',
  };
}

export interface PaywallCopy {
  title: string;
  body: string;
}

/** Copy específico por gate (F9) — centralizado aquí para que PaywallScreen
 *  no mantenga su propio diccionario paralelo. */
const PAYWALL_TRIGGER_COPY: Record<PaywallTrigger, PaywallCopy> = {
  FULL_SIMULATION_LIMIT: {
    title: 'Ya viviste tu primer simulacro',
    body: 'Desbloquea los simulacros completos ilimitados para seguir practicando bajo condiciones reales.',
  },
  DRILL_DAILY_LIMIT: {
    title: 'Llegaste a tu práctica de hoy',
    body: 'Vuelve mañana con tu racha, o desbloquea reactivos ilimitados ahora mismo.',
  },
  EXPLANATION_LAYER: {
    title: 'Desbloquea el paso a paso',
    body: 'La Capa 1 siempre es gratis. El paso a paso, el concepto base y la práctica similar viven en los planes de pago.',
  },
  PARENT_DASHBOARD: {
    title: 'El panel parental es para Pase o Premium',
    body: 'Con el Pase de Temporada o Premium, ve el progreso de tu hijo desde tu propio dispositivo.',
  },
};

const PAYWALL_DEFAULT_COPY: PaywallCopy = {
  title: 'Desbloquea todo YaEntre',
  body: 'Simulacros ilimitados, resolución por capas y tu Entrómetro completo.',
};

export function paywallTriggerCopy(trigger: PaywallTrigger | null): PaywallCopy {
  return trigger ? PAYWALL_TRIGGER_COPY[trigger] : PAYWALL_DEFAULT_COPY;
}

// ─────────────────────────────── Entrómetro ───────────────────────────────

export function predictionUp(delta: number): TinoLine {
  return {
    state: 'celebrating',
    message: `Tu predicción subió ${delta} ${delta === 1 ? 'acierto' : 'aciertos'} esta semana 🚀`,
  };
}

// ─────────────────────────────── Diagnóstico ───────────────────────────────

export function diagnosticResult(input: { hasTarget: boolean; onTrack: boolean }): TinoLine {
  if (!input.hasTarget) {
    return {
      state: 'encouraging',
      message: '¡Terminaste tu diagnóstico! Ya sé por dónde empezar a ayudarte a mejorar.',
    };
  }
  if (input.onTrack) {
    return {
      state: 'celebrating',
      message: '¡Vas muy bien encaminado hacia tu meta! Sigamos afinando los temas que te faltan.',
    };
  }
  return {
    state: 'encouraging',
    message: 'Este es tu punto de partida, no tu límite. Empecemos por tus temas más débiles.',
  };
}

// ─────────────────────────────── Simulador (solo antes/después, NUNCA durante) ───────────────────────────────

export function simulatorFreeWelcome(): TinoLine {
  return {
    state: 'encouraging',
    message:
      'Este primer simulacro va por mi cuenta. Vívelo como el examen real: sin pausas, sin regresar. Así llegas sin sorpresas el día que cuenta. 🦉',
  };
}

export function simulatorResult(input: {
  timedOut: boolean;
  perfectRound: boolean;
  fraction: number;
}): TinoLine {
  if (input.timedOut) {
    return {
      state: 'encouraging',
      message: 'Se agotó el tiempo — guardamos todo lo que respondiste. Así es el examen real.',
    };
  }
  if (input.perfectRound) return perfectRound();
  if (input.fraction >= 0.6) {
    return { state: 'attentive', message: 'Buen trabajo. Sigamos afinando los temas que te faltan.' };
  }
  return {
    state: 'encouraging',
    message: 'Este es tu punto de partida, no tu límite. Vamos por tus temas más débiles.',
  };
}

// ─────────────────────────────── Drill ───────────────────────────────

export function drillLimitReached(): TinoLine {
  return { state: 'encouraging', message: 'Vuelve mañana o desbloquea ilimitado' };
}

export function drillSummary(fraction: number): TinoLine {
  return fraction >= 0.7
    ? { state: 'celebrating', message: '¡Buena práctica! Se nota que le sigues entendiendo. 🎉' }
    : { state: 'encouraging', message: 'Ya actualizamos tus temas débiles y tu racha del día. 🔥' };
}

// ──────────────────── Cobertura de contenido (G74) ────────────────────

/**
 * Lista en español natural: «A», «A y B», «A, B y C». Se usa para nombrar las
 * materias que faltan — decirlas por su nombre es la diferencia entre un aviso
 * honesto y un «no disponible» que no explica nada.
 */
export function joinSubjectNames(names: readonly string[]): string {
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`;
}

/**
 * Área que todavía no se puede ofrecer. Tres reglas de esta línea:
 * dice el MOTIVO concreto (qué materias faltan), no culpa al alumno ni se
 * disculpa de más, y promete algo que sí se puede cumplir.
 */
export function areaComingSoon(pendingSubjectNames: readonly string[]): TinoLine {
  const list = joinSubjectNames(pendingSubjectNames);
  return {
    state: 'sleepy',
    message: list
      ? `Todavía nos faltan los reactivos de ${list}. Prefiero decírtelo ahora y no dejarte a medias en tu diagnóstico.`
      : 'Todavía estamos armando el contenido de esta rama. Prefiero decírtelo ahora y no dejarte a medias en tu diagnóstico.',
  };
}

/** Área utilizable con un hueco conocido: se puede empezar hoy, y se dice cuál falta. */
export function areaPartialCoverage(pendingSubjectNames: readonly string[]): string {
  const list = joinSubjectNames(pendingSubjectNames);
  return list
    ? `Ya puedes empezar. Solo ${list} sigue en camino — el resto de tus materias está completo.`
    : 'Ya puedes empezar con esta área.';
}

/** Confirmación de «avísame»: concreta, sin pedir nada más. */
export function areaWaitlistJoined(areaName: string): TinoLine {
  return {
    state: 'celebrating',
    message: `¡Listo! Te escribimos a tu correo en cuanto ${areaName} esté completa. 🦉`,
  };
}

/** Materia sin reactivos suficientes en la pantalla de práctica (caso que lo
 *  motivó: Inglés UNAM, en cero hasta G75/G76). */
export function subjectNotReady(subjectName: string): TinoLine {
  return {
    state: 'sleepy',
    message: `Todavía no tengo reactivos de ${subjectName} — estamos en eso. Mientras tanto, tu práctica adaptativa se arma con las materias que ya están listas.`,
  };
}
