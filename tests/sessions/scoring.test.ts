import { describe, it, expect } from 'vitest';
import {
  appendSuspicionEvent,
  buildSubmitResponse,
  computeElapsedSecs,
  computeScore,
  getCorrectOptionId,
  isAnswerCorrect,
  isSessionStale,
  isTimeExceeded,
  parseQuestionOptions,
  resolveFinishStatus,
  revealsCorrectnessOnSubmit,
  TIME_GRACE_SECS,
  type QuestionOption,
} from '@/lib/sessions/scoring';

const OPTIONS: QuestionOption[] = [
  { id: 'A', text: '+2', isCorrect: false },
  { id: 'B', text: '+4', isCorrect: false },
  { id: 'C', text: '+6', isCorrect: true },
  { id: 'D', text: '-2', isCorrect: false },
];

describe('parseQuestionOptions', () => {
  it('acepta opciones bien formadas', () => {
    expect(parseQuestionOptions(OPTIONS)).toHaveLength(4);
  });

  it('lanza si el JSON está malformado', () => {
    expect(() => parseQuestionOptions([{ id: 'A' }])).toThrow();
    expect(() => parseQuestionOptions(null)).toThrow();
    expect(() => parseQuestionOptions([{ id: 'A', text: 'x', isCorrect: true }])).toThrow(); // <2 opciones
  });
});

describe('getCorrectOptionId', () => {
  it('devuelve el id de la única opción correcta', () => {
    expect(getCorrectOptionId(OPTIONS)).toBe('C');
  });

  it('lanza si no hay exactamente una correcta', () => {
    expect(() => getCorrectOptionId(OPTIONS.map(o => ({ ...o, isCorrect: false })))).toThrow();
    expect(() => getCorrectOptionId(OPTIONS.map(o => ({ ...o, isCorrect: true })))).toThrow();
  });
});

describe('isAnswerCorrect (scoring server-side)', () => {
  it('marca correcta la opción correcta', () => {
    expect(isAnswerCorrect(OPTIONS, 'C')).toBe(true);
  });

  it('marca incorrecta una opción equivocada', () => {
    expect(isAnswerCorrect(OPTIONS, 'A')).toBe(false);
  });

  it('trata la respuesta omitida (null) como incorrecta', () => {
    expect(isAnswerCorrect(OPTIONS, null)).toBe(false);
  });
});

describe('computeScore', () => {
  it('cuenta las respuestas correctas', () => {
    expect(
      computeScore([
        { isCorrect: true },
        { isCorrect: false },
        { isCorrect: true },
        { isCorrect: true },
      ])
    ).toBe(3);
  });

  it('devuelve 0 sin respuestas', () => {
    expect(computeScore([])).toBe(0);
  });
});

describe('computeElapsedSecs', () => {
  it('calcula segundos transcurridos', () => {
    const start = new Date('2027-05-15T10:00:00Z');
    const now = new Date('2027-05-15T10:30:00Z');
    expect(computeElapsedSecs(start, now)).toBe(1800);
  });

  it('nunca es negativo si el reloj retrocede', () => {
    const start = new Date('2027-05-15T10:00:10Z');
    const now = new Date('2027-05-15T10:00:00Z');
    expect(computeElapsedSecs(start, now)).toBe(0);
  });
});

describe('isTimeExceeded (validación de tiempo)', () => {
  const LIMIT = 10800; // 180 min

  it('no excede dentro del límite', () => {
    expect(isTimeExceeded(LIMIT - 1, LIMIT)).toBe(false);
  });

  it('no excede exactamente en el límite + gracia (frontera)', () => {
    expect(isTimeExceeded(LIMIT + TIME_GRACE_SECS, LIMIT)).toBe(false);
  });

  it('excede un segundo por encima del límite + gracia', () => {
    expect(isTimeExceeded(LIMIT + TIME_GRACE_SECS + 1, LIMIT)).toBe(true);
  });
});

describe('isSessionStale (abandono >24h)', () => {
  const start = new Date('2027-05-15T10:00:00Z');

  it('no está vencida a las 23h', () => {
    const now = new Date(start.getTime() + 23 * 3600 * 1000);
    expect(isSessionStale(start, now)).toBe(false);
  });

  it('está vencida pasadas las 24h', () => {
    const now = new Date(start.getTime() + 24 * 3600 * 1000 + 1000);
    expect(isSessionStale(start, now)).toBe(true);
  });
});

describe('resolveFinishStatus (máquina de estados)', () => {
  const LIMIT = 10800;

  it('USER dentro del tiempo → COMPLETED sin marca', () => {
    const r = resolveFinishStatus('USER', LIMIT - 100, LIMIT);
    expect(r.status).toBe('COMPLETED');
    expect(r.timeExceeded).toBe(false);
  });

  it('USER con tiempo excedido → COMPLETED_BY_TIMEOUT + timeExceeded', () => {
    const r = resolveFinishStatus('USER', LIMIT + TIME_GRACE_SECS + 5, LIMIT);
    expect(r.status).toBe('COMPLETED_BY_TIMEOUT');
    expect(r.timeExceeded).toBe(true);
  });

  it('TIMEOUT dentro del tiempo → COMPLETED_BY_TIMEOUT sin marca de manipulación', () => {
    const r = resolveFinishStatus('TIMEOUT', LIMIT - 100, LIMIT);
    expect(r.status).toBe('COMPLETED_BY_TIMEOUT');
    expect(r.timeExceeded).toBe(false);
  });
});

describe('appendSuspicionEvent', () => {
  const event = { type: 'TIME_EXCEEDED', at: '2027-05-15T13:00:31Z' };

  it('crea el arreglo desde null', () => {
    expect(appendSuspicionEvent(null, event)).toEqual([event]);
  });

  it('agrega a un arreglo existente', () => {
    const prev = [{ type: 'TAB_BLUR', at: '2027-05-15T12:00:00Z' }];
    expect(appendSuspicionEvent(prev, event)).toEqual([...prev, event]);
  });

  it('tolera un valor no-arreglo', () => {
    expect(appendSuspicionEvent({ garbage: true }, event)).toEqual([event]);
  });
});

describe('revealsCorrectnessOnSubmit (política de revelado)', () => {
  it('modos de evaluación NO revelan', () => {
    expect(revealsCorrectnessOnSubmit('FULL_SIMULATION')).toBe(false);
    expect(revealsCorrectnessOnSubmit('DIAGNOSTIC')).toBe(false);
  });

  it('modos de práctica SÍ revelan', () => {
    expect(revealsCorrectnessOnSubmit('TOPIC_DRILL')).toBe(true);
    expect(revealsCorrectnessOnSubmit('AREA_PRACTICE')).toBe(true);
  });
});

describe('buildSubmitResponse (no-leak en simulación)', () => {
  it('FULL_SIMULATION no filtra isCorrect ni correctOption', () => {
    const res = buildSubmitResponse('FULL_SIMULATION', true, 'C');
    expect(res).toEqual({ recorded: true });
    expect(res).not.toHaveProperty('isCorrect');
    expect(res).not.toHaveProperty('correctOption');
  });

  it('DIAGNOSTIC tampoco filtra la respuesta', () => {
    const res = buildSubmitResponse('DIAGNOSTIC', false, 'C');
    expect(res).toEqual({ recorded: true });
    expect(res).not.toHaveProperty('correctOption');
  });

  it('TOPIC_DRILL revela correctitud y opción correcta al responder', () => {
    const res = buildSubmitResponse('TOPIC_DRILL', false, 'C');
    expect(res).toEqual({ recorded: true, isCorrect: false, correctOption: 'C' });
  });
});
