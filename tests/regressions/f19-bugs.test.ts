import { describe, expect, it } from 'vitest';
import { computeExpiresAt } from '@/lib/stripe/expiry';
import { getCorrectOptionId, isAnswerCorrect, parseQuestionOptions } from '@/lib/sessions/scoring';

/**
 * Regresiones de los bugs REALES encontrados y corregidos en la auditoría de
 * F19. Cada bloque documenta el fallo original para que no pueda reaparecer.
 */

// ─────────────────────────── BUG 1: pagar y quedarse sin acceso ───────────────────────────

describe('BUG F19-1 — una compra nunca puede nacer ya vencida', () => {
  /**
   * Antes: `computeExpiresAt` devolvía la fecha del examen TAL CUAL, incluso si
   * ya había pasado. Como `getActiveSubscription` filtra por `expiresAt > now`,
   * la suscripción quedaba vencida en el instante de crearse: el alumno pagaba
   * y no obtenía absolutamente nada, sin ningún error visible.
   *
   * G103: la vigencia dejó de depender de la fecha del examen (12 meses desde
   * la activación, decisión de Ángel del 23-oct-2026). El bug de F19 queda
   * imposible por construcción, pero la regresión se conserva —y se endurece—
   * porque la invariante es la misma: un pago SIEMPRE otorga vigencia futura.
   */
  const activacion = new Date('2027-06-01T12:00:00Z');
  const DOCE_MESES = new Date('2028-06-01T12:00:00Z');

  it('la vigencia de un pase es de 12 meses desde la activación, nunca una fecha pasada', () => {
    const expiresAt = computeExpiresAt('SEASON_PASS', activacion);
    expect(expiresAt).not.toBeNull();
    expect(expiresAt!.getTime()).toBeGreaterThan(activacion.getTime());
    expect(expiresAt).toEqual(DOCE_MESES);
  });

  it('lo mismo aplica a PREMIUM (el plan más caro no puede ser el más frágil)', () => {
    expect(computeExpiresAt('PREMIUM', activacion)).toEqual(DOCE_MESES);
  });

  it('MONTHLY sigue sin vigencia calculada (la maneja Stripe)', () => {
    expect(computeExpiresAt('MONTHLY', activacion)).toBeNull();
  });

  it('INVARIANTE: pase/premium SIEMPRE reciben una vigencia futura de ≥ 365 días', () => {
    const activaciones = [
      new Date('2026-10-23T05:59:59Z'),
      new Date('2027-02-28T18:00:00Z'),
      new Date('2027-06-01T12:00:00Z'),
      new Date('2028-02-29T06:00:00Z'), // 29 de febrero (bisiesto) en hora de México
      new Date('2030-12-31T23:59:59Z'),
    ];
    for (const plan of ['SEASON_PASS', 'PREMIUM'] as const) {
      for (const now of activaciones) {
        const expiresAt = computeExpiresAt(plan, now);
        expect(expiresAt, `${plan} activado ${now.toISOString()}`).not.toBeNull();
        const dias = (expiresAt!.getTime() - now.getTime()) / (24 * 3600 * 1000);
        expect(dias, `${plan} activado ${now.toISOString()} venció antes de un año`).toBeGreaterThanOrEqual(365);
        expect(dias).toBeLessThanOrEqual(366);
      }
    }
  });
});

// ─────────────────── BUG 2: un reactivo corrupto tumbaba el simulacro entero ───────────────────

describe('BUG F19-2 — un reactivo no puntuable no puede costarle el examen al alumno', () => {
  /**
   * Antes: `recordSimulatorSync` puntuaba cada respuesta del lote sin aislar
   * fallos. `parseQuestionOptions`/`getCorrectOptionId` LANZAN ante un reactivo
   * corrupto (opciones malformadas, o 0/≥2 marcadas como correctas), así que un
   * único reactivo dañado hacía que el beacon devolviera 500 y se perdieran las
   * otras 119 respuestas del simulacro. Ahora el fallo se aísla al reactivo.
   *
   * Estos casos fijan POR QUÉ hace falta el aislamiento: confirman que las
   * funciones de puntuación efectivamente lanzan ante datos corruptos.
   */
  it('un reactivo sin ninguna opción correcta lanza en vez de puntuar a ciegas', () => {
    const options = [
      { id: 'A', text: 'uno', isCorrect: false },
      { id: 'B', text: 'dos', isCorrect: false },
    ];
    expect(() => getCorrectOptionId(options)).toThrow(/exactamente 1 opción correcta/);
    expect(() => isAnswerCorrect(options, 'A')).toThrow();
  });

  it('un reactivo con DOS opciones correctas también lanza', () => {
    const options = [
      { id: 'A', text: 'uno', isCorrect: true },
      { id: 'B', text: 'dos', isCorrect: true },
    ];
    expect(() => getCorrectOptionId(options)).toThrow(/exactamente 1 opción correcta/);
  });

  it('unas opciones malformadas lanzan al parsearse, no puntúan sobre basura', () => {
    expect(() => parseQuestionOptions(null)).toThrow();
    expect(() => parseQuestionOptions([{ id: 'A' }])).toThrow();
    // Menos de 2 opciones tampoco es un reactivo válido.
    expect(() => parseQuestionOptions([{ id: 'A', text: 'x', isCorrect: true }])).toThrow();
  });

  it('una respuesta OMITIDA nunca llega a puntuarse (corta antes de lanzar)', () => {
    // Es lo que permite que una omisión sobre un reactivo corrupto sea inofensiva.
    const corrupto = [
      { id: 'A', text: 'uno', isCorrect: true },
      { id: 'B', text: 'dos', isCorrect: true },
    ];
    expect(isAnswerCorrect(corrupto, null)).toBe(false);
  });

  it('un reactivo sano sigue puntuando con normalidad', () => {
    const sano = [
      { id: 'A', text: 'uno', isCorrect: false },
      { id: 'B', text: 'dos', isCorrect: true },
    ];
    expect(isAnswerCorrect(sano, 'B')).toBe(true);
    expect(isAnswerCorrect(sano, 'A')).toBe(false);
  });
});
