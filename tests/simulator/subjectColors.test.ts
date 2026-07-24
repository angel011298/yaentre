import { describe, expect, it } from 'vitest';
import { subjectColorFor } from '@/lib/simulator/subjectColors';

describe('subjectColorFor', () => {
  it('es determinista: el mismo subjectId siempre da el mismo color', () => {
    expect(subjectColorFor('subj_matematicas')).toBe(subjectColorFor('subj_matematicas'));
  });

  it('usa un token CSS de la paleta --chart-N', () => {
    expect(subjectColorFor('subj_fisica')).toMatch(/^var\(--chart-[1-6]\)$/);
  });

  it('materias distintas tienden a colores distintos', () => {
    const ids = ['mat', 'fis', 'qui', 'esp', 'bio', 'ing'];
    const colors = new Set(ids.map(subjectColorFor));
    // No garantiza 0 colisiones (hash % 6), pero con 6 ids y 6 colores debería
    // haber variedad real, no todos el mismo.
    expect(colors.size).toBeGreaterThan(1);
  });
});
