import { describe, expect, it } from 'vitest';
import { SEASON_PASS_FALLBACK_DAYS, computeExpiresAt } from '@/lib/stripe/expiry';
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
   * Alcanzable de verdad: en cuanto pasa la fecha del examen del ciclo (UNAM
   * 2027-05-15 / IPN 2027-06-10 en el seed real) toda compra posterior caía
   * aquí, igual que un aspirante rechazado recomprando para el siguiente ciclo.
   */
  const activacion = new Date('2027-06-01T12:00:00Z');

  it('con la fecha del examen YA PASADA, cae al respaldo en vez de vencer al instante', () => {
    const examenPasado = new Date('2027-05-15T00:00:00Z');
    const expiresAt = computeExpiresAt('SEASON_PASS', examenPasado, activacion);

    expect(expiresAt).not.toBeNull();
    expect(expiresAt!.getTime()).toBeGreaterThan(activacion.getTime());
    const dias = Math.round((expiresAt!.getTime() - activacion.getTime()) / (24 * 3600 * 1000));
    expect(dias).toBe(SEASON_PASS_FALLBACK_DAYS);
  });

  it('lo mismo aplica a PREMIUM (el plan más caro no puede ser el más frágil)', () => {
    const expiresAt = computeExpiresAt('PREMIUM', new Date('2026-01-01T00:00:00Z'), activacion);
    expect(expiresAt!.getTime()).toBeGreaterThan(activacion.getTime());
  });

  it('con la fecha del examen aún por venir, se respeta esa fecha exacta', () => {
    const examenFuturo = new Date('2027-11-20T00:00:00Z');
    expect(computeExpiresAt('SEASON_PASS', examenFuturo, activacion)).toEqual(examenFuturo);
  });

  it('MONTHLY sigue sin vigencia calculada (la maneja Stripe)', () => {
    expect(computeExpiresAt('MONTHLY', new Date('2020-01-01'), activacion)).toBeNull();
  });

  it('INVARIANTE: pase/premium SIEMPRE reciben una vigencia futura', () => {
    const fechas = [
      null,
      new Date('2020-01-01T00:00:00Z'),
      new Date('2027-06-01T11:59:59Z'), // un segundo antes de activar
      new Date('2027-06-01T12:00:00Z'), // exactamente el instante de activar
      new Date('2030-01-01T00:00:00Z'),
    ];
    for (const plan of ['SEASON_PASS', 'PREMIUM'] as const) {
      for (const examDate of fechas) {
        const expiresAt = computeExpiresAt(plan, examDate, activacion);
        expect(expiresAt, `${plan} con examDate ${examDate}`).not.toBeNull();
        expect(
          expiresAt!.getTime(),
          `${plan} con examDate ${examDate} venció al nacer`
        ).toBeGreaterThan(activacion.getTime());
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
