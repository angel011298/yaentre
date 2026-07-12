import { describe, it, expect } from 'vitest';
import { splitLatexSegments } from '@/lib/admin/latex-segments';

describe('splitLatexSegments', () => {
  it('devuelve un único segmento de texto si no hay LaTeX', () => {
    expect(splitLatexSegments('Sin fórmulas aquí.')).toEqual([
      { type: 'text', value: 'Sin fórmulas aquí.' },
    ]);
  });

  it('extrae una fórmula inline en medio del texto', () => {
    expect(splitLatexSegments('El valor de $x^2$ es positivo.')).toEqual([
      { type: 'text', value: 'El valor de ' },
      { type: 'math', value: 'x^2' },
      { type: 'text', value: ' es positivo.' },
    ]);
  });

  it('extrae múltiples fórmulas', () => {
    expect(splitLatexSegments('$a$ y $b$')).toEqual([
      { type: 'math', value: 'a' },
      { type: 'text', value: ' y ' },
      { type: 'math', value: 'b' },
    ]);
  });

  it('maneja una fórmula al inicio sin texto previo', () => {
    expect(splitLatexSegments('$x=1$ es la solución')).toEqual([
      { type: 'math', value: 'x=1' },
      { type: 'text', value: ' es la solución' },
    ]);
  });

  it('maneja una fórmula al final sin texto posterior', () => {
    expect(splitLatexSegments('La solución es $x=1$')).toEqual([
      { type: 'text', value: 'La solución es ' },
      { type: 'math', value: 'x=1' },
    ]);
  });

  it('devuelve un arreglo vacío para texto vacío', () => {
    expect(splitLatexSegments('')).toEqual([]);
  });

  it('trata todo el texto como una sola fórmula si son solo $...$', () => {
    expect(splitLatexSegments('$\\frac{1}{2}$')).toEqual([
      { type: 'math', value: '\\frac{1}{2}' },
    ]);
  });
});
