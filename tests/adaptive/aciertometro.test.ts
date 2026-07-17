import { describe, it, expect } from 'vitest';
import { formatAciertometroTarget } from '@/lib/adaptive/aciertometro';

/**
 * Regla no negociable (CC-13): la meta del Aciertómetro nunca se presenta
 * como una cifra absoluta. Estos tests verifican que TODAS las ramas de
 * confianza califican el número (nunca lo devuelven pelón) y que sin dato
 * no se inventa una meta.
 */
describe('formatAciertometroTarget', () => {
  it('sin minAciertos: no hay meta, no se inventa un número', () => {
    const result = formatAciertometroTarget({
      minAciertos: null,
      minAciertosYear: null,
      minAciertosConfidence: null,
    });
    expect(result.hasTarget).toBe(false);
    expect(result.label).toBe('');
  });

  it('confianza HIGH: califica como "estimada", incluye el año', () => {
    const result = formatAciertometroTarget({
      minAciertos: 96,
      minAciertosYear: 2025,
      minAciertosConfidence: 'HIGH',
    });
    expect(result.hasTarget).toBe(true);
    expect(result.label).toBe('~96 aciertos');
    expect(result.qualifier).toBe('Meta estimada');
    expect(result.disclaimer).toContain('2025');
    expect(result.disclaimer).toMatch(/oficial/i);
  });

  it('confianza MED: menciona que no hay dato oficial confirmado', () => {
    const result = formatAciertometroTarget({
      minAciertos: 109,
      minAciertosYear: 2024,
      minAciertosConfidence: 'MED',
    });
    expect(result.qualifier).toBe('Meta estimada');
    expect(result.disclaimer).toMatch(/no hay un dato oficial confirmado/i);
  });

  it('confianza LOW: se etiqueta "preliminar", no "estimada"', () => {
    const result = formatAciertometroTarget({
      minAciertos: 97,
      minAciertosYear: 2026,
      minAciertosConfidence: 'LOW',
    });
    expect(result.qualifier).toBe('Meta preliminar');
    expect(result.disclaimer).toMatch(/no coinciden entre sí/i);
  });

  it('confianza null con minAciertos presente: trata como preliminar, nunca HIGH por defecto', () => {
    const result = formatAciertometroTarget({
      minAciertos: 80,
      minAciertosYear: null,
      minAciertosConfidence: null,
    });
    expect(result.hasTarget).toBe(true);
    expect(result.qualifier).toBe('Meta preliminar');
  });

  it('el label SIEMPRE lleva el prefijo "~" — nunca una cifra pelona', () => {
    const confidences: Array<'HIGH' | 'MED' | 'LOW'> = ['HIGH', 'MED', 'LOW'];
    for (const confidence of confidences) {
      const result = formatAciertometroTarget({
        minAciertos: 100,
        minAciertosYear: 2025,
        minAciertosConfidence: confidence,
      });
      expect(result.label.startsWith('~')).toBe(true);
      expect(result.qualifier.length).toBeGreaterThan(0);
    }
  });
});
