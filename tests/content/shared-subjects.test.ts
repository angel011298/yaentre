import { describe, expect, it } from 'vitest';
import {
  resolveSharedSubjectGroups,
  expandToSharedSubjectIds,
  canonicalSubjectKey,
  aggregateSharedSubjectPerformance,
  type SubjectSharing,
  type SubjectAnswer,
  type AreaSubject,
} from '@/lib/content/shared-subjects';
import { predictScore } from '@/lib/adaptive/predictor';

/**
 * G26 — reutilización de contenido entre áreas. El escenario de referencia
 * imita la taxonomía real: UNAM tiene "Español" como 4 filas Subject (una por
 * área) con la misma `sharedContentKey`, y "Matemáticas"/"Física" propias de
 * un área (sin clave).
 */
const UNAM_EXAM: SubjectSharing[] = [
  { subjectId: 'esp_a1', sharedContentKey: 'UNAM:ESPANOL' },
  { subjectId: 'esp_a2', sharedContentKey: 'UNAM:ESPANOL' },
  { subjectId: 'esp_a3', sharedContentKey: 'UNAM:ESPANOL' },
  { subjectId: 'esp_a4', sharedContentKey: 'UNAM:ESPANOL' },
  { subjectId: 'qui_a1', sharedContentKey: 'UNAM:QUIMICA' },
  { subjectId: 'qui_a2', sharedContentKey: 'UNAM:QUIMICA' },
  { subjectId: 'mat_a1', sharedContentKey: null },
  { subjectId: 'fis_a1', sharedContentKey: null },
  { subjectId: 'bio_a2', sharedContentKey: null },
];

describe('resolveSharedSubjectGroups', () => {
  it('agrupa todas las materias que comparten clave, incluyéndose a sí mismas', () => {
    const groups = resolveSharedSubjectGroups(UNAM_EXAM);
    expect(groups.get('esp_a1')).toEqual(new Set(['esp_a1', 'esp_a2', 'esp_a3', 'esp_a4']));
    expect(groups.get('esp_a3')).toEqual(new Set(['esp_a1', 'esp_a2', 'esp_a3', 'esp_a4']));
    expect(groups.get('qui_a2')).toEqual(new Set(['qui_a1', 'qui_a2']));
  });

  it('una materia sin clave mapea solo a sí misma', () => {
    const groups = resolveSharedSubjectGroups(UNAM_EXAM);
    expect(groups.get('mat_a1')).toEqual(new Set(['mat_a1']));
    expect(groups.get('bio_a2')).toEqual(new Set(['bio_a2']));
  });

  it('no mezcla grupos con claves distintas', () => {
    const groups = resolveSharedSubjectGroups(UNAM_EXAM);
    expect(groups.get('esp_a1')!.has('qui_a1')).toBe(false);
  });

  it('es determinista respecto al orden de entrada', () => {
    const shuffled = [...UNAM_EXAM].reverse();
    const a = resolveSharedSubjectGroups(UNAM_EXAM);
    const b = resolveSharedSubjectGroups(shuffled);
    for (const s of UNAM_EXAM) {
      expect([...b.get(s.subjectId)!].sort()).toEqual([...a.get(s.subjectId)!].sort());
    }
  });

  it('una clave con una sola materia no expande nada', () => {
    const groups = resolveSharedSubjectGroups([
      { subjectId: 'solo', sharedContentKey: 'X:SOLO' },
      { subjectId: 'otra', sharedContentKey: null },
    ]);
    expect(groups.get('solo')).toEqual(new Set(['solo']));
  });
});

describe('expandToSharedSubjectIds', () => {
  const groups = resolveSharedSubjectGroups(UNAM_EXAM);

  it('expande las materias de un área a todo su grupo de contenido', () => {
    // Área 3: Español (compartida) + materias propias.
    const pool = expandToSharedSubjectIds(['esp_a3', 'hist_a3'], groups);
    expect(pool).toEqual(new Set(['esp_a1', 'esp_a2', 'esp_a3', 'esp_a4', 'hist_a3']));
  });

  it('Área 1 completa: Español y Química se expanden, Mat/Fís no', () => {
    const pool = expandToSharedSubjectIds(['mat_a1', 'fis_a1', 'qui_a1', 'esp_a1'], groups);
    expect(pool).toEqual(
      new Set(['mat_a1', 'fis_a1', 'qui_a1', 'qui_a2', 'esp_a1', 'esp_a2', 'esp_a3', 'esp_a4']),
    );
  });

  it('materia sin grupo conocido cae a sí misma', () => {
    const pool = expandToSharedSubjectIds(['desconocida'], groups);
    expect(pool).toEqual(new Set(['desconocida']));
  });
});

describe('canonicalSubjectKey', () => {
  const keyById = new Map<string, string | null>([
    ['esp_a1', 'UNAM:ESPANOL'],
    ['mat_a1', null],
  ]);

  it('devuelve la clave compartida si la tiene', () => {
    expect(canonicalSubjectKey('esp_a1', keyById)).toBe('UNAM:ESPANOL');
  });

  it('devuelve el propio id si no comparte', () => {
    expect(canonicalSubjectKey('mat_a1', keyById)).toBe('mat_a1');
  });

  it('devuelve el propio id si la materia es desconocida', () => {
    expect(canonicalSubjectKey('foo', keyById)).toBe('foo');
  });
});

describe('aggregateSharedSubjectPerformance', () => {
  // Alumno de Área 3: su Español pesa 3; su Historia pesa 7.
  const areaSubjectsA3: AreaSubject[] = [
    { subjectId: 'esp_a3', weight: 3, sharedContentKey: 'UNAM:ESPANOL' },
    { subjectId: 'hist_a3', weight: 7, sharedContentKey: null },
  ];
  const keyBySubjectId = new Map<string, string | null>([
    ['esp_a1', 'UNAM:ESPANOL'],
    ['esp_a3', 'UNAM:ESPANOL'],
    ['hist_a3', null],
    ['mat_a1', null],
  ]);

  it('una respuesta a Español de OTRA área cuenta para el Español del alumno', () => {
    const answers: SubjectAnswer[] = [
      { subjectId: 'esp_a1', isCorrect: true },
      { subjectId: 'esp_a1', isCorrect: true },
      { subjectId: 'esp_a3', isCorrect: false },
    ];
    const perf = aggregateSharedSubjectPerformance(answers, areaSubjectsA3, keyBySubjectId);
    const esp = perf.find((p) => p.subjectId === 'esp_a3')!;
    expect(esp).toMatchObject({ subjectId: 'esp_a3', weight: 3, correct: 2, attempts: 3 });
  });

  it('devuelve una fila por materia del área, incluso sin respuestas', () => {
    const perf = aggregateSharedSubjectPerformance([], areaSubjectsA3, keyBySubjectId);
    expect(perf).toEqual([
      { subjectId: 'esp_a3', weight: 3, correct: 0, attempts: 0 },
      { subjectId: 'hist_a3', weight: 7, correct: 0, attempts: 0 },
    ]);
  });

  it('ignora respuestas a materias ajenas al área del alumno', () => {
    const answers: SubjectAnswer[] = [
      { subjectId: 'mat_a1', isCorrect: true }, // Matemáticas no está en Área 3
      { subjectId: 'hist_a3', isCorrect: true },
    ];
    const perf = aggregateSharedSubjectPerformance(answers, areaSubjectsA3, keyBySubjectId);
    expect(perf.find((p) => p.subjectId === 'hist_a3')).toMatchObject({ correct: 1, attempts: 1 });
    // Matemáticas no aparece — no es materia del área.
    expect(perf.some((p) => p.subjectId === 'mat_a1')).toBe(false);
    expect(perf).toHaveLength(2);
  });

  it('el resultado alimenta predictScore sin adaptación', () => {
    const answers: SubjectAnswer[] = Array.from({ length: 10 }, () => ({
      subjectId: 'esp_a1',
      isCorrect: true,
    }));
    const perf = aggregateSharedSubjectPerformance(answers, areaSubjectsA3, keyBySubjectId);
    const prediction = predictScore({ subjects: perf, totalQuestions: 120 });
    // Español (peso 3) al 100%, Historia (peso 7) sin datos → default 0.30.
    // weightedHitRate = (1.0*3 + 0.3*7) / 10 = 0.51 ; *120 = 61.2 ; floor 61.
    expect(prediction.predictedScore).toBe(61);
    expect(prediction.subjectsWithData).toBe(1);
    expect(prediction.totalSubjects).toBe(2);
  });
});
