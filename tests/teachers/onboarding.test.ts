import { describe, expect, it } from 'vitest';
import { clabeCheckDigit, curpCheckDigit } from '@/lib/teachers/identity';
import {
  CSF_PATH_RE,
  RFC_QUESTION,
  buildTeacherApplicationSchema,
  determinePaymentRail,
} from '@/lib/teachers/onboarding';

const NOW = new Date('2026-10-10T12:00:00Z');
const schema = buildTeacherApplicationSchema(NOW);

const curp = (() => {
  const f = 'HEGG050615MVZRRLA';
  return f + curpCheckDigit(f);
})();
const clabe = (() => {
  const f = '00201007777777777';
  return f + clabeCheckDigit(f);
})();
const CSF = '11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.pdf';

const valid = {
  fullName: 'Juan Pérez García',
  publicName: 'Juan P.',
  phone: '55 1234 5678',
  curp,
  clabe,
  bankName: 'BBVA',
  canInvoice: false,
  subjects: ['matematicas', 'fisica'],
  availability: [{ weekday: 1, startMinute: 540, endMinute: 720 }],
  acceptContract: true,
  acceptNda: true,
  acceptRecordingPolicy: true,
};

const issues = (input: unknown) => {
  const r = schema.safeParse(input);
  return r.success ? [] : r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
};

describe('determinePaymentRail (spec §3.2, tal cual)', () => {
  it('Carril A SOLO con las tres condiciones', () => {
    expect(determinePaymentRail(true, 'HEGG560427AB1', 'ruta/csf.pdf')).toBe('COMISION_MERCANTIL');
  });

  it.each([
    ['no puede facturar', false, 'HEGG560427AB1', 'csf.pdf'],
    ['sin RFC', true, undefined, 'csf.pdf'],
    ['sin CSF', true, 'HEGG560427AB1', undefined],
    ['RFC vacío', true, '', 'csf.pdf'],
    ['CSF nula', true, 'HEGG560427AB1', null],
    ['no respondió y sin datos', false, undefined, undefined],
  ])('Carril B (default) cuando %s', (_n, can, rfc, csf) => {
    expect(determinePaymentRail(can, rfc, csf)).toBe('ASIMILADOS');
  });
});

describe('la pregunta de RFC (spec §3.2) no ofende', () => {
  it('pregunta si PUEDE FACTURAR, no si «tiene RFC»', () => {
    expect(RFC_QUESTION.question).toBe('¿Puedes emitir facturas por tus servicios?');
    expect(RFC_QUESTION.question).not.toMatch(/tienes rfc/i);
  });

  it('las dos respuestas conservan la redacción de la spec', () => {
    expect(RFC_QUESTION.yes.label).toBe('Sí, tengo RFC y puedo facturar');
    expect(RFC_QUESTION.yes.hint).toBe('¡Genial! Es la opción más ágil para ambos.');
    expect(RFC_QUESTION.no.label).toBe('No por el momento');
    expect(RFC_QUESTION.no.hint).toMatch(/sat\.gob\.mx/);
  });
});

describe('solicitud válida → Carril B por default', () => {
  it('normaliza y decide el carril en el servidor', () => {
    const r = schema.parse(valid);
    expect(r).toMatchObject({
      fullName: 'Juan Pérez García',
      phone: '5512345678',
      curp,
      clabe,
      canInvoice: false,
      rfc: null,
      csfDocumentPath: null,
      paymentRail: 'ASIMILADOS',
      subjects: ['matematicas', 'fisica'],
    });
  });

  it('quien contesta «No» NO conserva RFC ni CSF aunque el formulario los mande', () => {
    const r = schema.parse({ ...valid, canInvoice: false, rfc: 'HEGG560427AB1', csfDocumentPath: CSF });
    expect(r.rfc).toBeNull();
    expect(r.csfDocumentPath).toBeNull();
    expect(r.paymentRail).toBe('ASIMILADOS');
  });
});

describe('Carril A', () => {
  it('«Sí» con RFC válido y CSF ⇒ COMISION_MERCANTIL', () => {
    const r = schema.parse({ ...valid, canInvoice: true, rfc: 'hegg560427ab1', csfDocumentPath: CSF });
    expect(r.paymentRail).toBe('COMISION_MERCANTIL');
    expect(r.rfc).toBe('HEGG560427AB1');
  });

  it('«Sí» sin RFC o sin CSF NO cae en silencio a Carril B: pide completar o contestar «No»', () => {
    expect(issues({ ...valid, canInvoice: true, csfDocumentPath: CSF }).join('|')).toMatch(/rfc/i);
    expect(issues({ ...valid, canInvoice: true, rfc: 'HEGG560427AB1' }).join('|')).toMatch(
      /csfDocumentPath/
    );
  });

  it('un RFC genérico o inválido se rechaza', () => {
    expect(
      issues({ ...valid, canInvoice: true, rfc: 'XAXX010101000', csfDocumentPath: CSF }).join('|')
    ).toMatch(/genérico/);
    expect(
      issues({ ...valid, canInvoice: true, rfc: 'corto', csfDocumentPath: CSF }).join('|')
    ).toMatch(/rfc/i);
  });

  it('la ruta de la CSF debe tener la forma <uuid>/<uuid>.pdf (nada de rutas arbitrarias)', () => {
    expect(CSF_PATH_RE.test(CSF)).toBe(true);
    for (const bad of ['../../etc/passwd', 'x/y.pdf', `${CSF}.html`, 'http://evil.com/a.pdf', '/' + CSF]) {
      expect(CSF_PATH_RE.test(bad)).toBe(false);
    }
    expect(
      issues({
        ...valid,
        canInvoice: true,
        rfc: 'HEGG560427AB1',
        csfDocumentPath: '../../secreto.pdf',
      }).join('|')
    ).toMatch(/csfDocumentPath/);
  });
});

describe('KYC: CURP y CLABE obligatorias', () => {
  it('sin CURP o con una inválida se rechaza', () => {
    expect(issues({ ...valid, curp: '' }).join('|')).toMatch(/curp/);
    expect(issues({ ...valid, curp: 'ABCD123456' }).join('|')).toMatch(/curp/);
  });

  it('un menor de edad no puede ser profesor (la edad sale de su CURP)', () => {
    const f = 'HEGG120427MVZRRLA';
    expect(issues({ ...valid, curp: f + curpCheckDigit(f) }).join('|')).toMatch(/mayor de edad/);
  });

  it('sin CLABE o con una de dígito verificador incorrecto se rechaza', () => {
    expect(issues({ ...valid, clabe: '' }).join('|')).toMatch(/clabe/);
    expect(issues({ ...valid, clabe: '002010077777777772' }).join('|')).toMatch(/último dígito/);
  });
});

describe('otros campos', () => {
  it('nombre completo exige nombre y apellido', () => {
    expect(issues({ ...valid, fullName: 'Juan' }).join('|')).toMatch(/fullName/);
  });

  it('el nombre público y la presentación no admiten datos de contacto', () => {
    expect(issues({ ...valid, publicName: 'Juan 5512345678' }).join('|')).toMatch(/publicName/);
    expect(issues({ ...valid, bio: 'Escríbeme a juan@correo.com' }).join('|')).toMatch(/bio/);
    expect(issues({ ...valid, bio: 'Ingeniero con 8 años de experiencia.' })).toEqual([]);
  });

  it('exige al menos una materia válida y sin repetir', () => {
    expect(issues({ ...valid, subjects: [] }).join('|')).toMatch(/subjects/);
    expect(issues({ ...valid, subjects: ['astrologia'] }).join('|')).toMatch(/subjects/);
    expect(issues({ ...valid, subjects: ['fisica', 'fisica'] }).join('|')).toMatch(/subjects/);
  });

  it('exige al menos un bloque de disponibilidad, y lo normaliza', () => {
    expect(issues({ ...valid, availability: [] }).join('|')).toMatch(/availability/);
    const r = schema.parse({
      ...valid,
      availability: [
        { weekday: 1, startMinute: 540, endMinute: 600 },
        { weekday: 1, startMinute: 600, endMinute: 660 },
      ],
    });
    expect(r.availability).toEqual([{ weekday: 1, startMinute: 540, endMinute: 660 }]);
  });

  it('las tres aceptaciones digitales son obligatorias, cada una por separado', () => {
    for (const key of ['acceptContract', 'acceptNda', 'acceptRecordingPolicy'] as const) {
      expect(issues({ ...valid, [key]: false }).join('|')).toContain(key);
    }
  });

  it('un teléfono que no es mexicano se rechaza', () => {
    expect(issues({ ...valid, phone: '123' }).join('|')).toMatch(/phone/);
  });

  it('el esquema NO acepta un identificador de persona: el dueño sale del guard', () => {
    const r = schema.parse({ ...valid, userProfileId: 'cku0000000000000000000abc', userId: 'x' } as never);
    expect(Object.keys(r)).not.toContain('userProfileId');
    expect(Object.keys(r)).not.toContain('userId');
  });
});
