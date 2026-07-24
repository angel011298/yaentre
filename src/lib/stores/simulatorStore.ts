'use client';

import { create } from 'zustand';
import type { RunnerQuestion } from '@/lib/db/diagnostic';
import type { SimulatorPayload } from '@/lib/db/simulator';
import {
  EMPTY_INTEGRITY,
  type IntegrityCounters,
  type SuspicionInfoEvent,
} from '@/lib/simulator/integrity';

/**
 * Store del simulador (F12). ÚNICO uso de Zustand en todo el proyecto
 * (CLAUDE.md): el resto de la app es RSC + useState. Aquí se justifica porque
 * el simulacro necesita estado de sesión con una COLA LOCAL de respuestas para
 * la resiliencia offline — el flujo/beacon lo lee y lo drena desde varios
 * lugares (efectos del runner, listeners de red, `beforeunload`).
 *
 * Regla de negocio codificada aquí: NO SE PUEDE REGRESAR. `advance()` solo
 * incrementa el índice; no existe ninguna acción que lo decremente.
 */

export interface PendingAnswer {
  questionId: string;
  selectedOption: string | null;
  position: number;
  timeSpentSecs: number;
}

interface SimulatorStore {
  sessionId: string;
  questions: RunnerQuestion[];
  currentIndex: number;
  selections: Array<string | null>;
  integrity: IntegrityCounters;
  suspicionEvents: SuspicionInfoEvent[];
  completedFullscreen: boolean;
  /** Respuestas aún no confirmadas como sincronizadas, indexadas por posición. */
  pending: Record<number, PendingAnswer>;
  online: boolean;

  hydrate: (payload: SimulatorPayload) => void;

  /** Registra la opción elegida para el reactivo actual y la encola para sincronizar. */
  answer: (optionId: string, timeSpentSecs: number) => void;
  /** Avanza al siguiente reactivo. NUNCA retrocede (regla del simulador). */
  advance: () => void;

  bumpTabBlur: () => void;
  bumpRightClick: () => void;
  bumpKeyboard: () => void;
  addSuspicion: (event: SuspicionInfoEvent) => void;
  setFullscreen: (active: boolean) => void;
  setOnline: (online: boolean) => void;

  /** Snapshot del cuerpo de sincronización actual (respuestas pendientes + señales). */
  syncSnapshot: () => {
    sessionId: string;
    answers: PendingAnswer[];
    integrity: IntegrityCounters;
    suspicionEvents: SuspicionInfoEvent[];
    completedFullscreen: boolean;
  };
  /** Quita de la cola las respuestas ya confirmadas (si no cambiaron mientras tanto). */
  confirmSynced: (sent: PendingAnswer[]) => void;
}

export const useSimulatorStore = create<SimulatorStore>((set, get) => ({
  sessionId: '',
  questions: [],
  currentIndex: 0,
  selections: [],
  integrity: EMPTY_INTEGRITY,
  suspicionEvents: [],
  completedFullscreen: false,
  pending: {},
  online: true,

  hydrate: (payload) => {
    // Retoma en el primer reactivo sin responder (o al inicio si todos están).
    const firstUnanswered = payload.initialSelections.findIndex((s) => s === null);
    set({
      sessionId: payload.sessionId,
      questions: payload.questions,
      currentIndex: firstUnanswered === -1 ? 0 : firstUnanswered,
      selections: [...payload.initialSelections],
      integrity: payload.integrity,
      suspicionEvents: payload.suspicionEvents,
      completedFullscreen: payload.completedFullscreen,
      pending: {},
      online: typeof navigator === 'undefined' ? true : navigator.onLine,
    });
  },

  answer: (optionId, timeSpentSecs) => {
    const { currentIndex, questions } = get();
    const question = questions[currentIndex];
    if (!question) return;
    set((state) => ({
      selections: state.selections.map((s, i) => (i === currentIndex ? optionId : s)),
      pending: {
        ...state.pending,
        [currentIndex]: {
          questionId: question.id,
          selectedOption: optionId,
          position: currentIndex,
          timeSpentSecs,
        },
      },
    }));
  },

  advance: () =>
    set((state) => ({
      currentIndex: Math.min(state.currentIndex + 1, state.questions.length - 1),
    })),

  bumpTabBlur: () =>
    set((state) => ({ integrity: { ...state.integrity, tabBlurCount: state.integrity.tabBlurCount + 1 } })),
  bumpRightClick: () =>
    set((state) => ({
      integrity: { ...state.integrity, rightClickAttempts: state.integrity.rightClickAttempts + 1 },
    })),
  bumpKeyboard: () =>
    set((state) => ({
      integrity: {
        ...state.integrity,
        keyboardShortcutAttempts: state.integrity.keyboardShortcutAttempts + 1,
      },
    })),

  addSuspicion: (event) => set((state) => ({ suspicionEvents: [...state.suspicionEvents, event] })),
  setFullscreen: (active) =>
    set((state) => ({ completedFullscreen: state.completedFullscreen || active })),
  setOnline: (online) => set({ online }),

  syncSnapshot: () => {
    const { sessionId, pending, integrity, suspicionEvents, completedFullscreen } = get();
    return {
      sessionId,
      answers: Object.values(pending),
      integrity,
      suspicionEvents,
      completedFullscreen,
    };
  },

  confirmSynced: (sent) =>
    set((state) => {
      const next = { ...state.pending };
      for (const answer of sent) {
        const current = next[answer.position];
        // Solo se retira si no cambió entre el envío y la confirmación.
        if (current && current.selectedOption === answer.selectedOption) {
          delete next[answer.position];
        }
      }
      return { pending: next };
    }),
}));
