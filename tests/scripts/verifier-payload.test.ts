import { describe, it, expect } from 'vitest';
import {
  buildVerifierPayload,
  renderVerifierSystem,
  renderVerifierUser,
  isCalcSubject,
  runCalculation,
  VERIFIER_MODEL,
  AUDIT_MODEL,
  type VerifiableQuestion,
} from '../../scripts/lib/verifier';
import { GENERATION_MODEL } from '../../scripts/lib/anthropic-client';

/**
 * CRITERIO DE ACEPTACIÓN F2: el verificador adversarial NUNCA recibe la
 * respuesta correcta ni las explicaciones. Este test construye el payload
 * exacto que viaja al modelo (buildVerifierPayload + renderVerifier*) desde un
 * draft que SÍ los contiene, y confirma su ausencia total.
 */

// Draft rico: contiene isCorrect, explicaciones y textos-señuelo detectables.
const SECRET_EXPLANATION = 'EXPLICACION_SECRETA_QUE_REVELA_LA_RESPUESTA';
const draft: VerifiableQuestion & {
  explanations: unknown[];
  difficulty: string;
} = {
  stem: '¿Cuánto es $7 \\times 8$?',
  options: [
    { id: 'A', text: '54', isCorrect: false },
    { id: 'B', text: '56', isCorrect: true },
    { id: 'C', text: '58', isCorrect: false, imageUrl: 'https://example.com/c.png' },
    { id: 'D', text: '64', isCorrect: false },
  ],
  format: 'PROBLEM_SOLVING',
  explanations: [
    { layer: 1, title: 'Por qué B', content: SECRET_EXPLANATION },
    { layer: 2, title: 'Repaso', content: 'La multiplicación es suma repetida' },
    { layer: 3, title: 'Video', content: 'Tablas del 7 y 8' },
  ],
  difficulty: 'BASIC',
};

const ctx = { subject: 'Matemáticas', topic: 'Aritmética', institution: 'UNAM' };

describe('verifier: el payload jamás contiene la respuesta ni explicaciones', () => {
  const payload = buildVerifierPayload(draft, ctx);
  const serialized = JSON.stringify(payload);
  const system = renderVerifierSystem(payload);
  const user = renderVerifierUser(payload);
  const everything = serialized + system + user;

  it('el payload serializado no contiene isCorrect en ninguna forma', () => {
    expect(serialized).not.toContain('isCorrect');
    expect(serialized.toLowerCase()).not.toContain('iscorrect');
    expect(serialized).not.toContain('correcta');
  });

  it('el payload no contiene explicaciones (ni el campo ni su contenido)', () => {
    expect(serialized).not.toContain('explanations');
    expect(serialized).not.toContain('explanation');
    expect(everything).not.toContain(SECRET_EXPLANATION);
    expect(everything).not.toContain('suma repetida');
  });

  it('el system y el user prompt exactos no marcan ninguna opción como correcta', () => {
    // El prompt puede mencionar la palabra "correcta" al describir la TAREA
    // ("elige la opción correcta"), pero nunca junto a una opción concreta.
    for (const marker of ['B) 56 ✓', 'correcta: B', '"B" es', 'respuesta: B', 'isCorrect']) {
      expect(system + user).not.toContain(marker);
    }
    expect(user).toContain('A) 54');
    expect(user).toContain('B) 56');
    // Las cuatro opciones se presentan idénticas en estructura:
    const optionLines = user.split('\n').filter((l) => /^[A-D]\)/.test(l));
    expect(optionLines).toHaveLength(4);
  });

  it('estructuralmente: VerifierPayload solo tiene los campos de sustentante', () => {
    expect(Object.keys(payload).sort()).toEqual(
      ['format', 'institution', 'options', 'passage', 'stem', 'subject', 'topic'].sort(),
    );
    for (const option of payload.options) {
      expect(Object.keys(option).sort()).toEqual(['id', 'imageUrl', 'text'].sort());
    }
  });

  it('sí conserva lo que el sustentante DEBE ver (stem, opciones, imagen)', () => {
    expect(payload.stem).toContain('7 \\times 8');
    expect(payload.options[2].imageUrl).toBe('https://example.com/c.png');
    expect(payload.format).toBe('PROBLEM_SOLVING');
  });
});

describe('verifier: modelos y cálculo', () => {
  it('generador, verificador y auditor son tres modelos DISTINTOS', () => {
    expect(VERIFIER_MODEL).not.toBe(GENERATION_MODEL);
    expect(AUDIT_MODEL).not.toBe(GENERATION_MODEL);
    expect(AUDIT_MODEL).not.toBe(VERIFIER_MODEL);
  });

  it('detecta materias de cálculo (con y sin acentos)', () => {
    expect(isCalcSubject('Matemáticas')).toBe(true);
    expect(isCalcSubject('Matematicas Aplicadas')).toBe(true);
    expect(isCalcSubject('Física')).toBe(true);
    expect(isCalcSubject('Química')).toBe(true);
    expect(isCalcSubject('Historia de México')).toBe(false);
    expect(isCalcSubject('Español')).toBe(false);
  });

  it('el system prompt exige ejecutar código en materias de cálculo', () => {
    const calcSystem = renderVerifierSystem(buildVerifierPayload(draft, ctx));
    expect(calcSystem).toContain('ejecutar_calculo');
    const histSystem = renderVerifierSystem(
      buildVerifierPayload(draft, { ...ctx, subject: 'Historia de México' }),
    );
    expect(histSystem).not.toContain('REGLA OBLIGATORIA DE CÁLCULO');
  });

  it('runCalculation ejecuta aritmética real en el sandbox', () => {
    expect(runCalculation('7 * 8')).toBe('56');
    expect(runCalculation('const x = Math.sqrt(144); return x + 1')).toBe('13');
    expect(runCalculation('lanza un error de sintaxis')).toContain('ERROR');
  });

  it('el sandbox no expone require ni process', () => {
    expect(runCalculation('typeof require')).toBe('"undefined"');
    expect(runCalculation('typeof process')).toBe('"undefined"');
    expect(runCalculation('typeof fetch')).toBe('"undefined"');
  });
});
