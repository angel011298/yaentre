import { describe, it, expect } from 'vitest';
import {
  resolveVerdict,
  sampleForAudit,
  MIN_CONFIDENCE,
  AUDIT_RATE,
} from '../../scripts/lib/resolution';

/**
 * F2: la resolución automática exige LAS TRES condiciones a la vez:
 * coincidencia + confianza ≥ 0.85 + cero problemas. Cualquier falla → sin
 * publicar. Es el sustituto permanente de la revisión humana: estos tests son
 * el contrato de esa política.
 */

const cleanVerdict = {
  chosenOption: 'B' as const,
  confidence: 0.95,
  problems: [] as { type: 'OTHER'; detail: string }[],
};

describe('resolveVerdict', () => {
  it('aprueba SOLO con coincidencia + confianza alta + cero problemas', () => {
    const r = resolveVerdict({ generatorOption: 'B', verdict: cleanVerdict });
    expect(r.decision).toBe('AUTO_APPROVED');
    expect(r.reasons).toHaveLength(0);
  });

  it('rechaza por discrepancia de opción (aunque todo lo demás esté bien)', () => {
    const r = resolveVerdict({
      generatorOption: 'A',
      verdict: cleanVerdict, // eligió B
    });
    expect(r.decision).toBe('UNPUBLISHED');
    expect(r.reasons[0]).toContain('DISCREPANCIA');
  });

  it('rechaza por confianza baja (aunque coincida y sin problemas)', () => {
    const r = resolveVerdict({
      generatorOption: 'B',
      verdict: { ...cleanVerdict, confidence: 0.7 },
    });
    expect(r.decision).toBe('UNPUBLISHED');
    expect(r.reasons[0]).toContain('CONFIANZA BAJA');
  });

  it('rechaza por cualquier problema detectado (aunque coincida con confianza alta)', () => {
    const r = resolveVerdict({
      generatorOption: 'B',
      verdict: {
        ...cleanVerdict,
        problems: [{ type: 'WEAK_DISTRACTORS', detail: 'distractores triviales' }],
      },
    });
    expect(r.decision).toBe('UNPUBLISHED');
    expect(r.reasons[0]).toContain('WEAK_DISTRACTORS');
  });

  it('acumula TODAS las razones cuando fallan varias condiciones', () => {
    const r = resolveVerdict({
      generatorOption: 'A',
      verdict: {
        chosenOption: 'C',
        confidence: 0.4,
        problems: [{ type: 'AMBIGUOUS_STEM', detail: 'ambiguo' }],
      },
    });
    expect(r.decision).toBe('UNPUBLISHED');
    expect(r.reasons).toHaveLength(3);
  });

  it('frontera: confianza exactamente 0.85 aprueba; 0.8499 no', () => {
    expect(MIN_CONFIDENCE).toBe(0.85);
    const at = resolveVerdict({
      generatorOption: 'B',
      verdict: { ...cleanVerdict, confidence: 0.85 },
    });
    expect(at.decision).toBe('AUTO_APPROVED');
    const below = resolveVerdict({
      generatorOption: 'B',
      verdict: { ...cleanVerdict, confidence: 0.8499 },
    });
    expect(below.decision).toBe('UNPUBLISHED');
  });
});

describe('sampleForAudit (muestreo de control del 5%)', () => {
  const ids = Array.from({ length: 100 }, (_, i) => `q${i}`);

  it('toma ceil(n × 5%) elementos', () => {
    expect(AUDIT_RATE).toBe(0.05);
    expect(sampleForAudit(ids).length).toBe(5); // 100 × 0.05 = 5
    expect(sampleForAudit(ids.slice(0, 10)).length).toBe(1); // ceil(0.5) = 1
    expect(sampleForAudit(ids.slice(0, 1)).length).toBe(1); // siempre ≥1 si hay aprobados
    expect(sampleForAudit([]).length).toBe(0);
  });

  it('es determinista con rng inyectado y aleatorio en la selección', () => {
    let seed = 42;
    const rng = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    const a = sampleForAudit(ids, 0.05, rng);
    expect(a).toHaveLength(5);
    // Todos los elementos vienen del conjunto original, sin duplicados
    expect(new Set(a).size).toBe(5);
    for (const item of a) expect(ids).toContain(item);
  });

  it('no muta el array original', () => {
    const copy = [...ids];
    sampleForAudit(ids, 0.5);
    expect(ids).toEqual(copy);
  });

  it('la tercera pasada puede degradar: un veredicto de auditoría adverso falla la resolución', () => {
    // Simula el flujo del orquestador: auditoría con Opus discrepa → degradar.
    const auditVerdict = { chosenOption: 'D' as const, confidence: 0.9, problems: [] };
    const r = resolveVerdict({ generatorOption: 'B', verdict: auditVerdict });
    expect(r.decision).toBe('UNPUBLISHED'); // → isVerified=false, degradado
  });
});
