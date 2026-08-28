import { describe, it, expect } from 'vitest';
import {
  parseVerificationRecord,
  classifyReviewQueue,
  withManualReview,
  withCorrectOption,
  parseAdminOptions,
  type VerificationRecord,
} from '@/lib/admin/verification';

/**
 * Lógica pura del panel de revisión (F3). Estos tests cubren bugs con costo
 * real: mal clasificar una cola confunde al admin; mal reescribir opciones
 * puede terminar sirviendo la respuesta incorrecta a un usuario pagando.
 */

const baseVerdict = {
  chosenOption: 'B' as const,
  confidence: 0.6,
  reasoning: 'Razonamiento del verificador.',
  problems: [] as { type: 'OTHER'; detail: string }[],
  model: 'claude-fable-5',
  usedCalculation: false,
  usage: { inputTokens: 10, outputTokens: 5 },
  verifiedAt: '2026-07-19T00:00:00.000Z',
};

function record(overrides: Partial<VerificationRecord> = {}): VerificationRecord {
  return {
    pipeline: 'adversarial-v1',
    generatorModel: 'claude-sonnet-4-6',
    generatorOption: 'A',
    verdict: baseVerdict,
    decision: 'UNPUBLISHED',
    reasons: [],
    audit: null,
    manualReview: null,
    ...overrides,
  };
}

describe('parseVerificationRecord', () => {
  it('parsea un registro válido', () => {
    const r = record({ reasons: ['DISCREPANCIA: el verificador eligió B, el generador marcó A'] });
    expect(parseVerificationRecord(r)).not.toBeNull();
  });

  it('null para ausente/legado/corrupto — no rompe el panel', () => {
    expect(parseVerificationRecord(null)).toBeNull();
    expect(parseVerificationRecord(undefined)).toBeNull();
    expect(parseVerificationRecord({})).toBeNull();
    expect(parseVerificationRecord({ decision: 'ALGO_RARO' })).toBeNull();
    expect(parseVerificationRecord('texto suelto')).toBeNull();
  });
});

describe('classifyReviewQueue', () => {
  it('AUTO_APPROVED nunca entra a ninguna cola', () => {
    expect(classifyReviewQueue(record({ decision: 'AUTO_APPROVED' }))).toBeNull();
  });

  it('discrepancia: reasons con DISCREPANCIA y sin auditoría', () => {
    const r = record({
      reasons: ['DISCREPANCIA: el verificador eligió B, el generador marcó A'],
    });
    expect(classifyReviewQueue(r)).toBe('discrepancy');
  });

  it('baja confianza / problemas: coincide en opción pero falla por confianza o problemas', () => {
    const byConfidence = record({ reasons: ['CONFIANZA BAJA: 0.60 < 0.85'] });
    expect(classifyReviewQueue(byConfidence)).toBe('low_confidence');

    const byProblems = record({ reasons: ['PROBLEMAS DETECTADOS: WEAK_DISTRACTORS'] });
    expect(classifyReviewQueue(byProblems)).toBe('low_confidence');
  });

  it('muestreo degradado: audit.degraded=true manda, sin importar reasons', () => {
    // Escenario REAL de content-audit-resolve.ts: solo se auditan reactivos ya
    // AUTO_APPROVED, así que el veredicto de 2ª pasada conserva
    // decision='AUTO_APPROVED' y reasons=[]; el rechazo de la 3ª pasada vive
    // solo en `audit.degraded`.
    const r = record({
      decision: 'AUTO_APPROVED',
      reasons: [], // auto-aprobado inicialmente: sin razones de rechazo propias
      audit: {
        verdict: baseVerdict,
        decision: 'UNPUBLISHED',
        reasons: ['DISCREPANCIA: el verificador eligió C, el generador marcó A'],
        degraded: true,
      },
    });
    expect(classifyReviewQueue(r)).toBe('degraded_audit');
  });

  it('regresión (G24): un degradado con decision=AUTO_APPROVED NO desaparece del panel', () => {
    // Antes de G24 el guard `decision !== 'UNPUBLISHED'` corría primero y
    // devolvía null para este registro — el reactivo quedaba isVerified=false
    // (bien despublicado) pero fuera de toda cola (invisible para el admin).
    const degraded = record({
      decision: 'AUTO_APPROVED',
      reasons: [],
      audit: { verdict: baseVerdict, decision: 'UNPUBLISHED', reasons: [], degraded: true },
    });
    expect(classifyReviewQueue(degraded)).toBe('degraded_audit');
  });

  it('las 3 colas son mutuamente excluyentes por construcción del pipeline', () => {
    // Un degradado real (auditado) nunca tiene reasons de discrepancia propia,
    // porque solo los AUTO_APPROVED (reasons=[]) se auditan.
    const degraded = record({
      decision: 'AUTO_APPROVED',
      reasons: [],
      audit: { verdict: baseVerdict, decision: 'UNPUBLISHED', reasons: [], degraded: true },
    });
    expect(classifyReviewQueue(degraded)).toBe('degraded_audit');
    expect(classifyReviewQueue(degraded)).not.toBe('discrepancy');
  });

  it('un audit NO degradado (3ª pasada confirmó) no entra a ninguna cola', () => {
    const confirmed = record({
      decision: 'AUTO_APPROVED',
      reasons: [],
      audit: { verdict: baseVerdict, decision: 'AUTO_APPROVED', reasons: [], degraded: false },
    });
    expect(classifyReviewQueue(confirmed)).toBeNull();
  });

  it('un reactivo ya resuelto a mano (manualReview) sale de toda cola', () => {
    const r = record({
      reasons: ['DISCREPANCIA: el verificador eligió B, el generador marcó A'],
      manualReview: { action: 'approved_with_option', optionId: 'B', at: '2026-07-19T01:00:00.000Z' },
    });
    expect(classifyReviewQueue(r)).toBeNull();
  });

  it('reactivo con decision UNPUBLISHED pero sin reasons reconocibles y sin audit: null (defensivo)', () => {
    expect(classifyReviewQueue(record({ reasons: ['OTRO MOTIVO NO ESTÁNDAR'] }))).toBeNull();
  });
});

describe('withManualReview', () => {
  it('agrega manualReview preservando decision/reasons/audit originales', () => {
    const original = record({
      reasons: ['DISCREPANCIA: el verificador eligió B, el generador marcó A'],
    });
    const updated = withManualReview(original, { action: 'approved_with_option', optionId: 'B' });
    expect(updated).not.toBeUndefined();
    expect(updated!.decision).toBe('UNPUBLISHED'); // veredicto original intacto, para auditoría
    expect(updated!.reasons).toEqual(original.reasons);
    expect(updated!.manualReview?.action).toBe('approved_with_option');
    expect(updated!.manualReview?.optionId).toBe('B');
    expect(updated!.manualReview?.at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('undefined si no había veredicto del pipeline (nada que anotar)', () => {
    expect(withManualReview(null, { action: 'edited' })).toBeUndefined();
    expect(withManualReview({ foo: 'bar' }, { action: 'edited' })).toBeUndefined();
  });

  it('tras anotar, classifyReviewQueue ya no lo clasifica en ninguna cola', () => {
    const original = record({ reasons: ['CONFIANZA BAJA: 0.5 < 0.85'] });
    const updated = withManualReview(original, { action: 'edited' })!;
    expect(classifyReviewQueue(updated)).toBeNull();
  });
});

describe('parseAdminOptions / withCorrectOption', () => {
  const raw = [
    { id: 'A', text: 'Opción A', isCorrect: true },
    { id: 'B', text: 'Opción B', isCorrect: false, imageUrl: 'https://cdn.yaentre.com/b.png' },
    { id: 'C', text: 'Opción C', isCorrect: false },
    { id: 'D', text: 'Opción D', isCorrect: false },
  ];

  it('parsea opciones tolerando imageUrl ausente o presente', () => {
    const options = parseAdminOptions(raw);
    expect(options).toHaveLength(4);
    expect(options[1].imageUrl).toBe('https://cdn.yaentre.com/b.png');
    expect(options[0].imageUrl).toBeUndefined();
  });

  it('withCorrectOption mueve isCorrect a la opción elegida y apaga las demás', () => {
    const options = parseAdminOptions(raw);
    const resolved = withCorrectOption(options, 'C');
    expect(resolved.find((o) => o.id === 'C')?.isCorrect).toBe(true);
    expect(resolved.filter((o) => o.isCorrect)).toHaveLength(1);
    // La imagen de B se preserva aunque ya no sea la correcta — no se pierde data
    expect(resolved.find((o) => o.id === 'B')?.imageUrl).toBe('https://cdn.yaentre.com/b.png');
  });

  it('withCorrectOption con un id inexistente deja CERO opciones correctas (guardrail: el caller valida existencia antes)', () => {
    const options = parseAdminOptions(raw);
    const resolved = withCorrectOption(options, 'Z');
    expect(resolved.every((o) => !o.isCorrect)).toBe(true);
  });
});
