import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Guardrail permanente (F15 tarea 6): Tino NUNCA aparece dentro de la sesión
 * activa del simulador — sí puede aparecer antes (SimulatorPreflight) y
 * después (SimulatorResult), pero jamás en `SimulatorRunner`, que es la
 * pantalla deliberadamente seria (UIUX §13) mientras el examen corre. Se
 * verifica leyendo el CÓDIGO FUENTE real (no un snapshot ni un mock) para que
 * cualquier reintroducción futura del import rompa este test de inmediato.
 */
describe('SimulatorRunner nunca importa ni renderiza a Tino', () => {
  it('el archivo fuente no contiene la palabra "Tino"', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/components/simulator/SimulatorRunner.tsx'),
      'utf-8'
    );
    // La única mención permitida es la de un comentario explicando la regla,
    // no un import ni un uso JSX real — se filtran las líneas de comentario
    // antes de buscar, así que ni siquiera esa mención cuenta como "presencia".
    const codeOnly = source
      .split('\n')
      .filter((line) => !line.trim().startsWith('*') && !line.trim().startsWith('//'))
      .join('\n');
    expect(codeOnly).not.toContain('Tino');
  });
});
