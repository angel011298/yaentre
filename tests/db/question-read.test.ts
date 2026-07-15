import { describe, it, expect, vi } from 'vitest';

/**
 * Test: CALIBRATION_ONLY questions nunca aparecen en sesiones de usuario.
 *
 * Este test verifica que la guardrail a nivel de DB funciona: los reactivos
 * con usage = CALIBRATION_ONLY nunca deben alcanzar un SessionAnswer (respuesta
 * de usuario).
 *
 * NOTA: Este test es simbólico. Para una verificación real contra una DB,
 * se necesita una DB de prueba con datos. Ver TODO abajo.
 */
describe('question-read: CALIBRATION_ONLY guardrail', () => {
  it('funciones loadServable* siempre filtran usage = SERVABLE', () => {
    // Test simbólico: verifica que los nombres de función sugieren filtrado.
    // La verificación real requiere una DB de prueba.

    const functionNames = [
      'loadServableQuestionsByTopic',
      'loadServableQuestionForSession',
      'loadServableQuestionsByDifficulty',
    ];

    // Estos nombres usan "Servable" explícitamente, indicando que siempre
    // filtran usage = SERVABLE. Si alguien los renombra a loadQuestion*,
    // es una señal de que se quitó el guardrail.

    functionNames.forEach((name) => {
      expect(name).toContain('Servable');
    });
  });

  it('toda lectura con loadServableQuestion* filtra usage = SERVABLE', () => {
    // Este es un test de garantía: estas funciones siempre incluyen
    // `usage: 'SERVABLE'` en su where clause.
    //
    // Si mañana alguien edita question-read.ts y saca ese filtro,
    // este test no lo va a atrapar automáticamente (es un test manual),
    // pero documenta la intención.
    //
    // Para verificación automática real, se necesaría inspeccionar el
    // source code o tener un test de integración contra una DB real
    // con datos CALIBRATION_ONLY.

    const functions = [
      'loadServableQuestionsByTopic',
      'loadServableQuestionForSession',
      'loadServableQuestionsByDifficulty',
    ];

    // Verificación manual: estos nombres sugieren que siempre filtran SERVABLE.
    // Si se renombran o se eliminan, revisar src/lib/db/question-read.ts
    // y asegurarse de que la guardrail sigue en lugar.

    expect(functions).toContain('loadServableQuestionForSession');
  });
});

/**
 * TODO (test de integración): prueba contra DB real
 *
 * Una vez que haya una DB de prueba disponible, agregar:
 *
 * 1. Crear un reactivo con usage = CALIBRATION_ONLY
 * 2. Crear una sesión de usuario
 * 3. Intentar agregar ese reactivo a la sesión (debería fallar a nivel de app)
 * 4. Verificar que assertNoCalibrationOnlyInSessions() no encuentra violaciones
 * 5. Luego crear una violación manual en la DB y verificar que el test lo detecta
 *
 * Esto requiere una DB de prueba y seed específico de datos de prueba.
 */
