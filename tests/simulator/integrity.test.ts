import { describe, expect, it } from 'vitest';
import {
  EMPTY_INTEGRITY,
  integrityNeedsWrite,
  isSuspiciousKeyCombo,
  mergeIntegrityCounters,
  summarizeIntegrityEvents,
  type IntegrityCounters,
  type KeyEventLike,
  type SuspicionInfoEvent,
} from '@/lib/simulator/integrity';

function key(partial: Partial<KeyEventLike>): KeyEventLike {
  return { key: '', ctrlKey: false, metaKey: false, shiftKey: false, ...partial };
}

describe('mergeIntegrityCounters', () => {
  it('toma el máximo por campo (monotónico, idempotente ante sincs fuera de orden)', () => {
    const a = { tabBlurCount: 3, rightClickAttempts: 1, keyboardShortcutAttempts: 5 };
    const b = { tabBlurCount: 2, rightClickAttempts: 4, keyboardShortcutAttempts: 5 };
    expect(mergeIntegrityCounters(a, b)).toEqual({
      tabBlurCount: 3,
      rightClickAttempts: 4,
      keyboardShortcutAttempts: 5,
    });
  });
});

describe('isSuspiciousKeyCombo', () => {
  it('detecta copiar/pegar/cortar/guardar/imprimir con Ctrl y con Cmd', () => {
    for (const k of ['c', 'v', 'x', 's', 'p', 'u', 'a']) {
      expect(isSuspiciousKeyCombo(key({ key: k, ctrlKey: true }))).toBe(true);
      expect(isSuspiciousKeyCombo(key({ key: k, metaKey: true }))).toBe(true);
    }
  });

  it('detecta atajos de herramientas de desarrollador (Ctrl/Cmd+Shift+I/J/C y F12)', () => {
    expect(isSuspiciousKeyCombo(key({ key: 'i', ctrlKey: true, shiftKey: true }))).toBe(true);
    expect(isSuspiciousKeyCombo(key({ key: 'j', metaKey: true, shiftKey: true }))).toBe(true);
    expect(isSuspiciousKeyCombo(key({ key: 'F12' }))).toBe(true);
    expect(isSuspiciousKeyCombo(key({ key: 'PrintScreen' }))).toBe(true);
  });

  it('no marca teclas normales de escritura ni de navegación', () => {
    expect(isSuspiciousKeyCombo(key({ key: 'a' }))).toBe(false);
    expect(isSuspiciousKeyCombo(key({ key: 'Enter' }))).toBe(false);
    expect(isSuspiciousKeyCombo(key({ key: 'ArrowDown' }))).toBe(false);
  });
});

describe('summarizeIntegrityEvents', () => {
  it('arreglo vacío cuando todo está en orden (todos los contadores en 0)', () => {
    expect(summarizeIntegrityEvents(EMPTY_INTEGRITY, [])).toEqual([]);
  });

  it('omite los tipos con conteo 0, incluye solo los que ocurrieron', () => {
    const counters: IntegrityCounters = {
      tabBlurCount: 2,
      rightClickAttempts: 0,
      keyboardShortcutAttempts: 1,
    };
    const result = summarizeIntegrityEvents(counters, []);
    expect(result.map((r) => r.key)).toEqual(['tabBlur', 'keyboard']);
    expect(result.find((r) => r.key === 'tabBlur')?.count).toBe(2);
  });

  it('cuenta las salidas de fullscreen desde suspicionEvents (no desde IntegrityCounters)', () => {
    const events: SuspicionInfoEvent[] = [
      { type: 'FULLSCREEN_EXIT', at: '2027-01-01T00:00:00Z' },
      { type: 'FULLSCREEN_EXIT', at: '2027-01-01T00:05:00Z' },
      { type: 'CAMERA_DENIED', at: '2027-01-01T00:00:00Z' }, // no es señal de integridad
    ];
    const result = summarizeIntegrityEvents(EMPTY_INTEGRITY, events);
    expect(result).toEqual([{ key: 'fullscreenExit', label: 'Salidas de pantalla completa', count: 2 }]);
  });

  it('cada label es un texto no vacío (para copy sobria en la UI)', () => {
    const counters: IntegrityCounters = {
      tabBlurCount: 1,
      rightClickAttempts: 1,
      keyboardShortcutAttempts: 1,
    };
    const result = summarizeIntegrityEvents(counters, [{ type: 'FULLSCREEN_EXIT', at: 'x' }]);
    expect(result).toHaveLength(4);
    for (const item of result) {
      expect(item.label.length).toBeGreaterThan(0);
    }
  });
});

describe('integrityNeedsWrite (G69)', () => {
  const stored = {
    tabBlurCount: 2,
    rightClickAttempts: 0,
    keyboardShortcutAttempts: 1,
    completedFullscreen: true,
    suspicionEvents: [{ type: 'TAB_BLUR', at: '2026-09-02T10:00:00.000Z' }],
  };
  const sameCounters: IntegrityCounters = {
    tabBlurCount: 2,
    rightClickAttempts: 0,
    keyboardShortcutAttempts: 1,
  };

  it('no escribe cuando el lote no trae nada nuevo (el caso normal)', () => {
    // Es el 99% de los lotes de un simulacro sin trampas: el alumno solo
    // contestó. Saltarse este UPDATE es el ahorro de la fase.
    expect(
      integrityNeedsWrite(stored, sameCounters, true, [
        { type: 'TAB_BLUR', at: '2026-09-02T10:00:00.000Z' },
      ])
    ).toBe(false);
  });

  it('escribe si sube cualquiera de los tres contadores', () => {
    expect(
      integrityNeedsWrite(stored, { ...sameCounters, tabBlurCount: 3 }, true, stored.suspicionEvents)
    ).toBe(true);
    expect(
      integrityNeedsWrite(
        stored,
        { ...sameCounters, rightClickAttempts: 1 },
        true,
        stored.suspicionEvents
      )
    ).toBe(true);
    expect(
      integrityNeedsWrite(
        stored,
        { ...sameCounters, keyboardShortcutAttempts: 2 },
        true,
        stored.suspicionEvents
      )
    ).toBe(true);
  });

  it('escribe si cambia completedFullscreen', () => {
    expect(integrityNeedsWrite(stored, sameCounters, false, stored.suspicionEvents)).toBe(true);
  });

  it('escribe si llega un evento sospechoso nuevo', () => {
    expect(
      integrityNeedsWrite(stored, sameCounters, true, [
        ...stored.suspicionEvents,
        { type: 'RIGHT_CLICK', at: '2026-09-02T10:05:00.000Z' },
      ])
    ).toBe(true);
  });

  it('trata el JSON nulo guardado como lista vacía', () => {
    const virgen = {
      tabBlurCount: 0,
      rightClickAttempts: 0,
      keyboardShortcutAttempts: 0,
      completedFullscreen: false,
      suspicionEvents: null,
    };
    const cero: IntegrityCounters = {
      tabBlurCount: 0,
      rightClickAttempts: 0,
      keyboardShortcutAttempts: 0,
    };
    // Sesión recién creada + primer lote sin nada raro: no hay que escribir.
    expect(integrityNeedsWrite(virgen, cero, false, [])).toBe(false);
    // Pero el primer evento sospechoso sí se persiste.
    expect(
      integrityNeedsWrite(virgen, cero, false, [{ type: 'TAB_BLUR', at: 'x' }])
    ).toBe(true);
  });
});
