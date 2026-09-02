import { describe, expect, it } from 'vitest';
import {
  buildSubmitResponse,
  revealsCorrectnessOnSubmit,
} from '@/lib/sessions/scoring';

/**
 * G65 — Regresión del guardrail #1 de CLAUDE.md ("no enviar `isCorrect` ni la
 * respuesta correcta al cliente antes de que responda").
 *
 * La fuga real que se corrigió NO estaba en esta política —que siempre fue
 * correcta— sino en que el REACTIVO podía cambiar de sesión: `submitAnswer`
 * aceptaba cualquier `questionId` y la política se decide por el MODO de la
 * sesión. Un alumno abría una práctica libre (revela) y le pasaba los
 * `questionId` de su simulacro en curso (no revela). Comprobado en vivo antes
 * del arreglo: devolvía `{recorded:true, isCorrect:true, correctOption:'A'}`.
 *
 * El arreglo vive en `src/lib/db/sessions.ts` (exige que exista la fila
 * `SessionAnswer` de ese par sesión+reactivo, que solo crea el arranque de la
 * sesión) y se verifica de punta a punta en `pnpm security:authz`. Aquí se fija
 * la mitad pura: qué modos revelan y qué viaja en cada caso.
 */
describe('política de revelado por modo (G65)', () => {
  it('los modos de EVALUACIÓN nunca revelan', () => {
    expect(revealsCorrectnessOnSubmit('FULL_SIMULATION')).toBe(false);
    expect(revealsCorrectnessOnSubmit('DIAGNOSTIC')).toBe(false);
  });

  it('los modos de PRÁCTICA sí revelan (es su propósito didáctico)', () => {
    expect(revealsCorrectnessOnSubmit('TOPIC_DRILL')).toBe(true);
    expect(revealsCorrectnessOnSubmit('AREA_PRACTICE')).toBe(true);
  });

  it('en simulacro la respuesta NO lleva isCorrect ni correctOption, ni por accidente', () => {
    const res = buildSubmitResponse('FULL_SIMULATION', true, 'B');
    expect(res).toEqual({ recorded: true });
    expect(JSON.stringify(res)).not.toContain('isCorrect');
    expect(JSON.stringify(res)).not.toContain('B');
  });

  it('en diagnóstico tampoco', () => {
    const res = buildSubmitResponse('DIAGNOSTIC', false, 'C');
    expect(res).toEqual({ recorded: true });
    expect(JSON.stringify(res)).not.toContain('correctOption');
  });

  it('en práctica sí, con la opción correcta', () => {
    expect(buildSubmitResponse('TOPIC_DRILL', true, 'D')).toEqual({
      recorded: true,
      isCorrect: true,
      correctOption: 'D',
    });
  });
});
