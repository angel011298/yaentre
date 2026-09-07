import { describe, it, expect } from 'vitest';
import { aggregateSubjectBreakdown } from '@/lib/simulator/subject-breakdown';
import { subjectColorFor } from '@/lib/simulator/subjectColors';

/**
 * G71 — regresión del desglose por materia del resultado del simulacro.
 *
 * El caso de la izquierda es real: en el recorrido de verificación de G71, un
 * simulacro de UNAM Área 1 trajo 23 reactivos de Química servidos desde DOS
 * filas `Subject` distintas del pool compartido `UNAM:QUIMICA` (11 de la fila
 * de Área 1, 12 de la de Área 2, por la reutilización de contenido de G26).
 * Agrupar por `Subject.id` los pintaba como dos renglones «Química» de 1/12 y
 * 2/11 — la misma materia, partida en dos, sin explicación para el alumno.
 */
const A1_QUIMICA = { id: 'cmrr1j8xn001uhi3n0zapxx25', name: 'Química', sharedContentKey: 'UNAM:QUIMICA' };
const A2_QUIMICA = { id: 'cmrr1jq55003shi3nanr7cmtm', name: 'Química', sharedContentKey: 'UNAM:QUIMICA' };
const FISICA = { id: 'cmrr1j24f0014hi3n3o6yv282', name: 'Física', sharedContentKey: null };

const answers = (subject: { id: string; name: string; sharedContentKey: string | null }, total: number, correct: number) =>
  Array.from({ length: total }, (_, i) => ({ isCorrect: i < correct, subject }));

describe('aggregateSubjectBreakdown', () => {
  it('colapsa en UN renglón las materias que comparten pool de contenido', () => {
    const rows = aggregateSubjectBreakdown([
      ...answers(A1_QUIMICA, 11, 2),
      ...answers(A2_QUIMICA, 12, 1),
      ...answers(FISICA, 30, 6),
    ]);

    expect(rows.map((r) => r.subjectName)).toEqual(['Física', 'Química']);
    const quimica = rows.find((r) => r.subjectName === 'Química')!;
    expect(quimica.total).toBe(23);
    expect(quimica.correct).toBe(3);
    expect(quimica.subjectKey).toBe('UNAM:QUIMICA');
  });

  it('no mezcla materias distintas que no comparten pool', () => {
    const rows = aggregateSubjectBreakdown([
      ...answers(FISICA, 30, 6),
      ...answers({ id: 'mat', name: 'Matemáticas', sharedContentKey: null }, 48, 15),
    ]);
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.total)).toEqual([30, 48]);
    expect(rows.find((r) => r.subjectName === 'Física')!.subjectKey).toBe(FISICA.id);
  });

  it('el color es estable aunque cambie la mezcla de filas Subject entre simulacros', () => {
    const soloA1 = aggregateSubjectBreakdown(answers(A1_QUIMICA, 5, 1));
    const soloA2 = aggregateSubjectBreakdown(answers(A2_QUIMICA, 7, 3));
    expect(soloA1[0].colorHex).toBe(soloA2[0].colorHex);
    expect(soloA1[0].colorHex).toBe(subjectColorFor('UNAM:QUIMICA'));
  });

  it('es determinista: el orden de entrada no altera el resultado', () => {
    const entrada = [...answers(A2_QUIMICA, 3, 1), ...answers(FISICA, 2, 2), ...answers(A1_QUIMICA, 4, 0)];
    const directo = aggregateSubjectBreakdown(entrada);
    const invertido = aggregateSubjectBreakdown([...entrada].reverse());
    expect(invertido).toEqual(directo);
  });

  it('sin respuestas devuelve una lista vacía', () => {
    expect(aggregateSubjectBreakdown([])).toEqual([]);
  });
});
