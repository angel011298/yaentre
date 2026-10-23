import type { ChiloPose } from '@/lib/brand/chilo-geometry';
import type { PaywallTrigger } from '@/lib/paywall/gates';

/**
 * Diccionario centralizado de la voz de la mascota (F15 tarea 4). TODO texto
 * que "dice" Chilo en la app vive aquí — no repartido por el código — para que
 * la personalidad se mantenga consistente sin copiar/pegar frases entre
 * componentes. Personalidad (UIUX §2.1): motivador, cercano, español
 * mexicano, NUNCA regaña ni usa culpa. Cada entrada trae la `pose` de Chilo
 * que le corresponde, para que quien la use no tenga que adivinar.
 *
 * Marca v1.0 (G102, docs/marca §Tono de voz): de tú, frases cortas, reconoce
 * el avance CONCRETO y, ante un error, dice qué sigue. La mascota dice como
 * mucho UNA frase por pantalla, así que cada línea es una sola oración y sin
 * signos de exclamación en cadena. Poses: `libro` (base), `bolsa` (espera),
 * `lapiz` (acierto), `error`, `dormido` (taza: pausa), `pensando` (lupa),
 * `reloj` (simulacro), `celebrar`, `probeta` (contenido en preparación).
 * Hasta G101 la mascota era Tino; `components/mascot/Tino.tsx` queda solo
 * como envoltorio de compatibilidad.
 *
 * Copy EXACTO tomado de UIUX Spec §10 donde existe una tabla explícita; el
 * resto sigue el mismo tono, migrado desde donde vivía disperso antes de
 * esta fase (ver ESTADO.md F15 para el mapa completo de migraciones).
 */

export interface ChiloLine {
  pose: ChiloPose;
  message: string;
}

// ─────────────────────────────── Estados vacíos ───────────────────────────────

export function emptySimulations(): ChiloLine {
  return { pose: 'reloj', message: 'El primer simulacro es el que más te enseña.' };
}

export function noWeakTopicsYet(): ChiloLine {
  return {
    pose: 'pensando',
    message: 'Sigue practicando y aquí van a aparecer los temas donde más te conviene enfocarte.',
  };
}

export function noTargetChosen(context: 'practicar' | 'simulacro'): ChiloLine {
  return {
    pose: 'bolsa',
    message:
      context === 'practicar'
        ? 'Para practicar necesitamos saber a qué examen y carrera apuntas.'
        : 'Para hacer un simulacro necesitamos saber a qué examen y carrera apuntas.',
  };
}

export function diagnosticNotReady(code: 'NO_TARGET' | 'NO_CONTENT' | 'RATE_LIMIT'): ChiloLine {
  if (code === 'RATE_LIMIT') {
    return {
      pose: 'dormido',
      message: 'Fueron muchos intentos seguidos: espera unos minutos y vuelve a intentar.',
    };
  }
  return code === 'NO_TARGET'
    ? {
        pose: 'bolsa',
        message: 'Necesitamos que termines de elegir tu examen y carrera antes de empezar.',
      }
    : {
        pose: 'probeta',
        message:
          'Aún nos faltan reactivos verificados para tu área; estamos preparando más, vuelve pronto.',
      };
}

// ─────────────────────────────── Racha ───────────────────────────────

export function streakAtRisk(days: number): ChiloLine {
  return {
    pose: 'dormido',
    message: `Tu racha de ${days} ${days === 1 ? 'día' : 'días'} está en riesgo: con unos minutos hoy la salvas.`,
  };
}

const STREAK_MILESTONE_MESSAGE: Record<7 | 14 | 30, string> = {
  7: 'Llevas 7 días seguidos: una semana completa.',
  14: 'Llevas 14 días seguidos: esto ya es un hábito.',
  30: 'Llevas 30 días seguidos: un mes entero de racha.',
};

export function streakMilestone(days: 7 | 14 | 30): ChiloLine {
  return { pose: 'celebrar', message: STREAK_MILESTONE_MESSAGE[days] };
}

// ─────────────────────────────── Después de responder ───────────────────────────────

export function afterMistake(): ChiloLine {
  return { pose: 'error', message: 'Esa estuvo difícil: la vamos a repasar más adelante.' };
}

// ─────────────────────────────── Celebraciones ───────────────────────────────

export function perfectRound(): ChiloLine {
  return { pose: 'celebrar', message: 'Ronda perfecta: no fallaste ni una.' };
}

export function materiaDominada(subjectName: string): ChiloLine {
  return {
    pose: 'celebrar',
    message: `Dominaste ${subjectName}: una materia menos, vamos por la siguiente.`,
  };
}

// ─────────────────────────────── Paywall ───────────────────────────────

export function paywallInvite(): ChiloLine {
  return {
    pose: 'libro',
    message: 'Desbloquea simulacros ilimitados y el examen completo.',
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

export function predictionUp(delta: number): ChiloLine {
  return {
    pose: 'lapiz',
    message: `Tu predicción subió ${delta} ${delta === 1 ? 'acierto' : 'aciertos'} esta semana`,
  };
}

// ─────────────────────────────── Diagnóstico ───────────────────────────────

export function diagnosticResult(input: { hasTarget: boolean; onTrack: boolean }): ChiloLine {
  if (!input.hasTarget) {
    return {
      pose: 'libro',
      message: 'Terminaste tu diagnóstico y ya sé por dónde empezar a ayudarte.',
    };
  }
  if (input.onTrack) {
    return {
      pose: 'celebrar',
      message: 'Vas bien encaminado a tu meta; sigamos afinando los temas que te faltan.',
    };
  }
  return {
    pose: 'libro',
    message: 'Este es tu punto de partida: empecemos por tus temas más débiles.',
  };
}

// ─────────────────────────────── Simulador (solo antes/después, NUNCA durante) ───────────────────────────────

export function simulatorFreeWelcome(): ChiloLine {
  return {
    pose: 'reloj',
    message:
      'Este primer simulacro va por mi cuenta: vívelo como el examen real, sin pausas ni regresar.',
  };
}

export function simulatorResult(input: {
  timedOut: boolean;
  perfectRound: boolean;
  fraction: number;
}): ChiloLine {
  if (input.timedOut) {
    return {
      pose: 'reloj',
      message: 'Se agotó el tiempo y guardamos todo lo que respondiste, igual que en el examen real.',
    };
  }
  if (input.perfectRound) return perfectRound();
  if (input.fraction >= 0.6) {
    return { pose: 'lapiz', message: 'Buen trabajo: sigamos afinando los temas que te faltan.' };
  }
  return {
    pose: 'libro',
    message: 'Este es tu punto de partida: vamos por tus temas más débiles.',
  };
}

// ─────────────────────────────── Drill ───────────────────────────────

export function drillLimitReached(): ChiloLine {
  return { pose: 'bolsa', message: 'Vuelve mañana o desbloquea la práctica ilimitada.' };
}

export function drillSummary(fraction: number): ChiloLine {
  return fraction >= 0.7
    ? { pose: 'lapiz', message: 'Buena práctica: se nota que le vas entendiendo.' }
    : { pose: 'libro', message: 'Ya actualizamos tus temas débiles y tu racha del día.' };
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
export function areaComingSoon(pendingSubjectNames: readonly string[]): ChiloLine {
  const list = joinSubjectNames(pendingSubjectNames);
  return {
    pose: 'probeta',
    message: list
      ? `Todavía nos faltan los reactivos de ${list}, y prefiero decírtelo ahora que dejarte a medias en tu diagnóstico.`
      : 'Todavía estamos armando esta rama, y prefiero decírtelo ahora que dejarte a medias en tu diagnóstico.',
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
export function areaWaitlistJoined(areaName: string): ChiloLine {
  return {
    pose: 'celebrar',
    message: `Listo: te escribimos en cuanto ${areaName} esté completa.`,
  };
}

/** Materia sin reactivos suficientes en la pantalla de práctica (caso que lo
 *  motivó: Inglés UNAM, en cero hasta G75/G76). */
export function subjectNotReady(subjectName: string): ChiloLine {
  return {
    pose: 'probeta',
    message: `Todavía no tengo reactivos de ${subjectName}; mientras, tu práctica se arma con las materias que ya están listas.`,
  };
}
