import { describe, expect, it } from 'vitest';
import {
  isSuspiciousKeyCombo,
  mergeIntegrityCounters,
  type KeyEventLike,
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
