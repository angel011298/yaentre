import { describe, expect, it } from 'vitest';
import {
  TEACHER_AGREEMENTS,
  isPlaceholderText,
  teacherLegalTextsFinal,
  type TeacherAgreement,
} from '@/lib/legal/teacher-texts';

const agreement = (body: string): TeacherAgreement => ({
  key: 'contract',
  title: 't',
  summary: 's',
  body,
  version: 'v',
});

describe('textos legales de profesores', () => {
  it('mientras haya un PLACEHOLDER las solicitudes no se abren', () => {
    expect(teacherLegalTextsFinal([agreement('Texto definitivo.'), agreement('PLACEHOLDER (lo entrega CLO)')])).toBe(false);
  });

  it('con los tres textos definitivos se abren solas', () => {
    expect(teacherLegalTextsFinal([agreement('Uno.'), agreement('Dos.'), agreement('Tres.')])).toBe(true);
  });

  it('hoy están SIN entregar: los tres textos vigentes siguen siendo placeholder', () => {
    // Si este test se pone rojo es porque CLO entregó los textos: actualízalo y revisa RETORNO_BLOQUE2.md.
    expect(TEACHER_AGREEMENTS.every((a) => isPlaceholderText(a.body))).toBe(true);
    expect(teacherLegalTextsFinal()).toBe(false);
  });

  it('un texto que solo MENCIONA la palabra no cuenta como placeholder', () => {
    expect(isPlaceholderText('El contrato no es un PLACEHOLDER')).toBe(false);
  });
});
