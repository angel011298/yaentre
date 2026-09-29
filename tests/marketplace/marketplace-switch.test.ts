import { describe, expect, it } from 'vitest';
import {
  MARKETPLACE_CLOSED_MESSAGE,
  evaluateMarketplaceGate,
} from '@/lib/marketplace/marketplace-switch';

/**
 * Bloque 2 — el interruptor del marketplace. El default es CERRADO: la única
 * forma de abrirlo es `MARKETPLACE_OPEN === 'true'`, exactamente. Se enumeran
 * los valores «parecidos a verdadero» que NO deben abrirlo, porque son los que
 * un humano escribe en el panel de Vercel sin darse cuenta.
 */
describe('evaluateMarketplaceGate', () => {
  it("abre SOLO con el literal 'true'", () => {
    expect(evaluateMarketplaceGate({ marketplaceOpen: 'true' })).toEqual({ open: true });
  });

  it.each([
    ['ausente', undefined],
    ['vacía', ''],
    ['false', 'false'],
    ['mayúsculas', 'TRUE'],
    ['capitalizada', 'True'],
    ['1', '1'],
    ['yes', 'yes'],
    ['con espacios', ' true '],
    ['on', 'on'],
  ])('%s ⇒ CERRADO', (_name, value) => {
    expect(evaluateMarketplaceGate({ marketplaceOpen: value })).toEqual({
      open: false,
      reason: 'flag_off',
    });
  });

  it('el mensaje de cara al alumno respeta el lenguaje obligatorio', () => {
    expect(MARKETPLACE_CLOSED_MESSAGE).toMatch(/profesores independientes verificados en YaEntre/);
    expect(MARKETPLACE_CLOSED_MESSAGE).toMatch(/disponible pronto/i);
    // Guardrails de copy (contexto maestro §8).
    expect(MARKETPLACE_CLOSED_MESSAGE).not.toMatch(/próximamente|garant[ií]a|nuestros profesores|equipo docente/i);
  });
});
